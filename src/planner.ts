import { Aircraft, WeatherService } from './index.js';
import { Aerodrome, ReportingPoint, Waypoint } from './airport.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector, normalizeTrack } from './utils.js';
import { Wind } from './metar.js';

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
 * Plans a route between the given waypoints.
 * 
 * @param waypoints - An array of waypoints to use in the route.
 * @param options - Optional configuration options for the flight route.
 * @returns A route trip object with legs, distances, durations, and fuel calculations.
 * @throws Error if the waypoints array contains fewer than 2 points.
 */
export const planFlightRoute = async (
  weatherService: WeatherService,
  waypoints: (Aerodrome | ReportingPoint | Waypoint)[],
  options: RouteOptions = {}
): Promise<RouteTrip> => {
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

  // TODO: Move this to a separate function
  try {
    waypoints.forEach(async waypoint => {
      const station = await weatherService.nearest(waypoint.location.geometry.coordinates);
      if (station) {
        waypoint.metarStation = station;
      }
    });
  } catch (error) {
    console.error('Error attaching METAR data to waypoints:', error);
  }

  const calculateFuelConsumption = (aircraft: Aircraft, duration: number): number | undefined => {
    return aircraft.fuelConsumption ? aircraft.fuelConsumption * (duration / 60) : undefined;
  }

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

    let performance: AircraftPerformance | undefined = undefined;
    if (aircraft?.cruiseSpeed && wind) {
      const windVector = calculateWindVector(wind, course.track);
      const wca = calculateWindCorrectionAngle(wind, course.track, aircraft.cruiseSpeed);
      const heading = normalizeTrack(course.track + wca); // TODO: Correct for magnetic variation
      const groundSpeed = calculateGroundspeed(wind, aircraft.cruiseSpeed, heading);
      const duration = (course.distance / groundSpeed) * 60;
      const fuelConsumption = calculateFuelConsumption(aircraft, duration);

      performance = {
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

    const arrivalDate = performance
      ? new Date(departureDate.getTime() + performance.duration * 60 * 1000)
      : undefined;

    // TODO: Add fuel consumption to leg
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

  const reserveFuelRequired = reserveFuel ?? (aircraft ? calculateFuelConsumption(aircraft, reserveFuelDuration) : 0);
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
 * Maps a route trip to an array of waypoints.
 * 
 * This function extracts all waypoints from a route trip by taking the start and end
 * waypoints of each leg and flattening them into a single array.
 * 
 * @param routeTrip - The route trip containing legs with start and end waypoints
 * @returns An array of waypoints representing all points in the route trip
 */
export const routeTripWaypoints = (routeTrip: RouteTrip): (Aerodrome | ReportingPoint | Waypoint)[] => {
  return routeTrip.route.flatMap(leg => [leg.start, leg.end]);
}