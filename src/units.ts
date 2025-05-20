import convert from "convert-units";
import { Angle, Distance, Mass, Pressure, Speed, Temperature, Volume } from "convert-units";
import { DefaultUnits } from "./index.js";

/**
 * Defines unit preferences for various measurements used in flight planning.
 * 
 * @interface UnitOptions
 * @property {UnitSpeed} [speed='kts'] - Unit for speed measurements (knots, kilometers per hour, miles per hour, or meters per second).
 * @property {UnitDistance} [distance='nm'] - Unit for distance measurements (nautical miles, kilometers, or miles).
 * @property {UnitAltitude} [altitude='ft'] - Unit for altitude measurements (feet or meters).
 * @property {UnitTemperature} [temperature='C'] - Unit for temperature measurements (Celsius or Fahrenheit).
 * @property {UnitPressure} [pressure='hPa'] - Unit for pressure measurements (hectopascals or inches of mercury).
 * @property {UnitWeight} [weight='kg'] - Unit for weight measurements (kilograms or pounds).
 * @property {UnitVolume} [volume='l'] - Unit for volume measurements (liters or gallons).
 * @property {UnitAngle} [angle='deg'] - Unit for angular measurements (degrees or radians).
 */
export interface UnitOptions {
  speed?: Speed;
  distance?: Distance;
  altitude?: Distance;
  elevation?: Distance;
  temperature?: Temperature;
  pressure?: Pressure;
  mass?: Mass;
  volume?: Volume;
  angle?: Angle;
}

/**
 * Converts speed from default units to the specified units.
 * @param {number} speed - The speed value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted speed.
 */
export const convertSpeed = (speed: number, units: UnitOptions): number => {
  return convert(speed).from(DefaultUnits.speed!).to(units.speed || DefaultUnits.speed!);
}

/**
 * Converts elevation from default units to the specified units.
 * @param {number} elevation - The elevation value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted elevation.
 */
export const convertElevation = (elevation: number, units: UnitOptions): number => {
  return convert(elevation).from(DefaultUnits.elevation!).to(units.elevation || DefaultUnits.elevation!);
}

/**
 * Formats elevation to a string with the specified or default units.
 * @param {number} elevation - The elevation value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted elevation string.
 */
export const formatElevation = (elevation: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertElevation(elevation, units))} ft`;
}

/**
 * Converts altitude from default units to the specified units.
 * @param {number} altitude - The altitude value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted altitude.
 */
export const convertAltitude = (altitude: number, units: UnitOptions): number => {
  return convert(altitude).from(DefaultUnits.altitude!).to(units.altitude || DefaultUnits.altitude!);
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
 * Converts temperature from default units to the specified units.
 * @param {number} temperature - The temperature value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted temperature.
 */
export const convertTemperature = (temperature: number, units: UnitOptions): number => {
  return convert(temperature).from(DefaultUnits.temperature!).to(units.temperature || DefaultUnits.temperature!);
}

/**
 * Formats temperature to a string with the specified or default units.
 * @param {number} temperature - The temperature value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted temperature string.
 */
export const formatTemperature = (temperature: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertTemperature(temperature, units))}°C`;
}

/**
 * Converts pressure from default units to the specified units.
 * @param {number} pressure - The pressure value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted pressure.
 */
export const convertPressure = (pressure: number, units: UnitOptions): number => {
  return convert(pressure).from(DefaultUnits.pressure!).to(units.pressure || DefaultUnits.pressure!);
}

/**
 * Formats pressure to a string with the specified or default units.
 * @param {number} pressure - The pressure value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted pressure string.
 */
export const formatPressure = (pressure: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertPressure(pressure, units)} hPa`;
}

/**
 * Converts distance from default units to the specified units.
 * @param {number} distance - The distance value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted distance.
 */
export const convertDistance = (distance: number, units: UnitOptions): number => {
  return convert(distance).from(DefaultUnits.distance!).to(units.distance || DefaultUnits.distance!);
}

/**
 * Formats distance to a string with the specified or default units.
 * @param {number} distance - The distance value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted distance string.
 */
export const formatDistance = (distance: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertDistance(distance, units))} nm`;
}

/**
 * Converts mass from default units to the specified units.
 * @param {number} mass - The mass value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted mass.
 */
export const convertMass = (mass: number, units: UnitOptions): number => {
  return convert(mass).from(DefaultUnits.mass!).to(units.mass || DefaultUnits.mass!);
}

/**
 * Formats mass to a string with the specified or default units.
 * @param {number} mass - The mass value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted mass string.
 */
export const formatMass = (mass: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertMass(mass, units)} kg`;
}