import { parseMetar } from "metar-taf-parser";
import { Aerodrome, Frequency, ReportingPoint, RunwayWindVector, Waypoint } from "./airport.js";
import { FlightRules, colorizeFlightRules, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind, fromIMetar, MetarData } from "./metar.js";
import { AerodromeService, WeatherService } from "./service.js";
import { RouteLeg, RouteOptions, planFlightRoute, RouteTrip, routeTripWaypoints } from "./planner.js";

/**
 * Represents a METAR (Meteorological Aerodrome Report) station.
 *
 * @interface MetarStation
 * @property {string} station - The identifier for the METAR station.
 * @property {MetarData} metarData - The METAR data associated with the station.
 * @property {string} [rawTaf] - The raw TAF (Terminal Aerodrome Forecast) data, if available.
 * @property {GeoJSON.Feature<GeoJSON.Point>} location - The geographical location of the station.
 * @todo Change location type to GeoJSON.Position
 */
export interface MetarStation {
  station: string;
  metarData: MetarData;
  rawTaf?: string;
  location: GeoJSON.Feature<GeoJSON.Point>; // TOOD: Change to GeoJSON.Position
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
export { FlightRules, MetarData, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind, colorizeFlightRules };

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
