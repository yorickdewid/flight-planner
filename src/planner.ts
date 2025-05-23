import { AerodromeService, WeatherService } from './index.js';
import { Aerodrome, VisualReportingPoint, Waypoint } from './waypoint.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector, isICAO, normalizeTrack } from './utils.js';
import { MetarStation, Wind } from './metar.js';
import { point } from '@turf/turf';
import { Aircraft } from './aircraft.js';

/**
 * Represents a course vector with distance and track.
 *
 * @interface CourseVector
 * @property {number} distance - The distance of the course vector in nautical miles.
 * @property {number} track - The true track heading in degrees.
 * @property {number} magneticTrack - The magnetic track heading in degrees, if available.
 * @property {number | undefined} altitude - The altitude in feet, if available.
 */
export interface CourseVector {
  distance: number;
  track: number;
  magneticTrack: number;
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
 * @property {number} heading - The magnetic direction the aircraft is pointed, measured in degrees from magnetic north.
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
 * @property {RouteSegment} start - The starting waypoint of the leg
 * @property {RouteSegment} end - The ending waypoint of the leg
 * @property {number} distance - The distance of the leg in nautical miles
 * @property {number} trueTrack - The true track heading in degrees
 * @property {number | undefined} windDirection - The wind direction in degrees, if available
 * @property {number | undefined} windSpeed - The wind speed in knots, if available
 * @property {Date | undefined} arrivalDate - The estimated arrival date and time at the end waypoint
 * @property {AircraftPerformance} [performance] - Optional performance calculations for this leg
 */
export interface RouteLeg {
  start: RouteSegment;
  end: RouteSegment;
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
 * @property {string} [remarks] - Optional remarks or notes about the trip
 */
export interface RouteTrip {
  route: RouteLeg[];
  totalDistance: number;
  totalDuration: number;
  totalFuelConsumption?: number;
  totalFuelRequired?: number;
  departureDate?: Date;
  arrivalDate?: Date;
  remarks?: string;
}

/**
 * Options for configuring a flight route.
 * 
 * @interface RouteOptions
 * @property {number} [defaultAltitude] - The default altitude for the route in feet.
 * @property {Date} [departureDate] - The scheduled departure date and time.
 * @property {Aircraft} [aircraft] - The aircraft to be used for the flight.
 * @property {Aerodrome} [alternate] - An alternate aerodrome for the flight plan.
 * @property {number} [reserveFuel] - The amount of reserve fuel to carry in liters.
 * @property {number} [reserveFuelDuration] - The duration for which reserve fuel is calculated in minutes.
 * @property {number} [taxiFuel] - The amount of fuel required for taxiing liters.
 * @property {number} [takeoffFuel] - The amount of fuel required for takeoff in liters.
 * @property {number} [landingFuel] - The amount of fuel required for landing in liters.
 */
export interface RouteOptions {
  defaultAltitude?: number;
  departureDate?: Date;
  aircraft?: Aircraft;
  alternate?: Aerodrome;
  reserveFuel?: number;
  reserveFuelDuration?: number;
  taxiFuel?: number;
  takeoffFuel?: number;
  landingFuel?: number;
}

type WaypointType = Aerodrome | VisualReportingPoint | Waypoint;

// TODO: Add metarStation to segment
interface RouteSegment {
  waypoint: WaypointType;
  altitude?: number;
}

/**
 * Checks if a given track is eastbound (0-179 degrees).
 *
 * @param {number} track - The track in degrees.
 * @returns {boolean} True if the track is eastbound, false otherwise.
 */
export const isEastbound = (track: number): boolean => {
  const normalizedTrack = ((track % 360) + 360) % 360;
  return normalizedTrack >= 0 && normalizedTrack <= 179;
}

/**
 * Checks if a given track is westbound (180-359 degrees).
 *
 * @param {number} track - The track in degrees.
 * @returns {boolean} True if the track is westbound, false otherwise.
 */
export const isWestbound = (track: number): boolean => {
  return !isEastbound(track);
}

/**
 * Calculates the appropriate VFR cruising altitude based on the track and desired minimum altitude.
 * Eastbound flights (0-179 degrees) use odd thousands + 500 feet (e.g., 3500, 5500).
 * Westbound flights (180-359 degrees) use even thousands + 500 feet (e.g., 4500, 6500).
 * The function returns the lowest VFR cruising altitude that is at or above the given minimum altitude.
 *
 * @param {number} track - The true track in degrees.
 * @param {number} altitude - The minimum desired altitude in feet.
 * @returns {number} The calculated VFR cruising altitude in feet.
 */
export const calculateVFRCruisingAltitude = (track: number, altitude: number): number => {
  let altitudeLevel: number;
  if (isEastbound(track)) {
    altitudeLevel = 3500;
    while (altitudeLevel < altitude) {
      altitudeLevel += 2000;
    }
  } else {
    altitudeLevel = 4500;
    while (altitudeLevel < altitude) {
      altitudeLevel += 2000;
    }
  }
  return altitudeLevel;
}

// TODO: Maybe convert altitude to pressure altitude
/**
 * Converts an altitude in feet to the corresponding flight level.
 * Flight levels are typically expressed in hundreds of feet, so the function divides the altitude by 1000.
 *
 * @param {number} altitude - The altitude in feet.
 * @returns {number} The flight level (FL) corresponding to the given altitude.
 */
export const flightLevel = (altitude: number): number => {
  return Math.floor(altitude / 1000);
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
   * Attaches relevant weather data to waypoints by fetching METAR information
   * First tries to get data for aerodromes by ICAO code, then finds nearest stations for other waypoints
   * 
   * @param waypoints - The waypoints to attach weather data to
   * @throws Will not throw but logs errors encountered during the process
   */
  private async attachWeatherData(waypoints: Waypoint[]): Promise<void> {
    const aerodromes = waypoints.filter(waypoint => FlightPlanner.isAerodrome(waypoint)) as Aerodrome[];
    const icaoCodes = aerodromes.map(aerodrome => aerodrome.ICAO);

    if (icaoCodes.length > 0) {
      const stations = await this.weatherService.get(icaoCodes);
      if (stations?.length) {
        const stationMap = new Map<string, MetarStation>();
        for (const station of stations) {
          stationMap.set(station.station, station);
        }

        for (const aerodrome of aerodromes) {
          const station = stationMap.get(aerodrome.ICAO);
          if (station) {
            aerodrome.metarStation = station;
          }
        }
      }
    }

    await Promise.all(waypoints
      .filter(waypoint => !waypoint.metarStation)
      .map(async waypoint => {
        const station = await this.weatherService.nearest(waypoint.location.geometry.coordinates);
        if (station) {
          waypoint.metarStation = station;
        }
      }));
  }

  /**
   * Creates a flight plan from a route string, which can include ICAO codes, reporting points, and waypoints.
   * 
   * @param routeString - A string representing the route, e.g., "EDDF;RP(ALPHA);WP(50.05,8.57)"
   * @param options - Optional configuration options for the flight route
   * @returns A route trip object with legs, distances, durations, and fuel calculations
   * @throws Error if no valid waypoints could be parsed from the route string
   */
  async createFlightPlanFromString(routeString: string, options: RouteOptions = {}): Promise<RouteTrip> {
    const waypoints = await this.parseRouteString(routeString);
    if (!waypoints.length) {
      throw new Error('No valid waypoints could be parsed from the route string');
    }

    return this.createFlightPlan(waypoints.map(waypoint => ({ waypoint })), options);
  }

  /**
   * Creates a flight plan based on an array of waypoints and optional route options.
   * 
   * @param segments - An array of route segments, each containing a waypoint and optional altitude
   * @param options - Optional configuration options for the flight route
   * @returns A route trip object with legs, distances, durations, and fuel calculations
   * @throws Error if fewer than 2 waypoints are provided
   */
  async createFlightPlan(segments: RouteSegment[], options: RouteOptions = {}): Promise<RouteTrip> {
    if (segments.length < 2) {
      throw new Error('At least departure and arrival waypoints are required');
    }

    const {
      defaultAltitude,
      departureDate = new Date(),
      aircraft,
      reserveFuelDuration = 30,
      reserveFuel,
    } = options;

    await this.attachWeatherData(segments.map(segment => segment.waypoint));

    const legs = segments.slice(0, -1).map((startSegment, i) => {
      const endSegment = segments[i + 1];

      if (!startSegment.altitude) {
        startSegment.altitude = defaultAltitude;
      }
      if (!endSegment.altitude) {
        endSegment.altitude = defaultAltitude;
      }

      // TODO: Fallback to destination aerodrome
      // TOOD: Every waypoint should have a magnetic declination
      const trueTrack = startSegment.waypoint.heading(endSegment.waypoint);
      let magneticDeclination = 0;
      if (FlightPlanner.isAerodrome(startSegment.waypoint) && typeof (startSegment.waypoint as Aerodrome).declination === 'number') {
        magneticDeclination = (startSegment.waypoint as Aerodrome).declination || 0;
      }

      const course = {
        distance: startSegment.waypoint.distance(endSegment.waypoint),
        track: normalizeTrack(trueTrack),
        magneticTrack: normalizeTrack(trueTrack - magneticDeclination),
        altitude: startSegment.altitude || endSegment.altitude,
      } as CourseVector;

      // TODO: 
      // const temperature = startSegment.waypoint.metarStation?.metar.temperature;
      const wind = startSegment.waypoint.metarStation?.metar.wind;

      const performance = aircraft && wind ? this.calculatePerformance(aircraft, course, wind) : undefined;

      const arrivalDate = performance
        ? new Date(departureDate.getTime() + performance.duration * 60 * 1000)
        : undefined;

      return {
        start: startSegment,
        end: endSegment,
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

    // Calculate total fuel required
    const reserveFuelRequired = reserveFuel ?? (aircraft ? this.calculateFuelConsumption(aircraft, reserveFuelDuration) : 0);
    const totalFuelRequired = totalFuelConsumption
      + (reserveFuelRequired || 0)
      + (options.takeoffFuel || 0)
      + (options.landingFuel || 0)
      + (options.taxiFuel || 0);

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
   * @param course - The course vector containing distance, true track, and magnetic track
   * @param wind - The wind conditions affecting the flight
   * @returns An object containing performance metrics or undefined if not applicable
   */
  private calculatePerformance(aircraft: Aircraft, course: CourseVector, wind: Wind): AircraftPerformance | undefined {
    if (aircraft.cruiseSpeed) {
      const wca = calculateWindCorrectionAngle(wind, course.track, aircraft.cruiseSpeed);
      const trueHeading = normalizeTrack(course.track + wca);
      const magneticHeading = normalizeTrack(course.magneticTrack + wca);

      // Groundspeed calculation uses true heading.
      const groundSpeed = calculateGroundspeed(wind, aircraft.cruiseSpeed, trueHeading);
      const duration = (course.distance / groundSpeed) * 60;
      const fuelConsumption = this.calculateFuelConsumption(aircraft, duration);

      // Calculate wind vector components
      const windVector = calculateWindVector(wind, course.track);

      return {
        headWind: windVector.headwind,
        crossWind: windVector.crosswind,
        trueAirSpeed: aircraft.cruiseSpeed, // TODO: Correct for altitude, temperature
        windCorrectionAngle: wca,
        heading: magneticHeading,
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
  static getRouteWaypoints(routeTrip: RouteTrip): WaypointType[] {
    const allWaypoints = routeTrip.route.flatMap(leg => [leg.start.waypoint, leg.end.waypoint]);

    const uniqueWaypoints = new Map<string, Aerodrome | VisualReportingPoint | Waypoint>();
    for (const waypoint of allWaypoints) {
      uniqueWaypoints.set(waypoint.name, waypoint);
    }

    return Array.from(uniqueWaypoints.values());
  }

  /**
   * Gets the departure waypoint from a route trip.
   * 
   * @param routeTrip - The route trip from which to extract the departure waypoint
   * @returns The departure waypoint, which is the first waypoint in the route
   */
  static getDepartureWaypoint(routeTrip: RouteTrip): WaypointType {
    return routeTrip.route[0].start.waypoint;
  }

  /**
   * Gets the arrival waypoint from a route trip.
   * 
   * @param routeTrip - The route trip from which to extract the arrival waypoint
   * @returns The arrival waypoint, which is the last waypoint in the route
   */
  static getArrivalWaypoint(routeTrip: RouteTrip): WaypointType {
    return routeTrip.route[routeTrip.route.length - 1].end.waypoint;
  }

  /**
   * Tests if a given waypoint is an Aerodrome.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is an Aerodrome, false otherwise
   */
  static isAerodrome(waypoint: WaypointType): waypoint is Aerodrome {
    return waypoint instanceof Aerodrome;
  }

  /**
   * Tests if a given waypoint is a ReportingPoint.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is a ReportingPoint, false otherwise
   */
  static isReportingPoint(waypoint: WaypointType): waypoint is VisualReportingPoint {
    return waypoint instanceof VisualReportingPoint;
  }

  /**
   * Tests if a given waypoint is a basic Waypoint.
   * 
   * @param waypoint - The waypoint to test
   * @returns True if the waypoint is a basic Waypoint, false otherwise
   */
  static isWaypoint(waypoint: WaypointType): waypoint is Waypoint {
    return waypoint instanceof Waypoint
      && !(waypoint instanceof Aerodrome)
      && !(waypoint instanceof VisualReportingPoint);
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
  async parseRouteString(routeString: string): Promise<WaypointType[]> {
    if (!routeString) return [];

    const waypoints: WaypointType[] = [];
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

        // TODO: Check for things like NAVAIDs, VORs, NDBs, etc.
        // TOOD: Check for VFR waypoints, starting with VRP_XX

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

  /**
   * Converts a route trip to a string representation.
   * 
   * @param routeTrip - The route trip to convert
   * @returns A string representation of the route trip
   */
  static toRouteString(routeTrip: RouteTrip): string {
    return FlightPlanner.getRouteWaypoints(routeTrip).map(waypoint => {
      if (FlightPlanner.isAerodrome(waypoint)) {
        return waypoint.ICAO;
      } else if (FlightPlanner.isReportingPoint(waypoint)) {
        return `RP(${waypoint.name})`;
      } else if (FlightPlanner.isWaypoint(waypoint)) {
        const coords = waypoint.location.geometry.coordinates;
        return `WP(${coords[1].toFixed(5)},${coords[0].toFixed(5)})`;
      }
      return '';
    }).join(';');
  }
}

export default FlightPlanner;