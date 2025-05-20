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
 * Represents an aircraft with its specifications and characteristics.
 * 
 * @interface Aircraft
 * @property {string} [manufacturer] - The manufacturer of the aircraft.
 * @property {string} [model] - The model of the aircraft.
 * @property {string} [registration] - The registration identifier of the aircraft.
 * @property {number} [numberOfEngines] - The number of engines the aircraft has.
 * @property {string[]} [avionics] - Array of avionics systems (e.g., 'Garmin G1000', 'Bendix King').
 * @property {number} [cruiseSpeed] - The cruising speed of the aircraft in knots.
 * @property {number} [range] - The maximum range of the aircraft in nautical miles.
 * @property {number} [fuelCapacity] - The fuel capacity of the aircraft in liters.
 * @property {number} [fuelConsumption] - The fuel consumption rate in liters per hour.
 * @property {'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft'} [engineType] - The type of engine used in the aircraft.
 * @property {number} [maxTakeoffWeight] - The maximum takeoff weight of the aircraft in kilograms.
 */
export interface Aircraft {
  manufacturer?: string;
  model?: string;
  registration?: string;
  numberOfEngines?: number;
  avionics?: string[]; // array of avionics systems (e.g., 'Garmin G1000', 'Bendix King')
  cruiseSpeed?: number; // in knots
  range?: number; // in nautical miles
  fuelCapacity?: number; // in liters
  fuelConsumption?: number; // in liters per hour
  engineType?: 'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft';
  maxTakeoffWeight?: number; // in kilograms
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

export { normalizeICAO, isICAO, isIATA, normalizeIATA, isRegistration, normalizeRegistration } from "./utils.js";

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
