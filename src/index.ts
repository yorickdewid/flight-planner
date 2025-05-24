import RepositoryBase from "./repository.js";
import AerodromeService from "./services/aerodrome.js";
import WeatherService from "./services/weather.js";
import { UnitOptions } from "./units.js";

/**
 * Represents an ICAO (International Civil Aviation Organization) identifier,
 * typically used for airports, navigation aids, or weather stations.
 * 
 * @type {string}
 */
export type ICAO = string;

/**
 * Standard atmospheric pressure at sea level in hectopascals (hPa).
 * 
 * @constant {number}
 */
export const ISAStandardPressure = 1013.25;

/**
 * Standard atmospheric pressure lapse rate in the troposphere in hectopascals per meter (hPa/m).
 * 
 * @constant {number}
 */
export const ISAStandardPressureLapseRate = 0.00012;

/**
 * Standard atmospheric temperature at sea level in degrees Celsius (°C).
 * 
 * @constant {number}
 */
export const ISAStandardTemperature = 15;

/**
 * Standard temperature lapse rate in the troposphere in degrees Celsius per meter (°C/m).
 * 
 * @constant {number}
 */
export const ISAStandardTemperatureLapseRate = 0.0065;

/**
 * Enumeration representing different flight rules categories.
 * 
 * @enum {string}
 * @readonly
 * @property {string} VFR - Visual Flight Rules
 * @property {string} MVFR - Marginal Visual Flight Rules
 * @property {string} IFR - Instrument Flight Rules
 * @property {string} LIFR - Low Instrument Flight Rules
 */
export enum FlightRules {
  VFR = 'VFR',
  MVFR = 'MVFR',
  IFR = 'IFR',
  LIFR = 'LIFR',
}

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

/**
 * Exports various utility functions and types for flight planning and weather information.
 * 
 * @module flight-planner
 */

export { normalizeICAO, isICAO, isIATA, normalizeIATA } from "./utils.js";

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export type { MetarStation, Metar } from "./metar.js";
export {
  createMetarFromString,
  metarFlightRule,
  metarCeiling,
  isMetarExpired,
  metarFlightRuleColor,
  metarColorCode,
} from "./metar.js";

/**
 * Formatting exports
 */
export { formatWind, formatVisibility, formatClouds } from "./format.js";

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export type { Frequency, Runway, RunwayWindVector } from "./waypoint.js";
export { Aerodrome, FrequencyType, VisualReportingPoint, RunwaySurface, Waypoint, validateFrequencyType } from "./waypoint.js";

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { RepositoryBase, AerodromeService, WeatherService };

/**
 * Aircraft-related exports including aircraft types, registration normalization, and aircraft service.
 */
export * from "./services/aircraft.js";

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export type { RouteOptions, RouteLeg, RouteTrip, } from "./planner.js";
export { default as FlightPlanner } from "./planner.js";
