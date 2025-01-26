import calculateFlightPerformance, { Aircraft, AircraftPerformance } from './aircraft';
import { Aerodrome, ReportingPoint, Waypoint } from './airport';

/**
 * Represents a route leg between two waypoints.
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
 * Represents a route trip between multiple waypoints.
 */
export interface RouteTrip {
  route: RouteLeg[];
  totalDistance: number;
  totalDuration: number;
  totalFuelConsumption?: number;
  departureTime?: Date;
  arrivalTime?: Date;
}

/**
 * Represents the options for planning a route.
 */
export interface RouteOptions {
  altitude?: number;
  departureTime?: Date;
  aircraft?: Aircraft;
}

/**
 * Plans a route between the given waypoints.
 * 
 * @param waypoints - An array of waypoints.
 * @param aircraft - An optional aircraft object.
 * @returns A route trip object.
 */
export function routePlan(waypoints: (Aerodrome | ReportingPoint | Waypoint)[], options?: RouteOptions): RouteTrip {
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
      performance: options?.aircraft ? calculateFlightPerformance(options?.aircraft, distance, trueTrack, wind) : undefined,
    };
  });

  const totalDistance = legs.reduce((acc, leg) => acc + leg.distance, 0);
  const totalDuration = legs.reduce((acc, leg) => acc + (leg.performance?.duration || 0), 0);
  const totalFuelConsumption = legs.reduce((acc, leg) => acc + (leg.performance?.fuelConsumption || 0), 0);

  const departureTime = options?.departureTime || new Date();
  const arrivalTime = new Date(departureTime.getTime() + totalDuration * 60 * 1000);

  return {
    route: legs,
    totalDistance: totalDistance,
    totalDuration: totalDuration,
    totalFuelConsumption: totalFuelConsumption,
    departureTime: departureTime,
    arrivalTime: arrivalTime,
  };
}

