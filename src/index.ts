import AerodromeService from "./services/aerodrome.js";
import WeatherService from "./services/weather.js";
import {
  ISA_STANDARD_PRESSURE_HPA,
  ISA_STANDARD_PRESSURE_LAPSE_RATE,
  ISA_STANDARD_TEMPERATURE_CELSIUS,
  ISA_STANDARD_TEMPERATURE_LAPSE_RATE,
  DefaultUnits
} from "./constants.js";

/**
 * Represents an ICAO (International Civil Aviation Organization) identifier,
 * typically used for airports, navigation aids, or weather stations.
 * 
 * @type {string}
 */
export type ICAO = string;

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

export {
  ISA_STANDARD_PRESSURE_HPA,
  ISA_STANDARD_PRESSURE_LAPSE_RATE,
  ISA_STANDARD_TEMPERATURE_CELSIUS,
  ISA_STANDARD_TEMPERATURE_LAPSE_RATE,
  DefaultUnits
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
export type { MetarStation, Metar } from "./metar.types.js";
export * from "./metar.js";

/**
 * Formatting exports
 */
export { formatWind, formatVisibility, formatCloud } from "./format.js";

/**
 * Airport and navigation-related exports including waypoints, reporting points, and airport information.
 */
export type * from "./waypoint.types.js";
export { RunwaySurface, FrequencyType, WaypointVariant } from "./waypoint.types.js";
export { validateFrequencyType, calculateRunwayWindVector } from "./waypoint.js";

/**
 * Service-related exports for handling weather and aerodrome data.
 */
export { AerodromeService, WeatherService };
export { default as PlannerService } from "./services/index.js";

/**
 * Aircraft-related exports including aircraft types, registration normalization, and aircraft service.
 */
export type { AircraftRepository } from "./repositories/aircraft.repository.js";
export { default as AircraftService } from "./services/aircraft.js";

/**
 * Route planning exports including route options, legs, trips, and planning functions.
 */
export type { RouteOptions, RouteLeg, RouteTrip, } from "./planner.js";
export {
  routeTripWaypoints,
  routeTripDepartureWaypoint,
  routeTripArrivalWaypoint,
  createFlightPlanFromString,
  flightPlan
} from "./planner.js";

/**
 * Route plan advisory exports including validation and error checking for route trips.
 */
export type { Advisory } from "./advisor.js";
export { routeTripValidate, advisoryHasErrors } from "./advisor.js";