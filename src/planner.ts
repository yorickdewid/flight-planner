import { Advisory, AerodromeService, AircraftService, routeTripValidate, WeatherService } from './index.js';
import { Aerodrome, ReportingPoint, Waypoint } from './waypoint.types.js';
import { createWaypoint, waypointDistance, waypointHeading } from './waypoint.js';
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector, isICAO } from './utils.js';
import { Wind } from './metar.types.js';
import { bearingToAzimuth, lineString, point as turfPoint, pointToLineDistance } from '@turf/turf';
import { Aircraft } from './aircraft.js';
import { InsufficientWaypointsError } from './exceptions.js';

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
 * Represents a segment of a flight route between two waypoints.
 *
 * @interface RouteLeg
 * @property {RouteSegment} start - The starting waypoint of the leg.
 * @property {RouteSegment} end - The ending waypoint of the leg.
 * @property {CourseVector} course - The course vector of the leg, containing distance and track information.
 * @property {Wind} [wind] - Optional wind conditions for this leg.
 * @property {Date | undefined} arrivalDate - The estimated arrival date and time at the end waypoint.
 * @property {AircraftPerformance} [performance] - Optional performance calculations for this leg.
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
  alternateRadius?: number; // Added this line
  reserveFuel?: number;
  reserveFuelDuration?: number;
  taxiFuel?: number;
  takeoffFuel?: number;
  landingFuel?: number;
}

/**
 * Represents the possible types for a waypoint in a route.
 * Can be an Aerodrome, a ReportingPoint, or a generic Waypoint.
 */
type WaypointType = Aerodrome | ReportingPoint | Waypoint;

/**
 * Represents a segment of a flight route, containing a waypoint and optional altitude.
 *
 * @interface RouteSegment
 * @property {WaypointType} waypoint - The waypoint for this segment, which can be an Aerodrome, ReportingPoint, or Waypoint.
 * @property {number} [altitude] - Optional altitude for the segment in feet.
 */
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
 * Finds the closest route leg to a given location.
 *
 * @param routeTrip - The route trip to search within.
 * @param location - The location to find the closest leg to, as a [longitude, latitude] tuple.
 * @returns The closest route leg, or undefined if no route legs are found or the input is invalid.
 */
export const closestRouteLeg = (routeTrip: RouteTrip, location: [number, number]): RouteLeg | undefined => {
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
export const closestWaypoint = (routeTrip: RouteTrip, location: [number, number]): WaypointType | undefined => {
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
export const routeTripWaypoints = (routeTrip: RouteTrip): WaypointType[] => {
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
 * Parses a route string into an array of waypoints.
 * 
 * This function accepts a route string containing various waypoint formats and converts them
 * into standardized waypoint objects. It supports ICAO airport codes and coordinate-based waypoints.
 * 
 * @async
 * @function parseRouteString
 * @param {AerodromeService} aerodromeService - Service for looking up aerodrome information by ICAO codes
 * @param {string} routeString - The route string to parse, containing waypoints separated by spaces, semicolons, or newlines
 * @returns {Promise<WaypointType[]>} A promise that resolves to an array of parsed waypoints
 * 
 * @description
 * Supported waypoint formats:
 * - ICAO codes: 4-letter airport identifiers (e.g., "KJFK", "EGLL")
 * - Coordinate waypoints: WP(latitude,longitude) format (e.g., "WP(40.7128,-74.0060)")
 * 
 * The function performs the following operations:
 * 1. Splits the route string by whitespace, semicolons, and newlines
 * 2. Filters out empty parts
 * 3. Converts all input to uppercase for consistency
 * 4. For each part, attempts to match against supported formats:
 *    - If ICAO code: looks up aerodrome using the provided service
 *    - If coordinate waypoint: creates a waypoint with the specified coordinates
 * 5. Collects parsing errors and throws if no valid waypoints are found
 * 
 * @throws {Error} Throws an error if the route string cannot be parsed or contains no valid waypoints
 */
export const parseRouteString = async (aerodromeService: AerodromeService, routeString: string): Promise<WaypointType[]> => {
  if (!routeString) return [];

  const waypoints: WaypointType[] = [];
  const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);

  const waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

  const parseErrors: string[] = [];

  for (const part of routeParts) {
    try {
      if (isICAO(part)) {
        const airport = await aerodromeService.findOne(part);
        if (airport) {
          waypoints.push(airport);
          continue;
        } else {
          throw new Error(`Could not find aerodrome with ICAO code: ${part}`);
        }
      }

      const waypointMatch = part.match(waypointRegex);
      if (waypointMatch) {
        const lat = parseFloat(waypointMatch[1]);
        const lng = parseFloat(waypointMatch[2]);
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error(`Invalid coordinates in waypoint: ${part}`);
        }

        const name = `WP-${lat.toFixed(2)},${lng.toFixed(2)}`;
        waypoints.push({ name, location: turfPoint([lng, lat]) } as Waypoint);
        continue;
      }

      // TODO: Check for things like NAVAIDs, VORs, NDBs, etc.
      // TODO: Check for VFR waypoints, starting with VRP_XX

      // const rpRegex = /^([A-Z]+)$/;
      // const rpMatch = part.match(rpRegex);
      // if (rpMatch) {
      //   const airport = await aerodromeService.get(part);
      //   waypoints.push(rp);
      //   continue;
      // }

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
 * Creates a flight plan from a route string, aircraft registration, and optional route options.
 * 
 * This function parses the route string into waypoints, attaches weather data, finds an alternate aerodrome if not provided,
 * and constructs a flight plan with segments and performance calculations.
 *
 * @param planner - The PlannerService instance used for parsing and finding waypoints.
 * @param routeString - The route string to parse into waypoints.
 * @param aircraftRegistration - The registration of the aircraft to be used in the flight plan.
 * @param options - Optional parameters for the flight plan, including default altitude, departure date, and reserve fuel.
 * @returns A promise that resolves to a RouteTrip object representing the flight plan.
 */
export async function createFlightPlanFromString(
  weatherService: WeatherService,
  aerodromeService: AerodromeService,
  aircrafService: AircraftService,
  routeString: string,
  aircraftRegistration: string,
  options: RouteOptions = {}
): Promise<RouteTrip & { advisory?: Advisory[] }> {
  const waypoints = await parseRouteString(aerodromeService, routeString);
  const lastWaypoint = waypoints[waypoints.length - 1];

  options.aircraft = await aircrafService.findByRegistration(aircraftRegistration)

  await weatherService.attachWeather(waypoints);

  // TODO: Improve this logic to find the alternate aerodrome
  // - Consider factors like runway length, instrument approaches, and services available.
  // - This might involve more complex lookups or integration with additional data sources.
  if (!options.alternate) {
    const alternateRadius = options.alternateRadius ?? 50; // Use option if provided, otherwise default to 50
    const alternateExclude = lastWaypoint.ICAO ? [lastWaypoint.ICAO] : [];
    const alternate = await aerodromeService.nearest(lastWaypoint.location.geometry.coordinates, alternateRadius, alternateExclude);
    if (alternate) {
      await weatherService.attachWeather([alternate]);
      options.alternate = alternate;
    }
  }

  const segments: RouteSegment[] = waypoints.map(waypoint => ({
    waypoint,
    altitude: options.defaultAltitude
  }));

  segments[0].altitude = segments[0].waypoint.elevation;
  segments[segments.length - 1].altitude = segments[segments.length - 1].waypoint.elevation;

  const alternateSegment: RouteSegment | undefined = options.alternate ? {
    waypoint: options.alternate,
    altitude: options.alternate.elevation
  } : undefined;

  const routeTrip = flightPlan(segments, alternateSegment, options.aircraft, options);
  const advisory = routeTripValidate(routeTrip, options.aircraft, options);

  return { ...routeTrip, advisory };
}

/**
 * Generates a flight plan based on the provided route segments, alternate segment, aircraft, and options.
 * 
 * This function calculates the route legs, total distance, duration, fuel consumption, and other performance metrics.
 * It returns a RouteTrip object containing all relevant information about the flight plan.
 *
 * @param segments - An array of RouteSegment objects representing the waypoints and altitudes for the flight.
 * @param alternateSegment - An optional RouteSegment representing an alternate aerodrome for the flight.
 * @param aircraft - The Aircraft object containing performance data for the flight.
 * @param options - Optional parameters for the flight plan, including departure date and reserve fuel duration.
 * @returns A RouteTrip object containing the calculated flight plan details.
 */
export function flightPlan(
  segments: RouteSegment[],
  alternateSegment: RouteSegment | undefined,
  aircraft: Aircraft | undefined,
  options: RouteOptions = {}
): RouteTrip {
  if (segments.length < 2) {
    throw new InsufficientWaypointsError(segments.length);
  }

  const { departureDate = new Date(), reserveFuelDuration = 30, reserveFuel } = options;

  const legs = segments.slice(0, -1).map((startSegment, i) => calculateRouteLeg(startSegment, segments[i + 1], aircraft, departureDate));

  let routeAlternate: RouteLeg | undefined;
  if (alternateSegment) {
    routeAlternate = calculateRouteLeg(segments[segments.length - 1], alternateSegment, aircraft, departureDate);
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
    + (options.takeoffFuel || 0)
    + (options.landingFuel || 0)
    + (options.taxiFuel || 0);

  const fuelBreakdown = {
    trip: Math.round(totalFuelConsumption),
    reserve: Math.round(reserveFuelRequired || 0),
    takeoff: options.takeoffFuel && Math.round(options.takeoffFuel),
    landing: options.landingFuel && Math.round(options.landingFuel),
    taxi: options.taxiFuel && Math.round(options.taxiFuel),
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
 * @param {RouteSegment} startSegment - The starting segment of the leg.
 * @param {RouteSegment} endSegment - The ending segment of the leg.
 * @param {Aircraft} [aircraft] - The aircraft used for performance calculations.
 * @param {Date} departureDate - The departure date from the start of this leg.
 * @returns {RouteLeg} The calculated route leg.
 */
function calculateRouteLeg(
  startSegment: RouteSegment,
  endSegment: RouteSegment,
  aircraft: Aircraft | undefined,
  departureDate: Date
): RouteLeg {
  const course = calculateRouteCourse(startSegment.waypoint, endSegment.waypoint);

  // TODO: 
  // const temperature = startSegment.waypoint.metarStation?.metar.temperature;
  const wind = endSegment.waypoint.metarStation?.metar.wind;

  const performance = aircraft && wind && calculatePerformance(aircraft, course, wind);
  const arrivalDate = performance && new Date(departureDate.getTime() + performance.duration * 60 * 1000);

  return {
    start: startSegment,
    end: endSegment,
    course,
    wind,
    arrivalDate,
    performance,
  };
}

/**
 * Calculates the course vector (distance and track) between two waypoints.
 *
 * @param {Waypoint} startWaypoint - The starting waypoint.
 * @param {Waypoint} endWaypoint - The ending waypoint.
 * @returns {CourseVector} The calculated course vector.
 */
function calculateRouteCourse(startWaypoint: Waypoint, endWaypoint: Waypoint): CourseVector {
  const trueTrack = waypointHeading(startWaypoint, endWaypoint);
  const magneticDeclination = startWaypoint.declination
    || endWaypoint.declination
    || 0;

  return {
    distance: waypointDistance(startWaypoint, endWaypoint),
    track: bearingToAzimuth(trueTrack),
    magneticTrack: bearingToAzimuth(trueTrack - magneticDeclination),
  };
}

/**
 * Calculates aircraft performance for a given course, aircraft, and wind conditions.
 *
 * @param {Aircraft} aircraft - The aircraft for which to calculate performance.
 * @param {CourseVector} course - The course vector (track and distance).
 * @param {Wind} wind - The wind conditions.
 * @returns {RouteLegPerformance | undefined} The calculated aircraft performance, or undefined if essential data is missing.
 */
function calculatePerformance(aircraft: Aircraft, course: CourseVector, wind: Wind): RouteLegPerformance | undefined {
  if (!aircraft.cruiseSpeed) return undefined;

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
