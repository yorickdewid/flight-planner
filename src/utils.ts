import { Aerodrome, ReportingPoint, Waypoint } from "./airport.js";
import { degreesToRadians, point, radiansToDegrees } from '@turf/turf';
import { AerodromeService } from "./service.js";
import { Wind } from "./metar.js";

/**
 * Represents a wind vector with angle and decomposed components.
 * 
 * @interface WindVector
 * @property {number} angle - The angle of the wind in degrees.
 * @property {number} headwind - The headwind component of the wind vector.
 * @property {number} crosswind - The crosswind component of the wind vector.
 */
export interface WindVector {
  angle: number;
  headwind: number;
  crosswind: number;
}

/**
 * Calculates the wind vector relative to the given true track.
 *
 * @param wind - An object representing the wind, containing direction and speed.
 * @param trueTrack - The current true track in degrees.
 * @returns An object containing the wind angle, headwind, and crosswind components.
 */
export function calculateWindVector(wind: Wind, trueTrack: number): WindVector {
  const windAngle = wind.direction - trueTrack;

  const windAngleRad = degreesToRadians(windAngle);
  const headwind = wind.speed * Math.cos(windAngleRad);
  const crosswind = wind.speed * Math.sin(windAngleRad);

  return {
    angle: windAngle,
    headwind: headwind,
    crosswind: crosswind,
  };
}

/**
 * Calculates the wind correction angle for the given wind, true track, and airspeed.
 *
 * @param wind - An object representing the wind, containing direction and speed.
 * @param trueTrack - The true track in degrees.
 * @param airSpeed - The airspeed in knots.
 * @returns The wind correction angle in degrees.
 */
export function calculateWindCorrectionAngle(wind: Wind, trueTrack: number, airSpeed: number): number {
  // Formula: WCA = arcsin((wind.speed * sin(wind angle)) / airSpeed)
  // const windAngleRad = degreesToRadians(wind.direction - trueTrack);
  // const wcaRad = Math.asin((wind.speed * Math.sin(windAngleRad)) / airSpeed);

  // return radiansToDegrees(wcaRad);
  const windVector = calculateWindVector(wind, trueTrack);
  const wca = radiansToDegrees(windVector.crosswind / airSpeed);

  return windVector.angle > 0 ? -wca : wca; // Positive windAngle means wind from the right
}

/**
 * Calculates the groundspeed for the given wind, airspeed, and heading.
 * 
 * @param wind - An object representing the wind, containing degrees and speed.
 * @param airSpeed - The airspeed in knots.
 * @param heading - The heading in degrees.
 * @returns The groundspeed in knots.
 */
export function calculateGroundspeed(wind: Wind, airSpeed: number, heading: number): number {
  const windVector = calculateWindVector(wind, heading);

  const groundspeedSquared = Math.pow(airSpeed, 2) + Math.pow(wind.speed, 2) - 2 * airSpeed * windVector.headwind;
  return Math.sqrt(groundspeedSquared);
}

// TODO: Remove the async
// TODO: Remove the AerodromeService dependency
/**
 * Parses a route string and returns an array of waypoints.
 * 
 * @param AerodromeRepository - The repository to use for finding airports
 * @param reportingPoints - The list of reporting points to use for finding reporting points
 * @param routeString - The route string to parse
 * @returns A promise that resolves to an array of waypoints
 * @throws Error if the route string contains invalid waypoint formats
 */
export async function parseRouteString(AerodromeRepository: AerodromeService, reportingPoints: Waypoint[], routeString: string): Promise<(Aerodrome | ReportingPoint | Waypoint)[]> {
  const waypoints: (Aerodrome | ReportingPoint | Waypoint)[] = [];
  const routeParts = routeString.toUpperCase().replace(/\s/g, '').split(';');

  // Regular expressions for different waypoint formats
  const airportDesignatorRegex = /^AD\(([A-Z]{4})\)$/;
  const reportingPointRegex = /^RP\(([^)]+)\)$/;
  const waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

  for (const part of routeParts) {
    const airportDesignatorMatch = part.match(airportDesignatorRegex);
    if (airportDesignatorMatch) {
      const icao = airportDesignatorMatch[1];
      const airport = await AerodromeRepository.get(icao);
      if (airport) {
        waypoints.push(airport);
      }
      continue;
    }

    if (isICAO(part)) {
      const airport = await AerodromeRepository.get(part);
      if (airport) {
        waypoints.push(airport);
      }
      continue;
    }

    const reportingPointMatch = part.match(reportingPointRegex);
    if (reportingPointMatch) {
      const name = reportingPointMatch[1];
      const reportingPoint = reportingPoints.find(rp => rp.name.toUpperCase() === name);
      if (reportingPoint) {
        waypoints.push(reportingPoint);
      }
      continue;
    }

    const waypointMatch = part.match(waypointRegex);
    if (waypointMatch) {
      const lat = parseFloat(waypointMatch[1]);
      const lng = parseFloat(waypointMatch[2]);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid coordinates in waypoint: ${part}`);
      }
      waypoints.push(new Waypoint("<WP>", point([lng, lat])));
      continue;
    }
  }

  return waypoints;
}

/**
 * Checks if the given string is a valid ICAO code.
 * 
 * @param icao - The string to check
 * @returns True if the string is a valid ICAO code, false otherwise
 */
export function isICAO(icao: string): boolean {
  return /^[A-Z]{4}$/.test(normalizeICAO(icao));
}

/**
 * Normalizes the given ICAO code to uppercase.
 * 
 * @param icao - The ICAO code to normalize
 * @returns The normalized ICAO code
 */
export function normalizeICAO(icao: string): string {
  return icao.toUpperCase();
}
