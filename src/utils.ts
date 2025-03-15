import { AerodromeRepository } from './index';
import { Aerodrome, ReportingPoint, Waypoint } from "./airport";
import { degreesToRadians, point, radiansToDegrees } from '@turf/turf';

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
 * Represents wind conditions.
 * 
 * @interface Wind
 * @property {number} direction - The direction of the wind in degrees (0-359).
 * @property {number} speed - The speed of the wind in knots.
 */
export interface Wind {
  direction: number;
  speed: number;
}

/**
 * Calculates the wind vector relative to the given heading.
 *
 * @param wind - An object representing the wind, containing degrees and speed.
 * @param heading - The current heading in degrees.
 * @returns An object containing the wind angle, headwind, and crosswind components.
 */
export function calculateWindVector(wind: Wind, heading: number): WindVector { // TODO: heading -> trueTrack
  const windAngle = wind.direction - heading;

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
 * @param wind - An object representing the wind, containing degrees and speed.
 * @param trueTrack - The true track in degrees.
 * @param airSpeed - The airspeed in knots.
 * @returns The wind correction angle in degrees.
 */
export function calculateWindCorrectionAngle(wind: Wind, trueTrack: number, airSpeed: number): number {
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

/**
 * Parses a route string and returns an array of waypoints.
 * 
 * @param AerodromeRepository - The repository to use for finding airports
 * @param reportingPoints - The list of reporting points to use for finding reporting points
 * @param routeString - The route string to parse
 * @returns A promise that resolves to an array of waypoints
 */
export async function parseRouteString(AerodromeRepository: AerodromeRepository, reportingPoints: Waypoint[], routeString: string): Promise<(Aerodrome | ReportingPoint | Waypoint)[]> {
  const waypoints: (Aerodrome | ReportingPoint | Waypoint)[] = [];
  const routeParts = routeString.toUpperCase().replace(/\s/g, '').split(';');

  for (const part of routeParts) {
    if (part.match(/AD\([A-Z]{4}\)/g)) {
      const icao = part.slice(3, -1);
      const airport = await AerodromeRepository.findByICAO(icao);
      if (airport) {
        waypoints.push(airport);
      }
    } else if (isICAO(part)) {
      const airport = await AerodromeRepository.findByICAO(part);
      if (airport) {
        waypoints.push(airport);
      }
    } else if (part.startsWith('RP(') && part.endsWith(')')) { // TODO: use regex
      const name = part.slice(3, -1);
      const reportingPoint = reportingPoints.find(rp => rp.name.toUpperCase() === name); // TODO: Also match no ICAO since reporting points belong to a specific airport
      if (reportingPoint) {
        waypoints.push(reportingPoint);
      }
    } else if (part.startsWith('WP(') && part.endsWith(')')) {
      const coords = part.slice(3, -1).split(',').map(Number);
      if (coords.length === 2) {
        waypoints.push(new Waypoint("<WP>", point(coords)));
      }
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
  return /^[A-Z]{4}$/.test(icao);
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
