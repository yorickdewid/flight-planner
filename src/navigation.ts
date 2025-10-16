import { Waypoint } from './waypoint.types.js';
import { createWaypoint, waypointDistance, waypointHeading } from './waypoint.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector } from './utils.js';
import { Wind } from './metar.types.js';
import { bearingToAzimuth, lineString, point as turfPoint, pointToLineDistance } from '@turf/turf';
import { InsufficientWaypointsError } from './exceptions.js';
import type {
  CourseVector,
  RouteLegPerformance,
  RouteLeg,
  RouteTrip,
  NavLogOptions,
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
 * Converts an array of waypoints to an array of route segments.
 *
 * This is a convenience function for preparing waypoints to be used with `calculateNavLog`.
 * Each waypoint is converted to a segment with an optional altitude.
 *
 * @param waypoints - Array of waypoints to convert to segments
 * @param altitude - Optional altitude in feet to apply to all segments
 * @returns Array of route segments ready for navigation log calculation
 *
 * @example
 * ```typescript
 * const waypoints = [departureAerodrome, enrouteWaypoint, arrivalAerodrome];
 * const segments = waypointsToSegments(waypoints, 5500);
 * const navLog = calculateNavLog({ segments, aircraft });
 * ```
 */
export function waypointsToSegments(waypoints: WaypointType[], altitude?: number): RouteSegment[] {
  return waypoints.map(waypoint => ({
    waypoint,
    ...(altitude !== undefined && { altitude })
  }));
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
 * Calculates a detailed navigation log (nav log) based on the provided options.
 *
 * A navigation log contains comprehensive flight performance calculations for each leg of the route,
 * including wind corrections, heading calculations, groundspeed, fuel consumption, and timing.
 * This is the detailed computational output that pilots use for in-flight navigation, as opposed
 * to a flight plan which is the route description submitted to ATC.
 *
 * The function performs the following calculations:
 * - Route leg analysis: distance, true/magnetic tracks, and headings
 * - Wind correction angles and ground speeds based on forecast winds
 * - Fuel planning: trip fuel, reserves, taxi, takeoff, landing, and alternate fuel
 * - Timing: leg durations, departure/arrival times
 * - Performance metrics: true airspeed, headwind/crosswind components
 *
 * @param options - Navigation log options containing segments, aircraft, and fuel parameters.
 * @returns A RouteTrip object containing the complete navigation log with all calculated performance data.
 * @throws {InsufficientWaypointsError} If fewer than 2 waypoints are provided in segments.
 *
 * @example
 * ```typescript
 * const navLog = calculateNavLog({
 *   segments: [
 *     { waypoint: departureAerodrome },
 *     { waypoint: enrouteWaypoint, altitude: 5500 },
 *     { waypoint: arrivalAerodrome }
 *   ],
 *   aircraft: { cruiseSpeed: 120, fuelConsumption: 8.5 },
 *   altitude: 5500,
 *   reserveFuelDuration: 45
 * });
 * ```
 */
export function calculateNavLog(options: NavLogOptions): RouteTrip {
  const {
    segments: inputSegments,
    alternateSegment: inputAlternateSegment,
    aircraft,
    departureDate = new Date(),
    altitude,
    reserveFuelDuration = 30,
    reserveFuel,
    taxiFuel,
    takeoffFuel,
    landingFuel
  } = options;

  if (inputSegments.length < 2) {
    throw new InsufficientWaypointsError(inputSegments.length);
  }

  // TODO: We copy the segments to avoid mutating the input, have the input be readonly
  const segments = inputSegments.map(seg => ({ ...seg }));
  const alternateSegment = inputAlternateSegment ? { ...inputAlternateSegment } : undefined;

  if (segments[0].waypoint.elevation !== undefined) {
    segments[0].altitude = segments[0].waypoint.elevation;
  }
  if (segments[segments.length - 1].waypoint.elevation !== undefined) {
    segments[segments.length - 1].altitude = segments[segments.length - 1].waypoint.elevation;
  }

  if (altitude) {
    segments.forEach((segment, i) => {
      if (i !== 0 && i !== segments.length - 1 && !segment.altitude) {
        segment.altitude = altitude;
      }
    });
  }

  segments.forEach(segment => segment.altitude !== undefined && (segment.altitude = Math.round(segment.altitude)));

  const aircraftPerformance: AircraftPerformance | undefined = aircraft?.cruiseSpeed ? {
    cruiseSpeed: aircraft.cruiseSpeed,
    fuelConsumption: aircraft.fuelConsumption
  } : undefined;

  const legs = segments.slice(0, -1).map((startSegment, i) => calculateRouteLeg(startSegment, segments[i + 1], aircraftPerformance));

  let routeAlternate: RouteLeg | undefined;
  if (alternateSegment) {
    if (altitude && !alternateSegment.altitude) {
      alternateSegment.altitude = altitude;
    }
    routeAlternate = calculateRouteLeg(segments[segments.length - 1], alternateSegment, aircraftPerformance);
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let totalFuelConsumption = 0;

  for (const leg of legs) {
    totalDistance += leg.course.distance;
    totalDuration += leg.performance?.duration || 0;
    totalFuelConsumption += leg.performance?.fuelConsumption || 0;

    const legArrivalDate = leg.performance && new Date(departureDate.getTime() + totalDuration * 60 * 1000);
    leg.arrivalDate = legArrivalDate;
  }

  // Round individual legs after calculating totals to avoid cumulative rounding errors
  // for (const leg of legs) {
  //   roundRouteLeg(leg);
  // }

  const reserveFuelRequired = reserveFuel ?? (aircraft?.fuelConsumption ? aircraft.fuelConsumption * (reserveFuelDuration / 60) : 0);
  const totalTripFuel = totalFuelConsumption
    + (reserveFuelRequired || 0)
    + (takeoffFuel || 0)
    + (landingFuel || 0)
    + (taxiFuel || 0);

  const fuelBreakdown = {
    trip: Math.round(totalFuelConsumption),
    reserve: Math.round(reserveFuelRequired),
    takeoff: takeoffFuel !== undefined ? Math.round(takeoffFuel) : undefined,
    landing: landingFuel !== undefined ? Math.round(landingFuel) : undefined,
    taxi: taxiFuel !== undefined ? Math.round(taxiFuel) : undefined,
    alternate: routeAlternate?.performance?.fuelConsumption !== undefined ? Math.round(routeAlternate.performance.fuelConsumption) : undefined
  };

  // if (routeAlternate) {
  //   roundRouteLeg(routeAlternate);
  // }

  return {
    route: legs,
    routeAlternate,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
    totalTripFuel: totalTripFuel !== undefined ? Math.round(totalTripFuel) : undefined,
    fuelBreakdown,
    departureDate,
    arrivalDate: new Date(departureDate.getTime() + totalDuration * 60 * 1000),
    generatedAt: new Date(),
  };
}

// /**
//  * Rounds all numeric values in a route leg for consistent precision.
//  *
//  * @param {RouteLeg} leg - The route leg to round.
//  */
// function roundRouteLeg(leg: RouteLeg): void {
//   leg.course.distance = Math.round(leg.course.distance);
//   leg.course.magneticTrack = Math.round(leg.course.magneticTrack);
//   leg.course.track = Math.round(leg.course.track);

//   if (leg.performance) {
//     leg.performance.headWind = Math.round(leg.performance.headWind);
//     leg.performance.crossWind = Math.round(leg.performance.crossWind);
//     leg.performance.trueAirspeed = Math.round(leg.performance.trueAirspeed);
//     leg.performance.windCorrectionAngle = Math.round(leg.performance.windCorrectionAngle);
//     leg.performance.trueHeading = Math.round(leg.performance.trueHeading);
//     leg.performance.magneticHeading = Math.round(leg.performance.magneticHeading);
//     leg.performance.groundSpeed = Math.round(leg.performance.groundSpeed);
//     leg.performance.duration = Math.round(leg.performance.duration);
//     if (leg.performance.fuelConsumption !== undefined) {
//       leg.performance.fuelConsumption = Math.round(leg.performance.fuelConsumption);
//     }
//   }
// }

/**
 * Calculates a single leg of a flight route.
 *
 * @param {RouteSegment} start - The starting segment of the leg.
 * @param {RouteSegment} end - The ending segment of the leg.
 * @param {AircraftPerformance} [aircraft] - The aircraft performance data for calculations.
  * @returns {RouteLeg} The calculated route leg.
 */
function calculateRouteLeg(
  start: RouteSegment,
  end: RouteSegment,
  aircraft: AircraftPerformance | undefined,
): RouteLeg {
  const course = calculateRouteCourse(start.waypoint, end.waypoint);

  // TODO:
  // const temperature = start.waypoint.metarStation?.metar.temperature;
  const wind = end.waypoint.metarStation?.metar.wind;

  const performance = aircraft && wind ? calculatePerformance(aircraft, course, wind) : undefined;

  return {
    start,
    end,
    course,
    wind,
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
