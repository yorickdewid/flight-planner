import { UnitOptions } from "./units.js";

/**
 * Standard atmospheric pressure at sea level in hectopascals (hPa).
 * 
 * @constant {number}
 */
export const ISA_STANDARD_PRESSURE_HPA = 1013.25;

/**
 * Standard atmospheric pressure lapse rate in the troposphere in hectopascals per meter (hPa/m).
 * 
 * @constant {number}
 */
export const ISA_STANDARD_PRESSURE_LAPSE_RATE = 0.00012;

/**
 * Standard atmospheric temperature at sea level in degrees Celsius (°C).
 * 
 * @constant {number}
 */
export const ISA_STANDARD_TEMPERATURE_CELSIUS = 15;

/**
 * Standard temperature lapse rate in the troposphere in degrees Celsius per meter (°C/m).
 * 
 * @constant {number}
 */
export const ISA_STANDARD_TEMPERATURE_LAPSE_RATE = 0.0065;

/**
 * Default unit settings used throughout the application when specific units aren't provided.
 * Uses nautical miles for distance, knots for speed, feet for altitude, Celsius for temperature,
 * hectopascals for pressure, kilograms for weight, liters for volume, and degrees for angles.
 * 
 * @constant {UnitOptions}
 */
export const DefaultUnits: UnitOptions = {
  speed: 'knot',
  distance: 'mi',
  altitude: 'ft',
  elevation: 'ft',
  temperature: 'C',
  pressure: 'hPa',
  mass: 'kg',
  volume: 'l',
  angle: 'deg',
};
