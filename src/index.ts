import { Aerodrome, Frequency, ReportingPoint, RunwayWindVector, Waypoint } from "./airport.js";
import { FlightRules, MetarData } from "./metar.js";
import { AerodromeService, WeatherService } from "./service.js";
import { RouteLeg, RouteOptions, planFlightRoute, RouteTrip, routeTripWaypoints } from "./planner.js";

export type ICAO = string;

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
  metarData: MetarData;
  coords: GeoJSON.Position;
}

/**
 * Represents a repository for aerodrome operations.
 * Defines methods to retrieve aerodrome information from a data store.
 *
 * @interface AerodromeRepository
 * @property {Function} findByICAO - Method to find an aerodrome by its ICAO code.
 */
export interface AerodromeRepository {
  /**
   * Finds an aerodrome by its ICAO code.
   * 
   * @param {string} icao - The ICAO code of the aerodrome to find.
   * @returns {Promise<Aerodrome | undefined>} A promise that resolves to the aerodrome if found, otherwise undefined.
   */
  findByICAO(icao: string): Promise<Aerodrome | undefined>;
}

/**
 * Exports various utility functions and types for flight planning and weather information.
 * 
 * @module flight-planner
 */

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export { FlightRules, MetarData };

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export { Waypoint, ReportingPoint, Aerodrome, Frequency, RunwayWindVector };

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { WeatherService, AerodromeService };

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export { RouteOptions, RouteLeg, RouteTrip, planFlightRoute, routeTripWaypoints };
