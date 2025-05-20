import RepositoryBase from "./repository.js";
import AerodromeService from "./services/aerodrome.js";
import WeatherService from "./services/weather.js";
import { UnitOptions } from "./units.js";

/**
 * Represents an ICAO (International Civil Aviation Organization) identifier,
 * typically used for airports, navigation aids, or weather stations.
 * @type {string}
 */
export type ICAO = string;

/**
 * Standard atmospheric pressure at sea level in hectopascals (hPa).
 * @constant {number}
 */
export const StandardPressure = 1013.25;

/**
 * Standard atmospheric temperature at sea level in Celsius.
 * @constant {number}
 */
export const StandardTemperature = 15;

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

export { normalizeICAO, isICAO, isIATA, normalizeIATA, isAircraftRegistration, normalizeAircraftRegistration } from "./utils.js";

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export type { MetarStation, FlightRules, Metar } from "./metar.js";
export {
  createMetarFromRaw,
  determineMetarFlightRule,
  calculateMetarTimeElapsed,
  calculateMetarCeiling,
  formatMetarObservationTime,
  isMetarExpired,
  getMetarFlightRuleColor,
  getMetarColorCode,
  formatWind,
  formatVisibility,
  formatClouds
} from "./metar.js";

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export type { Frequency, Runway, RunwayWindVector } from "./waypoint.js";
export { Aerodrome, FrequencyType, ReportingPoint, Waypoint, validateFrequencyType } from "./waypoint.js";

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { RepositoryBase, AerodromeService, WeatherService };

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export type { RouteOptions, RouteLeg, RouteTrip, } from "./planner.js";
export { default as FlightPlanner } from "./planner.js";
