import { Aerodrome, Frequency, ReportingPoint, RunwayWindVector, Waypoint } from "./airport.js";
import { FlightRules, Metar } from "./metar.js";
import { AerodromeService } from "./service.js";
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
  metar: Metar;
  coords: GeoJSON.Position;
}

/**
 * Exports various utility functions and types for flight planning and weather information.
 * 
 * @module flight-planner
 */

/**
 * Weather-related exports including flight rules, METAR data, and formatting functions.
 */
export { FlightRules, Metar };

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export { Waypoint, ReportingPoint, Aerodrome, Frequency, RunwayWindVector };

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { AerodromeService };

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export { RouteOptions, RouteLeg, RouteTrip, planFlightRoute, routeTripWaypoints };
