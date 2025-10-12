import { Aerodrome, ReportingPoint, Waypoint } from './waypoint.types.js';
import { Wind } from './metar.types.js';
import { Aircraft } from './aircraft.js';

/**
 * Represents a course vector with distance and track.
 *
 * @interface CourseVector
 * @property {number} distance - The distance of the course vector in nautical miles.
 * @property {number} track - The true track heading in degrees.
 * @property {number} magneticTrack - The magnetic track heading in degrees, if available.
 */
export interface CourseVector {
  distance: number;
  track: number;
  magneticTrack: number;
}

/**
 * Interface representing the performance characteristics of an aircraft.
 *
 * @interface RouteLegPerformance
 * @property {number} headWind - The component of wind directly opposing the aircraft's motion, measured in knots.
 * @property {number} crossWind - The component of wind perpendicular to the aircraft's motion, measured in knots.
 * @property {number} trueAirspeed - The speed of the aircraft relative to the air mass it's flying through, measured in knots.
 * @property {number} windCorrectionAngle - The angle between the aircraft's heading and its track, measured in degrees.
 * @property {number} trueHeading - The heading of the aircraft relative to true north, measured in degrees.
 * @property {number} magneticHeading - The heading of the aircraft corrected for magnetic declination, measured in degrees.
 * @property {number} groundSpeed - The actual speed of the aircraft over the ground, measured in knots.
 * @property {number} duration - The time duration for a segment of flight, typically measured in minutes.
 * @property {number} [fuelConsumption] - Optional property representing the fuel consumption rate, typically measured in gallons or liters per hour.
 */
export interface RouteLegPerformance {
  headWind: number;
  crossWind: number;
  trueAirspeed: number;
  windCorrectionAngle: number;
  trueHeading: number;
  magneticHeading: number;
  groundSpeed: number;
  duration: number;
  fuelConsumption?: number;
}

/**
 * Represents the possible types for a waypoint in a route.
 * Can be an Aerodrome, a ReportingPoint, or a generic Waypoint.
 */
export type WaypointType = Aerodrome | ReportingPoint | Waypoint;

/**
 * Represents a segment of a flight route, containing a waypoint and optional altitude.
 *
 * @interface RouteSegment
 * @property {WaypointType} waypoint - The waypoint for this segment, which can be an Aerodrome, ReportingPoint, or Waypoint.
 * @property {number} [altitude] - Optional altitude for the segment in feet.
 */
export interface RouteSegment {
  waypoint: WaypointType;
  altitude?: number;
}

/**
 * Represents a segment of a flight route between two waypoints.
 *
 * @interface RouteLeg
 * @property {RouteSegment} start - The starting waypoint of the leg.
 * @property {RouteSegment} end - The ending waypoint of the leg.
 * @property {CourseVector} course - The course vector of the leg, containing distance and track information.
 * @property {Wind} [wind] - Optional wind conditions for this leg.
 * @property {Date | undefined} arrivalDate - The estimated arrival date and time at the end waypoint.
 * @property {RouteLegPerformance} [performance] - Optional performance calculations for this leg.
 */
export interface RouteLeg {
  start: RouteSegment;
  end: RouteSegment;
  course: CourseVector;
  wind?: Wind;
  arrivalDate?: Date;
  performance?: RouteLegPerformance;
}

/**
 * Represents a complete route trip with multiple legs.
 * Contains information about the route's path, distances, duration, and optionally fuel consumption and timing.
 *
 * @interface RouteTrip
 * @property {RouteLeg[]} route - Array of route legs that make up the complete trip
 * @property {RouteLeg} [routeAlternate] - Optional alternate route leg for the trip
 * @property {number} totalDistance - Total distance of the trip in nautical miles
 * @property {number} totalDuration - Total duration of the trip in minutes
 * @property {number} [totalTripFuel] - Optional total fuel consumption for the trip in gallons or liters
 * @property {Date} [departureDate] - Optional planned departure date and time
 * @property {Date} [arrivalDate] - Optional estimated arrival date and time
 * @property {Date} generatedAt - The date and time when the trip was generated
 * @property {string} [remarks] - Optional remarks or notes about the trip
 */
export interface RouteTrip {
  route: RouteLeg[];
  routeAlternate?: RouteLeg;
  totalDistance: number;
  totalDuration: number;
  totalTripFuel?: number;
  fuelBreakdown?: {
    trip: number;
    reserve: number;
    takeoff?: number;
    landing?: number;
    taxi?: number;
    alternate?: number;
  };
  departureDate?: Date;
  arrivalDate?: Date;
  generatedAt: Date;
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
  alternateRadius?: number;
  reserveFuel?: number;
  reserveFuelDuration?: number;
  taxiFuel?: number;
  takeoffFuel?: number;
  landingFuel?: number;
}

/**
 * Options for configuring a flight plan.
 *
 * @interface FlightPlanOptions
 * @property {RouteSegment[]} segments - Array of route segments representing the waypoints and altitudes for the flight.
 * @property {RouteSegment} [alternateSegment] - Optional alternate aerodrome segment for the flight plan.
 * @property {Aircraft} [aircraft] - The aircraft to be used for the flight.
 * @property {Date} [departureDate] - The scheduled departure date and time.
 * @property {number} [reserveFuel] - The amount of reserve fuel to carry in liters.
 * @property {number} [reserveFuelDuration] - The duration for which reserve fuel is calculated in minutes.
 * @property {number} [taxiFuel] - The amount of fuel required for taxiing in liters.
 * @property {number} [takeoffFuel] - The amount of fuel required for takeoff in liters.
 * @property {number} [landingFuel] - The amount of fuel required for landing in liters.
 */
export interface FlightPlanOptions {
  segments: RouteSegment[];
  alternateSegment?: RouteSegment;
  aircraft?: Aircraft;
  departureDate?: Date;
  reserveFuel?: number;
  reserveFuelDuration?: number;
  taxiFuel?: number;
  takeoffFuel?: number;
  landingFuel?: number;
}
