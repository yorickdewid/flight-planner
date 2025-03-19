import calculateFlightPerformance, { Aircraft, AircraftPerformance, calculateFuelConsumption } from './aircraft';
import { Aerodrome, ReportingPoint, Waypoint } from './airport';

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
 * @property {AircraftPerformance} [performance] - Optional performance calculations for this leg
 */
export interface RouteLeg {
  start: Waypoint;
  end: Waypoint;
  distance: number;
  trueTrack: number;
  windDirection: number | undefined;
  windSpeed: number | undefined;
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
}

/**
 * Plans a route between the given waypoints.
 * 
 * @param waypoints - An array of waypoints.
 * @param aircraft - An optional aircraft object.
 * @returns A route trip object.
 */
export function planFlightRoute(waypoints: (Aerodrome | ReportingPoint | Waypoint)[], options?: RouteOptions): RouteTrip {
  const aircraft = options?.aircraft;

  const legs = waypoints.slice(0, -1).map((startWaypoint, i) => {
    const endWaypoint = waypoints[i + 1];

    const distance = startWaypoint.getDistanceTo(endWaypoint);
    const trueTrack = startWaypoint.getHeadingTo(endWaypoint);

    const metarData = startWaypoint.metarStation?.metarData;
    const wind = { direction: metarData?.windDirection || 0, speed: metarData?.windSpeed || 0 };

    return {
      start: startWaypoint,
      end: endWaypoint,
      distance: distance,
      trueTrack: trueTrack,
      windDirection: wind.direction,
      windSpeed: wind.speed,
      performance: aircraft ? calculateFlightPerformance(aircraft, distance, trueTrack, wind) : undefined,
    };
  });

  const totalDistance = legs.reduce((acc, leg) => acc + leg.distance, 0);
  const totalDuration = legs.reduce((acc, leg) => acc + (leg.performance?.duration || 0), 0);
  const totalFuelConsumption = legs.reduce((acc, leg) => acc + (leg.performance?.fuelConsumption || 0), 0);

  const reserveFuel = options?.reserveFuel ?? (aircraft ? calculateFuelConsumption(aircraft, 30) : 0);
  const totalFuelRequired = totalFuelConsumption + (reserveFuel || 0);

  const departureDate = options?.departureDate || new Date();
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
