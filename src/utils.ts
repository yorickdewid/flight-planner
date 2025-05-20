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
 * Checks if the given string is a valid IATA code.
 *
 * @param iata - The string to check
 * @returns True if the string is a valid IATA code, false otherwise
 */
export const isIATA = (iata: string): boolean => {
  return /^[A-Z]{3}$/.test(normalizeIATA(iata));
}

/**
 * Normalizes the given IATA code to uppercase.
 * 
 * @param iata - The IATA code to normalize
 * @returns The normalized IATA code
 */
export const normalizeIATA = (iata: string): string => {
  return iata.toUpperCase();
}

/**
 * Checks if the given string is a valid aircraft registration.
 * 
 * @param registration - The string to check
 * @returns True if the string is a valid aircraft registration, false otherwise
 */
export const isAircraftRegistration = (registration: string): boolean => {
  return /^[A-Z0-9]{1,3}-?[A-Z0-9]+$/.test(registration.toUpperCase());
}

/**
 * Normalizes the given aircraft registration to uppercase.
 *
 * @param registration - The aircraft registration to normalize
 * @returns The normalized aircraft registration
 */
export const normalizeAircraftRegistration = (registration: string): string => {
  return registration.toUpperCase().replace(/-/g, '');
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
