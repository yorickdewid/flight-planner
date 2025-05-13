import { Metar } from "./metar.js";
import RepositoryBase from "./repository.js";
import AerodromeService from "./aerodrome-service.js";
import WeatherService from "./weather-service.js";
import FlightPlanner, { RouteLeg, RouteOptions, RouteTrip } from "./planner.js";
import { Angle, Distance, Mass, Pressure, Speed, Temperature, Volume } from "convert-units";

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
 * Represents a METAR (Meteorological Aerodrome Report) station.
 *
 * @interface MetarStation
 * @property {ICAO} station - The ICAO identifier for the METAR station.
 * @property {Metar} metar - The METAR data associated with the station.
 * @property {GeoJSON.Position} coords - The geographical coordinates of the station.
 */
export interface MetarStation {
  station: ICAO;
  metar: Metar;
  coords: GeoJSON.Position;
}

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
  temperature?: Temperature;
  pressure?: Pressure;
  mass?: Mass;
  volume?: Volume;
  angle?: Angle;
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

export { normalizeICAO, isICAO } from "./utils.js";

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export type { FlightRules, Metar } from "./metar.js";
export {
  createMetarFromRaw,
  determineMetarFlightRule,
  getMetarFlightRuleColor,
  getMetarColorCode,
  formatMetarCeiling,
  formatWind,
  formatTemperature,
  formatVisibility,
  formatQNH,
  formatClouds
} from "./metar.js";

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export type { Aerodrome, Frequency, ReportingPoint, Runway, RunwayWindVector, Waypoint, FrequencyType } from "./airport.js";
export { validateFrequencyType } from "./airport.js";

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { RepositoryBase, AerodromeService, WeatherService };

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export type { RouteOptions, RouteLeg, RouteTrip, FlightPlanner };
