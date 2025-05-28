import { degreesToRadians, radiansToDegrees } from '@turf/turf';
import { Cloud, Wind } from "./metar.js";
import { ISA_STANDARD_PRESSURE_HPA } from './index.js';
import convert from 'convert-units';

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
export const calculateWindVector = (wind: Wind, trueTrack: number): WindVector => {
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

// export function calculateTrueAirspeed(altitude: number, speed: number, qnh: number): number {
//   const pressureAltitude = altitude - ((qnh - ISAStandardPressure) * 27.3);
//   const staticPressure = ISAStandardPressure - (1 - 6.87535 * 10 ^ -6 * pressureAltitude);
//   const outsideAirTemperature = (ISAStandardTemperature - (1.98 * (altitude / 1000))); // TODO: Altitude may need to be pressure altitude
//   const airDensity = calculateAirDensity(outsideAirTemperature, staticPressure);

//   const trueAirspeed = speed * Math.sqrt(1.225 / airDensity);
//   return trueAirspeed;
// }

// --- Constants (ideally in a separate file) ---
const SPECIFIC_GAS_CONSTANT_DRY_AIR = 287.05; // J/(kg·K)
const STANDARD_SEA_LEVEL_DENSITY = 1.225; // kg/m^3
// const TEMP_LAPSE_RATE_C_PER_1000_FT = 1.98;
const FT_PER_HPA_APPROX = 27.3;

const convertPressureAltitudeToStaticPressureHpa = (pressureAltitudeFt: number): number => {
  // Standard formula for pressure from ICAO Standard Atmosphere
  const tempRatio = 1 - (0.0065 * (pressureAltitudeFt * 0.3048)) / 288.15;
  return ISA_STANDARD_PRESSURE_HPA * Math.pow(tempRatio, 5.25588);
}

/**
 * Calculates air density.
 * 
 * @param oatCelsius Outside Air Temperature in Celsius.
 * @param staticPressureHpa Static air pressure in hPa.
 * @returns Air density in kg/m^3.
 */
const calculateAirDensity = (oatCelsius: number, staticPressureHpa: number): number => {
  const T_kelvin = convert(oatCelsius).from('C').to('K');
  const P_pascals = staticPressureHpa * 100;
  return P_pascals / (SPECIFIC_GAS_CONSTANT_DRY_AIR * T_kelvin);
}

/**
 * Calculates True Airspeed.
 * 
 * @param indicatedAltitudeFt Indicated altitude in feet.
 * @param qnhHpa Altimeter setting in hPa.
 * @param oatCelsius Outside Air Temperature in Celsius.
 * @param kcas Knots Calibrated Airspeed (or KEAS if compressibility is negligible).
 * @returns Knots True Airspeed.
 */
export const calculateTrueAirspeed = (
  indicatedAltitudeFt: number,
  qnhHpa: number,
  oatCelsius: number,
  kcas: number // Assuming this is KCAS; for low speeds, KEAS approx KCAS
): number => {
  const pressureDiffHpa = qnhHpa - ISA_STANDARD_PRESSURE_HPA;
  const pressureAltitudeFt = indicatedAltitudeFt - (pressureDiffHpa * FT_PER_HPA_APPROX);

  const staticPressureHpa = convertPressureAltitudeToStaticPressureHpa(pressureAltitudeFt);
  const airDensityKgM3 = calculateAirDensity(oatCelsius, staticPressureHpa);

  // For simplicity here, assuming KEAS approx = KCAS.
  // A full solution might add a KCAS -> KEAS step.
  const keas = kcas;

  const trueAirspeed = keas * Math.sqrt(STANDARD_SEA_LEVEL_DENSITY / airDensityKgM3);
  return trueAirspeed;
}

/**
 * Calculates the wind correction angle for the given wind, true track, and airspeed.
 *
 * @param wind - An object representing the wind, containing direction and speed.
 * @param trueTrack - The true track in degrees.
 * @param airSpeed - The airspeed in knots.
 * @returns The wind correction angle in degrees.
 */
export const calculateWindCorrectionAngle = (wind: Wind, trueTrack: number, airSpeed: number): number => {
  const windVector = calculateWindVector(wind, trueTrack);
  const wcaInRadians = Math.asin(windVector.crosswind / airSpeed);
  const wca = radiansToDegrees(wcaInRadians);

  return wca; // Positive WCA means wind from the right
}

/**
 * Calculates the groundspeed for the given wind, airspeed, and heading.
 * 
 * @param wind - An object representing the wind, containing degrees and speed.
 * @param airSpeed - The airspeed in knots.
 * @param heading - The heading in degrees.
 * @returns The groundspeed in knots.
 */
export const calculateGroundspeed = (wind: Wind, airSpeed: number, heading: number): number => {
  const windVector = calculateWindVector(wind, heading);

  const groundspeedSquared = Math.pow(airSpeed, 2) + Math.pow(wind.speed, 2) - 2 * airSpeed * windVector.headwind;
  return Math.sqrt(groundspeedSquared);
}

/**
 * Sorts an array of clouds by their height in ascending order.
 * 
 * @param clouds - The array of clouds to sort
 * @returns The sorted array of clouds
 */
export const sortClouds = (clouds: Cloud[]): Cloud[] => {
  if (!clouds || clouds.length === 0) return [];
  return clouds.sort((a, b) => {
    if (a.height === undefined) return 1;
    if (b.height === undefined) return -1;
    return a.height - b.height;
  });
}

/**
 * Checks if the given string is a valid ICAO code.
 * 
 * @param icao - The string to check
 * @returns True if the string is a valid ICAO code, false otherwise
 */
export const isICAO = (icao: string): boolean => {
  return /^[A-Z]{4}$/.test(icao.toUpperCase());
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
  return /^[A-Z]{3}$/.test(iata.toUpperCase());
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
