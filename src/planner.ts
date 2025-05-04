import calculateFlightPerformance, { Aircraft, AircraftPerformance, calculateFuelConsumption } from './aircraft.js';
import { Aerodrome, ReportingPoint, Waypoint } from './airport.js';
import { normalizeTrack } from './utils.js';
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
export const planFlightRoute = (waypoints: (Aerodrome | ReportingPoint | Waypoint)[], options?: RouteOptions): RouteTrip => {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required to plan a flight route');
  }

  const aircraft = options?.aircraft;
  const departureDate = options?.departureDate || new Date();

  const legs = waypoints.slice(0, -1).map((startWaypoint, i) => {
    const endWaypoint = waypoints[i + 1];

    const course = {
      distance: startWaypoint.distanceTo(endWaypoint),
      track: normalizeTrack(startWaypoint.headingTo(endWaypoint)),
      altitude: options?.altitude,
    }

    const wind = startWaypoint.metarStation?.metar.wind;
    const performance = aircraft && wind
      ? calculateFlightPerformance(aircraft, course.distance, course.track, wind) // TODO: Add altitude, change method to accept 'course' object
      : undefined;

    const arrivalDate = performance ? new Date(departureDate.getTime() + performance.duration * 60 * 1000) : undefined;
    return {
      start: startWaypoint,
      end: endWaypoint,
      course,
      wind,
      arrivalDate,
      performance,
    };
  });

  const totalDistance = legs.reduce((acc, leg) => acc + leg.course.distance, 0);
  const totalDuration = legs.reduce((acc, leg) => acc + (leg.performance?.duration || 0), 0);
  const totalFuelConsumption = legs.reduce((acc, leg) => acc + (leg.performance?.fuelConsumption || 0), 0);

  const reserveFuelDuration = options?.reserveFuelDuration ?? 30;
  const reserveFuel = options?.reserveFuel ?? (aircraft ? calculateFuelConsumption(aircraft, reserveFuelDuration) : 0);
  const totalFuelRequired = totalFuelConsumption + (reserveFuel || 0);

  const arrivalDate = new Date(departureDate.getTime() + totalDuration * 60 * 1000);

  return {
    route: legs,
    totalDistance: totalDistance,
    totalDuration: totalDuration,
    totalFuelConsumption: totalFuelConsumption,
    totalFuelRequired: totalFuelRequired,
    departureDate: departureDate,
    arrivalDate: arrivalDate,
  };
}
