import { degreesToRadians, radiansToDegrees } from '@turf/turf';
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

  const cosAngle = Math.cos(windAngleRad);
  const sinAngle = Math.sin(windAngleRad);

  const headwind = wind.speed * cosAngle;
  const crosswind = wind.speed * sinAngle;

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

/**
 * Checks if the given string is a valid ICAO code.
 * 
 * @param icao - The string to check
 * @returns True if the string is a valid ICAO code, false otherwise
 */
export const isICAO = (icao: string): boolean => {
  return /^[A-Z]{4}$/.test(normalizeICAO(icao));
}

/**
 * Normalizes the given ICAO code to uppercase.
 * 
 * @param icao - The ICAO code to normalize
 * @returns The normalized ICAO code
 */
export const normalizeICAO = (icao: string): string => {
  return icao.toUpperCase();
}

/**
 * Normalizes the given track angle to a value between 0 and 360 degrees.
 * 
 * @param track - The track angle to normalize
 * @returns The normalized track angle
 */
export const normalizeTrack = (track: number): number => {
  return ((track % 360) + 360) % 360;
}

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text - The input text to capitalize
 * @returns The text with the first letter of each word capitalized
 */
export const capitalizeWords = (text: string): string => {
  return text.toLowerCase()
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats the time duration in a human-readable format.
 * 
 * @param totalMinutes - The total duration in minutes.
 * @returns A string representing the duration, e.g., "1h 30min" or "45 min", or "N/A" if input is invalid.
 */
export const formatDuration = (totalMinutes?: number): string => {
  if (totalMinutes === undefined || totalMinutes === null || typeof totalMinutes !== 'number' || totalMinutes < 0) {
    return "N/A";
  }

  const roundedMinutes = Math.round(totalMinutes);

  if (roundedMinutes === 0) {
    return "0 min";
  }

  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}min`;
  } else {
    return `${roundedMinutes} min`;
  }
}