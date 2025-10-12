import { Waypoint } from './waypoint.types.js';
import { createWaypoint, waypointDistance, waypointHeading } from './waypoint.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector } from './utils.js';
import { Wind } from './metar.types.js';
import { bearingToAzimuth, lineString, point as turfPoint, pointToLineDistance } from '@turf/turf';
import { Aircraft } from './aircraft.js';
import { InsufficientWaypointsError } from './exceptions.js';
import type {
  CourseVector,
  RouteLegPerformance,
  RouteLeg,
  RouteTrip,
  FlightPlanOptions,
  WaypointType,
  RouteSegment,
} from './navigation.types.js';

/**
 * Minimal aircraft performance data required for flight calculations.
 */
interface AircraftPerformance {
  cruiseSpeed: number;
  fuelConsumption?: number;
}

/**
 * Checks if a given track is eastbound (0-179 degrees).
 *
 * @param {number} track - The track in degrees.
 * @returns {boolean} True if the track is eastbound, false otherwise.
 */
export const isEastbound = (track: number): boolean => {
  const normalizedTrack = bearingToAzimuth(track);
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
 *
 * Eastbound flights (0-179 degrees) use odd thousands + 500 feet (e.g., 3500, 5500).
 * Westbound flights (180-359 degrees) use even thousands + 500 feet (e.g., 4500, 6500).
 * The function returns the lowest VFR cruising altitude that is at or above the given minimum altitude.
 *
 * @param {number} track - The true track in degrees.
 * @param {number} altitude - The minimum desired altitude in feet.
 * @returns {number} The calculated VFR cruising altitude in feet.
 */
export function calculateVFRCruisingAltitude(track: number, altitude: number): number {
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
 * Finds the closest route leg to a given location.
 *
 * @param routeTrip - The route trip to search within.
 * @param location - The location to find the closest leg to, as a [longitude, latitude] tuple.
 * @returns The closest route leg, or undefined if no route legs are found or the input is invalid.
 */
export function closestRouteLeg(routeTrip: RouteTrip, location: [number, number]): RouteLeg | undefined {
  if (!routeTrip || !routeTrip.route || routeTrip.route.length === 0) {
    return undefined;
  }

  const targetPointFeature = turfPoint(location);

  let minDistanceToLeg = Infinity;
  let closestLeg: RouteLeg | undefined = undefined;

  for (const leg of routeTrip.route) {
    const startWp = leg.start.waypoint;
    const endWp = leg.end.waypoint;

    if (!startWp.location?.geometry?.coordinates || !endWp.location?.geometry?.coordinates) {
      continue;
    }

    const legLine = lineString([
      startWp.location.geometry.coordinates,
      endWp.location.geometry.coordinates
    ]);

    const distance = pointToLineDistance(targetPointFeature, legLine, { units: 'nauticalmiles' });
    if (distance < minDistanceToLeg) {
      minDistanceToLeg = distance;
      closestLeg = leg;
    }
  }

  return closestLeg;
}

/**
 * Finds the closest waypoint in a route trip to a given location.
 *
 * @param routeTrip - The route trip to search within.
 * @param location - The location to find the closest waypoint to, as a [longitude, latitude] tuple.
 * @returns The closest waypoint, or undefined if no waypoints are found or the input is invalid.
 */
export function closestWaypoint(routeTrip: RouteTrip, location: [number, number]): WaypointType | undefined {
  if (!routeTrip || !routeTrip.route || routeTrip.route.length === 0) {
    return undefined;
  }

  const currentLocationAsWaypoint = createWaypoint(location, 'currentLocationPoint');

  let minDistance = Infinity;
  let closestWaypoint: WaypointType | undefined = undefined;

  const uniqueWaypoints = routeTripWaypoints(routeTrip);
  for (const wp of uniqueWaypoints) {
    if (!wp.location?.geometry?.coordinates) {
      continue;
    }
    const dist = waypointDistance(currentLocationAsWaypoint, wp);
    if (dist < minDistance) {
      minDistance = dist;
      closestWaypoint = wp;
    }
  }

  return closestWaypoint;
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
export function routeTripWaypoints(routeTrip: RouteTrip): WaypointType[] {
  const allWaypoints = routeTrip.route.flatMap(leg => [leg.start.waypoint, leg.end.waypoint]);

  const uniqueWaypoints = new Map<string, WaypointType>();
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
export const routeTripDepartureWaypoint = (routeTrip: RouteTrip): WaypointType => {
  return routeTrip.route[0].start.waypoint;
}

/**
 * Gets the arrival waypoint from a route trip.
 *
 * @param routeTrip - The route trip from which to extract the arrival waypoint
 * @returns The arrival waypoint, which is the last waypoint in the route
 */
export const routeTripArrivalWaypoint = (routeTrip: RouteTrip): WaypointType => {
  return routeTrip.route[routeTrip.route.length - 1].end.waypoint;
}

/**
 * Generates a flight plan based on the provided options.
 *
 * This function calculates the route legs, total distance, duration, fuel consumption, and other performance metrics.
 * It returns a RouteTrip object containing all relevant information about the flight plan.
 *
 * @param options - Flight plan options containing segments, aircraft, and fuel parameters.
 * @returns A RouteTrip object containing the calculated flight plan details.
 */
export function flightPlan(options: FlightPlanOptions): RouteTrip {
  const {
    segments,
    alternateSegment,
    aircraft,
    departureDate = new Date(),
    reserveFuelDuration = 30,
    reserveFuel,
    taxiFuel,
    takeoffFuel,
    landingFuel
  } = options;

  if (segments.length < 2) {
    throw new InsufficientWaypointsError(segments.length);
  }

  const aircraftPerformance: AircraftPerformance | undefined = aircraft?.cruiseSpeed ? {
    cruiseSpeed: aircraft.cruiseSpeed,
    fuelConsumption: aircraft.fuelConsumption
  } : undefined;

  const legs = segments.slice(0, -1).map((startSegment, i) => calculateRouteLeg(startSegment, segments[i + 1], aircraftPerformance, departureDate));

  let routeAlternate: RouteLeg | undefined;
  if (alternateSegment) {
    routeAlternate = calculateRouteLeg(segments[segments.length - 1], alternateSegment, aircraftPerformance, departureDate);
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let totalFuelConsumption = 0;

  for (const leg of legs) {
    totalDistance += leg.course.distance;
    totalDuration += leg.performance?.duration || 0;
    totalFuelConsumption += leg.performance?.fuelConsumption || 0;
  }

  for (const leg of legs) {
    leg.course.distance = Math.round(leg.course.distance);
    leg.course.magneticTrack = Math.round(leg.course.magneticTrack);
    leg.course.track = Math.round(leg.course.track);

    if (leg.performance) {
      leg.performance.headWind = Math.round(leg.performance.headWind);
      leg.performance.crossWind = Math.round(leg.performance.crossWind);
      leg.performance.trueAirspeed = Math.round(leg.performance.trueAirspeed);
      leg.performance.windCorrectionAngle = Math.round(leg.performance.windCorrectionAngle);
      leg.performance.trueHeading = Math.round(leg.performance.trueHeading);
      leg.performance.magneticHeading = Math.round(leg.performance.magneticHeading);
      leg.performance.groundSpeed = Math.round(leg.performance.groundSpeed);
      leg.performance.duration = Math.round(leg.performance.duration);
      if (leg.performance.fuelConsumption !== undefined) {
        leg.performance.fuelConsumption = Math.round(leg.performance.fuelConsumption);
      }
    }
  }

  const reserveFuelRequired = reserveFuel ?? (aircraft?.fuelConsumption ? aircraft.fuelConsumption * (reserveFuelDuration / 60) : 0);
  const totalTripFuel = totalFuelConsumption
    + (reserveFuelRequired || 0)
    + (takeoffFuel || 0)
    + (landingFuel || 0)
    + (taxiFuel || 0);

  const fuelBreakdown = {
    trip: Math.round(totalFuelConsumption),
    reserve: Math.round(reserveFuelRequired || 0),
    takeoff: takeoffFuel && Math.round(takeoffFuel),
    landing: landingFuel && Math.round(landingFuel),
    taxi: taxiFuel && Math.round(taxiFuel),
    alternate: routeAlternate?.performance?.fuelConsumption && Math.round(routeAlternate.performance.fuelConsumption)
  };

  if (routeAlternate) {
    routeAlternate.course.distance = Math.round(routeAlternate.course.distance);
    routeAlternate.course.magneticTrack = Math.round(routeAlternate.course.magneticTrack);
    routeAlternate.course.track = Math.round(routeAlternate.course.track);

    if (routeAlternate.performance) {
      routeAlternate.performance.headWind = Math.round(routeAlternate.performance.headWind);
      routeAlternate.performance.crossWind = Math.round(routeAlternate.performance.crossWind);
      routeAlternate.performance.trueAirspeed = Math.round(routeAlternate.performance.trueAirspeed);
      routeAlternate.performance.windCorrectionAngle = Math.round(routeAlternate.performance.windCorrectionAngle);
      routeAlternate.performance.trueHeading = Math.round(routeAlternate.performance.trueHeading);
      routeAlternate.performance.magneticHeading = Math.round(routeAlternate.performance.magneticHeading);
      routeAlternate.performance.groundSpeed = Math.round(routeAlternate.performance.groundSpeed);
      routeAlternate.performance.duration = Math.round(routeAlternate.performance.duration);
      if (routeAlternate.performance.fuelConsumption !== undefined) {
        routeAlternate.performance.fuelConsumption = Math.round(routeAlternate.performance.fuelConsumption);
      }
    }
  }

  return {
    route: legs,
    routeAlternate,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
    totalTripFuel: totalTripFuel && Math.round(totalTripFuel),
    fuelBreakdown,
    departureDate,
    arrivalDate: new Date(departureDate.getTime() + totalDuration * 60 * 1000),
    generatedAt: new Date(),
  };
}

/**
 * Calculates a single leg of a flight route.
 *
 * @param {RouteSegment} start - The starting segment of the leg.
 * @param {RouteSegment} end - The ending segment of the leg.
 * @param {AircraftPerformance} [aircraft] - The aircraft performance data for calculations.
 * @param {Date} departureDate - The departure date from the start of this leg.
 * @returns {RouteLeg} The calculated route leg.
 */
function calculateRouteLeg(
  start: RouteSegment,
  end: RouteSegment,
  aircraft: AircraftPerformance | undefined,
  departureDate: Date
): RouteLeg {
  const course = calculateRouteCourse(start.waypoint, end.waypoint);

  // TODO:
  // const temperature = start.waypoint.metarStation?.metar.temperature;
  const wind = end.waypoint.metarStation?.metar.wind;

  const performance = aircraft && wind ? calculatePerformance(aircraft, course, wind) : undefined;
  const arrivalDate = performance && new Date(departureDate.getTime() + performance.duration * 60 * 1000);

  return {
    start,
    end,
    course,
    wind,
    arrivalDate,
    performance,
  };
}

/**
 * Calculates the course vector (distance and track) between two waypoints.
 *
 * @param {Waypoint} start - The starting waypoint.
 * @param {Waypoint} end - The ending waypoint.
 * @returns {CourseVector} The calculated course vector.
 */
function calculateRouteCourse(start: Waypoint, end: Waypoint): CourseVector {
  const trueTrack = waypointHeading(start, end);
  const magneticDeclination = start.declination
    || end.declination
    || 0;

  return {
    distance: waypointDistance(start, end),
    track: bearingToAzimuth(trueTrack),
    magneticTrack: bearingToAzimuth(trueTrack - magneticDeclination),
  };
}

/**
 * Calculates aircraft performance for a given course, aircraft performance data, and wind conditions.
 *
 * @param {AircraftPerformance} aircraft - The aircraft performance data (cruise speed and fuel consumption).
 * @param {CourseVector} course - The course vector (track and distance).
 * @param {Wind} wind - The wind conditions.
 * @returns {RouteLegPerformance} The calculated aircraft performance.
 */
function calculatePerformance(aircraft: AircraftPerformance, course: CourseVector, wind: Wind): RouteLegPerformance {
  // Calculate the true airspeed
  const trueAirspeed = aircraft.cruiseSpeed;

  // Calculate wind correction angle and magnetic heading
  const wca = calculateWindCorrectionAngle(wind, course.track, trueAirspeed);
  const trueHeading = bearingToAzimuth(course.track + wca);
  const magneticHeading = bearingToAzimuth(course.magneticTrack + wca);

  // Groundspeed calculation uses true heading.
  const groundSpeed = calculateGroundspeed(wind, trueAirspeed, trueHeading);
  const duration = (course.distance / groundSpeed) * 60;
  const fuelConsumption = aircraft.fuelConsumption && (aircraft.fuelConsumption * (duration / 60));

  // Calculate wind vector components
  const windVector = calculateWindVector(wind, course.track);

  return {
    headWind: windVector.headwind,
    crossWind: windVector.crosswind,
    trueAirspeed,
    windCorrectionAngle: wca,
    trueHeading,
    magneticHeading,
    groundSpeed,
    duration,
    fuelConsumption
  };
}
