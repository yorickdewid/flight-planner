import convert from "convert-units";
import { Angle, Distance, Mass, Pressure, Speed, Temperature, Volume } from "convert-units";
import { DefaultUnits } from "./constants.js";

/**
 * Nautical miles to kilometers conversion factor (exact).
 */
const NM_TO_KM = 1.852;

/**
 * Distance unit type that extends convert-units Distance with nautical miles ('nmi'),
 * which is not natively supported by convert-units v2.
 */
export type AviationDistance = Distance | 'nmi';

/**
 * Defines unit preferences for various measurements used in flight planning.
 *
 * @interface UnitOptions
 * @property {Speed} [speed='knot'] - Unit for speed measurements (knots, kilometers per hour, miles per hour, or meters per second).
 * @property {AviationDistance} [distance='nmi'] - Unit for distance measurements (nautical miles, kilometers, or miles).
 * @property {Distance} [runway='m'] - Unit for runway length measurements (meters or feet).
 * @property {Distance} [altitude='ft'] - Unit for altitude measurements (feet or meters).
 * @property {Distance} [elevation='ft'] - Unit for elevation measurements (feet or meters).
 * @property {Temperature} [temperature='C'] - Unit for temperature measurements (Celsius or Fahrenheit).
 * @property {Pressure} [pressure='hPa'] - Unit for pressure measurements (hectopascals or inches of mercury).
 * @property {Mass} [mass='kg'] - Unit for weight measurements (kilograms or pounds).
 * @property {Volume} [volume='l'] - Unit for volume measurements (liters or gallons).
 * @property {Angle} [angle='deg'] - Unit for angular measurements (degrees or radians).
 */
export interface UnitOptions {
  speed?: Speed;
  distance?: AviationDistance;
  runway?: Distance;
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
 *
 * @param {number} speed - The speed value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted speed.
 */
export const convertSpeed = (speed: number, units: UnitOptions): number => {
  return convert(speed).from(DefaultUnits.speed!).to(units.speed || DefaultUnits.speed!);
}

/**
 * Converts elevation from default units to the specified units.
 *
 * @param {number} elevation - The elevation value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted elevation.
 */
export const convertElevation = (elevation: number, units: UnitOptions): number => {
  return convert(elevation).from(DefaultUnits.elevation!).to(units.elevation || DefaultUnits.elevation!);
}

/**
 * Converts altitude from default units to the specified units.
 *
 * @param {number} altitude - The altitude value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted altitude.
 */
export const convertAltitude = (altitude: number, units: UnitOptions): number => {
  return convert(altitude).from(DefaultUnits.altitude!).to(units.altitude || DefaultUnits.altitude!);
}

/**
 * Converts temperature from default units to the specified units.
 *
 * @param {number} temperature - The temperature value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted temperature.
 */
export const convertTemperature = (temperature: number, units: UnitOptions): number => {
  return convert(temperature).from(DefaultUnits.temperature!).to(units.temperature || DefaultUnits.temperature!);
}

/**
 * Converts pressure from default units to the specified units.
 *
 * @param {number} pressure - The pressure value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted pressure.
 */
export const convertPressure = (pressure: number, units: UnitOptions): number => {
  return convert(pressure).from(DefaultUnits.pressure!).to(units.pressure || DefaultUnits.pressure!);
}

/**
 * Converts distance from default units to the specified units.
 *
 * @param {number} distance - The distance value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted distance.
 */
export const convertDistance = (distance: number, units: UnitOptions): number => {
  const from = DefaultUnits.distance!;
  const to = units.distance || DefaultUnits.distance!;

  if (from === to) return distance;

  // Convert from source to km as intermediate unit
  const inKm = from === 'nmi' ? distance * NM_TO_KM : convert(distance).from(from as Distance).to('km');
  // Convert from km to target unit
  if (to === 'nmi') return inKm / NM_TO_KM;
  return convert(inKm).from('km').to(to as Distance);
}

/**
 * Converts mass from default units to the specified units.
 *
 * @param {number} mass - The mass value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted mass.
 */
export const convertMass = (mass: number, units: UnitOptions): number => {
  return convert(mass).from(DefaultUnits.mass!).to(units.mass || DefaultUnits.mass!);
}

/**
 * Converts volume from default units to the specified units.
 *
 * @param {number} volume - The volume value to convert.
 * @param {UnitOptions} units - The target unit options.
 * @returns {number} The converted volume.
 */
export const convertVolume = (volume: number, units: UnitOptions): number => {
  return convert(volume).from(DefaultUnits.volume!).to(units.volume || DefaultUnits.volume!);
}
