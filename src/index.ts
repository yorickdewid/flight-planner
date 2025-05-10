import { createMetarFromRaw, FlightRules, Metar } from "./metar.js";
import RepositoryBase from "./repository.js";
import AerodromeService from "./aerodrome-service.js";
import WeatherService from "./weather-service.js";
import FlightPlanner, { RouteLeg, RouteOptions, RouteTrip } from "./planner.js";

export type ICAO = string;

export const StandardPressure = 1013.25; // hPa
export const StandardTemperature = 15; // Celsius

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
 * @property {string} station - The identifier for the METAR station.
 * @property {MetarData} metarData - The METAR data associated with the station.
 * @property {string} [rawTaf] - The raw TAF (Terminal Aerodrome Forecast) data, if available.
 * @property {GeoJSON.Position} coords - The geographical location of the station.
 */
export interface MetarStation {
  station: ICAO;
  metar: Metar;
  coords: GeoJSON.Position;
}

/**
 * Exports various utility functions and types for flight planning and weather information.
 * 
 * @module flight-planner
 */

export { normalizeICAO, isICAO } from "./utils.js";

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export { FlightRules, Metar, createMetarFromRaw };

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export { Aerodrome, Frequency, ReportingPoint, Runway, RunwayWindVector, Waypoint, validateFrequencyType } from "./airport.js";

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { RepositoryBase, AerodromeService, WeatherService };

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export { RouteOptions, RouteLeg, RouteTrip, FlightPlanner };
