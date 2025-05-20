import { DefaultUnits } from "./index.js";
import {
  convertAltitude,
  convertDistance,
  convertElevation,
  convertMass,
  convertPressure,
  convertSpeed,
  convertTemperature,
  convertVolume,
  UnitOptions
} from "./units.js";

/**
 * Formats speed to a string with the specified or default units.
 * 
 * @param {number} speed - The speed value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted speed string.
 */
export const formatSpeed = (speed: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertSpeed(speed, units))} kt`;
}

/**
 * Formats distance to a string with the specified or default units.
 * 
 * @param {number} distance - The distance value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted distance string.
 */
export const formatDistance = (distance: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertDistance(distance, units))} nm`;
}

/**
 * Formats altitude to a string with the specified or default units.
 * @param {number} altitude - The altitude value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted altitude string.
 */
export const formatAltitude = (altitude: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertAltitude(altitude, units))} ft`;
}

/**
 * Formats elevation to a string with the specified or default units.
 * 
 * @param {number} elevation - The elevation value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted elevation string.
 */
export const formatElevation = (elevation: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertElevation(elevation, units))} ft`;
}

/**
 * Formats temperature to a string with the specified or default units.
 * 
 * @param {number} temperature - The temperature value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted temperature string.
 */
export const formatTemperature = (temperature: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertTemperature(temperature, units))}°C`;
}

/**
 * Formats pressure to a string with the specified or default units.
 * 
 * @param {number} pressure - The pressure value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted pressure string.
 */
export const formatPressure = (pressure: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertPressure(pressure, units)} hPa`;
}

/**
 * Formats mass to a string with the specified or default units.
 * 
 * @param {number} mass - The mass value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted mass string.
 */
export const formatMass = (mass: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertMass(mass, units)} kg`;
}

/**
 * Formats volume to a string with the specified or default units.
 * 
 * @param {number} volume - The volume value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted volume string.
 */
export const formatVolume = (volume: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertVolume(volume, units))} L`;
}

/**
 * Formats angle to a string with the specified or default units.
 * 
 * @param {number} angle - The angle value.
  * @returns {string} The formatted angle string.
 */
export const formatAngle = (angle: number): string => {
  return `${Math.round(angle)}°`;
}

/**
 * Formats date and time to a string in UTC format.
 * 
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string in UTC format.
 */
export const formatUTCTimestamp = (date: Date): string => {
  return date.toUTCString().replace(/ GMT$/, ' UTC');
}
