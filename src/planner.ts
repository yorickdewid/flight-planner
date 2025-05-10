import { AerodromeService, Aircraft, WeatherService } from './index.js';
import { Aerodrome, ReportingPoint, Waypoint } from './airport.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector, isICAO, normalizeTrack } from './utils.js';
import { Wind } from './metar.js';
import { point } from '@turf/turf';

/**
 * Represents a course vector with distance and track.
 *
 * @interface CourseVector
 * @property {number} distance - The distance of the course vector in nautical miles.
 * @property {number} track - The track heading in degrees.
 * @property {number | undefined} altitude - The altitude in feet, if available.
 */
export interface CourseVector {
  distance: number;
  track: number;
  altitude?: number;
}

/**
 * Interface representing the performance characteristics of an aircraft.
 * 
 * @interface AircraftPerformance
 * @property {number} headWind - The component of wind directly opposing the aircraft's motion, measured in knots.
 * @property {number} crossWind - The component of wind perpendicular to the aircraft's motion, measured in knots.
 * @property {number} trueAirSpeed - The speed of the aircraft relative to the air mass it's flying through, measured in knots.
 * @property {number} windCorrectionAngle - The angle between the aircraft's heading and its track, measured in degrees.
 * @property {number} heading - The direction the aircraft is pointed, measured in degrees from true north.
 * @property {number} groundSpeed - The actual speed of the aircraft over the ground, measured in knots.
 * @property {number} duration - The time duration for a segment of flight, typically measured in minutes.
 * @property {number} [fuelConsumption] - Optional property representing the fuel consumption rate, typically measured in gallons or liters per hour.
 */
export interface AircraftPerformance {
  headWind: number;
  crossWind: number;
  trueAirSpeed: number;
  windCorrectionAngle: number;
  heading: number;
  groundSpeed: number;
  duration: number;
  fuelConsumption?: number;
}

/**
 * Represents a segment of a flight route between two waypoints.
 * 
 * @interface RouteLeg
 * @property {Waypoint} start - The starting waypoint of the leg
 * @property {Waypoint} end - The ending waypoint of the leg
 * @property {number} distance - The distance of the leg in nautical miles
 * @property {number} trueTrack - The true track heading in degrees
 * @property {number | undefined} windDirection - The wind direction in degrees, if available
 * @property {number | undefined} windSpeed - The wind speed in knots, if available
 * @property {Date | undefined} arrivalDate - The estimated arrival date and time at the end waypoint
 * @property {AircraftPerformance} [performance] - Optional performance calculations for this leg
 */
export interface RouteLeg {
  start: Waypoint;
  end: Waypoint;
  course: CourseVector;
  wind?: Wind;
  arrivalDate?: Date;
  performance?: AircraftPerformance;
}

/**
 * Represents a complete route trip with multiple legs.
 * Contains information about the route's path, distances, duration, and optionally fuel consumption and timing.
 * 
 * @interface RouteTrip
 * @property {RouteLeg[]} route - Array of route legs that make up the complete trip
 * @property {number} totalDistance - Total distance of the trip in nautical miles
 * @property {number} totalDuration - Total duration of the trip in minutes
 * @property {number} [totalFuelConsumption] - Optional total fuel consumption for the trip in gallons/liters
 * @property {number} [totalFuelRequired] - Optional total fuel required for the trip in gallons/liters
 * @property {Date} [departureDate] - Optional planned departure date and time
 * @property {Date} [arrivalDate] - Optional estimated arrival date and time
 */
export interface RouteTrip {
  route: RouteLeg[];
  totalDistance: number;
  totalDuration: number;
  totalFuelConsumption?: number;
  totalFuelRequired?: number;
  departureDate?: Date;
  arrivalDate?: Date;
}

/**
 * Options for configuring a flight route.
 * 
 * @interface RouteOptions
 * @property {number} [altitude] - The cruising altitude in feet.
 * @property {Date} [departureDate] - The scheduled departure date and time.
 * @property {Aircraft} [aircraft] - The aircraft to be used for the flight.
 * @property {Aerodrome} [alternate] - An alternate aerodrome for the flight plan.
 * @property {number} [reserveFuel] - The amount of reserve fuel to carry in gallons or liters.
 */
export interface RouteOptions {
  altitude?: number;
  departureDate?: Date;
  aircraft?: Aircraft;
  alternate?: Aerodrome;
  reserveFuel?: number;
  reserveFuelDuration?: number;
}

/**
 * FlightPlanner class to handle flight route planning operations
 */
class FlightPlanner {
  /**
   * Creates a new FlightPlanner instance
   * 
   * @param weatherService - Weather service for retrieving weather data along the flight route
   *                         Used to get wind information and other meteorological conditions
   * @param aerodromeService - Aerodrome service for fetching airport and airfield data
   *                           Used to look up airports by ICAO code and retrieve their information
   */
  constructor(
    private weatherService: WeatherService,
    private aerodromeService: AerodromeService
  ) { }

  /**
   * Helper method to calculate fuel consumption based on aircraft and duration
   * 
   * @param aircraft - The aircraft for which to calculate fuel consumption
   * @param duration - Flight duration in minutes
   * @returns The fuel consumption in gallons/liters or undefined if not available
   */
  private calculateFuelConsumption(aircraft: Aircraft, duration: number): number | undefined {
    return aircraft.fuelConsumption ? aircraft.fuelConsumption * (duration / 60) : undefined;
  }

  /**
   * Attaches relevant weather data to waypoints
   * 
   * @param waypoints - The waypoints to attach weather data to
   */
  private async attachWeatherData(waypoints: (Aerodrome | ReportingPoint | Waypoint)[]): Promise<void> {
    try {
      for (const waypoint of waypoints) {
        const station = await this.weatherService.nearest(waypoint.location.geometry.coordinates);
        if (station) {
          waypoint.metarStation = station;
        }
      }
    } catch (error) {
      console.error('Error attaching METAR data to waypoints:', error);
    }
  }

  /**
   * Creates a route from a string representation of waypoints.
   * 
   * @param routeString - A string representing the route, e.g., "EDDF;EDDM;WP(50.05,8.57)"
   * @param options - Optional configuration options for the flight route.
   * @returns A route trip object with legs, distances, durations, and fuel calculations.
   * @throws Error if no valid waypoints could be parsed or fewer than 2 waypoints are found
   */
  async createRouteFromString(
    routeString: string,
    options: RouteOptions = {}
  ): Promise<RouteTrip> {
    const waypoints = await this.parseRouteString(routeString);

    if (waypoints.length === 0) {
      throw new Error('No valid waypoints could be parsed from the route string');
    }

    return this.createRoute(waypoints, options);
  }

  /**
   * Creates a route between the given waypoints.
   * 
   * @param waypoints - An array of waypoints to use in the route.
   * @param options - Optional configuration options for the flight route.
   * @returns A route trip object with legs, distances, durations, and fuel calculations.
   * @throws Error if the waypoints array contains fewer than 2 points.
   */
  async createRoute(
    waypoints: (Aerodrome | ReportingPoint | Waypoint)[],
    options: RouteOptions = {}
  ): Promise<RouteTrip> {
    if (waypoints.length < 2) {
      throw new Error('At least departure and arrival waypoints are required');
    }

    const {
      altitude,
      departureDate = new Date(),
      aircraft,
      reserveFuelDuration = 30,
      reserveFuel,
    } = options;

    await this.attachWeatherData(waypoints);

    const legs = waypoints.slice(0, -1).map((startWaypoint, i) => {
      const endWaypoint = waypoints[i + 1];

      const distance = startWaypoint.distanceTo(endWaypoint);
      const track = normalizeTrack(startWaypoint.headingTo(endWaypoint));

      const course = {
        distance,
        track,
        altitude,
      } as CourseVector;

      // TODO: 
      // const temperature = startWaypoint.metarStation?.metar.temperature;
      const wind = startWaypoint.metarStation?.metar.wind;

      const performance = aircraft && wind ? this.calculatePerformance(aircraft, course, wind) : undefined;

      const arrivalDate = performance
        ? new Date(departureDate.getTime() + performance.duration * 60 * 1000)
        : undefined;

      return {
        start: startWaypoint,
        end: endWaypoint,
        course,
        wind,
        arrivalDate,
        performance,
      };
    });

    let totalDistance = 0;
    let totalDuration = 0;
    let totalFuelConsumption = 0;

    for (const leg of legs) {
      totalDistance += leg.course.distance;
      totalDuration += leg.performance?.duration || 0;
      totalFuelConsumption += leg.performance?.fuelConsumption || 0;
    }

    const reserveFuelRequired = reserveFuel ?? (aircraft ? this.calculateFuelConsumption(aircraft, reserveFuelDuration) : 0);
    const totalFuelRequired = totalFuelConsumption + (reserveFuelRequired || 0);

    const arrivalDate = new Date(departureDate.getTime() + totalDuration * 60 * 1000);

    return {
      route: legs,
      totalDistance,
      totalDuration,
      totalFuelConsumption,
      totalFuelRequired,
      departureDate,
      arrivalDate,
    };
  }

  /**
   * Calculates the performance of the aircraft based on wind and course vector.
   * 
   * @param aircraft - The aircraft for which to calculate performance
   * @param course - The course vector containing distance and track
   * @param wind - The wind conditions affecting the flight
   * @returns An object containing performance metrics or undefined if not applicable
   */
  private calculatePerformance(aircraft: Aircraft, course: CourseVector, wind: Wind): AircraftPerformance | undefined {
    if (aircraft.cruiseSpeed) {
      const windVector = calculateWindVector(wind, course.track);
      const wca = calculateWindCorrectionAngle(wind, course.track, aircraft.cruiseSpeed);
      const heading = normalizeTrack(course.track + wca); // TODO: Correct for magnetic variation
      const groundSpeed = calculateGroundspeed(wind, aircraft.cruiseSpeed, heading);
      const duration = (course.distance / groundSpeed) * 60;
      const fuelConsumption = this.calculateFuelConsumption(aircraft, duration);

      return {
        headWind: windVector.headwind,
        crossWind: windVector.crosswind,
        trueAirSpeed: aircraft.cruiseSpeed, // TODO: Correct for altitude, temperature
        windCorrectionAngle: wca,
        heading,
        groundSpeed,
        duration,
        fuelConsumption
      };
    }

    return undefined;
  }

  /**
   * Maps a route trip to an array of unique waypoints.
   * 
   * This function extracts all waypoints from a route trip by taking the start and end
   * waypoints of each leg and removing duplicates.
   * 
   * @param routeTrip - The route trip containing legs with start and end waypoints
   * @returns An array of unique waypoints representing all points in the route trip
   */
  static getRouteWaypoints(routeTrip: RouteTrip): (Aerodrome | ReportingPoint | Waypoint)[] {
    const allWaypoints = routeTrip.route.flatMap(leg => [leg.start, leg.end]);

    const uniqueWaypoints = new Map<string, Aerodrome | ReportingPoint | Waypoint>();
    for (const waypoint of allWaypoints) {
      uniqueWaypoints.set(waypoint.name, waypoint);
    }

    return Array.from(uniqueWaypoints.values());
  }

  /**
   * Tests if a given waypoint is an Aerodrome.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is an Aerodrome, false otherwise
   */
  static isAerodrome(waypoint: Aerodrome | ReportingPoint | Waypoint): waypoint is Aerodrome {
    return waypoint instanceof Aerodrome;
  }

  /**
   * Tests if a given waypoint is a ReportingPoint.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is a ReportingPoint, false otherwise
   */
  static isReportingPoint(waypoint: Aerodrome | ReportingPoint | Waypoint): waypoint is ReportingPoint {
    return waypoint instanceof ReportingPoint;
  }

  /**
   * Tests if a given waypoint is a basic Waypoint.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is a basic Waypoint, false otherwise
   */
  static isWaypoint(waypoint: Aerodrome | ReportingPoint | Waypoint): waypoint is Waypoint {
    return waypoint instanceof Waypoint
      && !(waypoint instanceof Aerodrome)
      && !(waypoint instanceof ReportingPoint);
  }

  /**
   * Parses a route string and returns an array of Aerodrome or Waypoint objects.
   * 
   * @param routeString - The route string to parse
   *                      Supported formats:
   *                      - ICAO codes (e.g., "EDDF")
   *                      - RP(name) for reporting points (e.g., "RP(ALPHA)")
   *                      - WP(lat,lng) for waypoints (e.g., "WP(50.05,8.57)")
   * @returns A promise that resolves to an array of Aerodrome, ReportingPoint, or Waypoint objects
   * @throws Error if the route string contains invalid waypoint formats
   */
  async parseRouteString(routeString: string): Promise<(Aerodrome | ReportingPoint | Waypoint)[]> {
    if (!routeString) return [];

    const waypoints: (Aerodrome | ReportingPoint | Waypoint)[] = [];
    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);

    const waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;
    // const reportingPointRegex = /^RP\(([A-Z0-9_]+)\)$/;

    const parseErrors: string[] = [];

    for (const part of routeParts) {
      try {
        // Check for ICAO code
        if (isICAO(part)) {
          const airport = await this.aerodromeService.get(part);
          if (airport?.length) {
            waypoints.push(...airport);
            continue;
          } else {
            throw new Error(`Could not find aerodrome with ICAO code: ${part}`);
          }
        }

        // const rpMatch = part.match(reportingPointRegex);
        // if (rpMatch) {
        //   const name = rpMatch[1];
        //   const rp = new ReportingPoint(name, point([0, 0])); // Coordinates would need to be looked up
        //   waypoints.push(rp);
        //   continue;
        // }

        const waypointMatch = part.match(waypointRegex);
        if (waypointMatch) {
          const lat = parseFloat(waypointMatch[1]);
          const lng = parseFloat(waypointMatch[2]);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error(`Invalid coordinates in waypoint: ${part}`);
          }
          waypoints.push(new Waypoint(`WP-${lat.toFixed(2)},${lng.toFixed(2)}`, point([lng, lat])));
          continue;
        }

        throw new Error(`Unrecognized waypoint format: ${part}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        parseErrors.push(`Error parsing route part "${part}": ${errorMessage}`);
        console.error(parseErrors[parseErrors.length - 1]);
      }
    }

    if (waypoints.length === 0 && parseErrors.length > 0) {
      throw new Error(`Failed to parse route string: ${parseErrors.join('; ')}`);
    }

    return waypoints;
  }
}

export default FlightPlanner;