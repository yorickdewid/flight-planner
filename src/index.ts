import {
  ISA_STANDARD_PRESSURE_HPA,
  ISA_STANDARD_PRESSURE_LAPSE_RATE,
  ISA_STANDARD_TEMPERATURE_CELSIUS,
  ISA_STANDARD_TEMPERATURE_LAPSE_RATE,
  DefaultUnits
} from "./constants.js";

/**
 * Flight planning library for aviation applications.
 *
 * @module flight-planner
 */

// =============================================================================
// CORE TYPES AND CONSTANTS
// =============================================================================

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

/**
 * International Standard Atmosphere (ISA) constants and default units.
 */
export {
  ISA_STANDARD_PRESSURE_HPA,
  ISA_STANDARD_PRESSURE_LAPSE_RATE,
  ISA_STANDARD_TEMPERATURE_CELSIUS,
  ISA_STANDARD_TEMPERATURE_LAPSE_RATE,
  DefaultUnits
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility functions for identifier normalization and validation.
 */
export { normalizeICAO, isICAO, isIATA, normalizeIATA } from "./utils.js";

// =============================================================================
// WEATHER & METAR
// =============================================================================

/**
 * Weather-related types and data structures.
 */
export type { MetarStation, Metar } from "./metar.types.js";

/**
 * METAR parsing and weather data functions.
 */
export * from "./metar.js";

/**
 * Weather data formatting functions.
 */
export { formatWind, formatVisibility, formatCloud } from "./format.js";

// =============================================================================
// NOTAM
// =============================================================================

export type { Notam, NotamCoordinates, NotamSchedule } from "./notam.types.js";
export { NotamType, NotamScope, NotamPriority } from "./notam.types.js";

// =============================================================================
// WAYPOINTS & AERODROMES
// =============================================================================

/**
 * Waypoint, airport, and navigation-related types.
 */
export type * from "./waypoint.types.js";
export { RunwaySurface, FrequencyType, WaypointVariant } from "./waypoint.types.js";

/**
 * Waypoint and airport utility functions.
 */
export { validateFrequencyType, calculateRunwayWindVector } from "./waypoint.js";

// =============================================================================
// SUN CALCULATIONS
// =============================================================================

/**
 * Sun event calculations and daylight/night determination functions.
 */
export { calculateSunEvents, isDaylight, isNight } from "./sun.js";

// =============================================================================
// FLIGHT PLANNING & ROUTES
// =============================================================================

/**
 * Route planning types and data structures.
 */
export type { RouteOptions, RouteLeg, RouteTrip, WaypointType, RouteSegment, NavLogOptions } from "./navigation.types.js";

/**
 * Navigation log calculation and route analysis functions.
 */
export {
  routeTripWaypoints,
  routeTripDepartureWaypoint,
  routeTripArrivalWaypoint,
  waypointsToSegments,
  calculateNavLog
} from "./navigation.js";

/**
 * Route validation and advisory functions.
 */
export type { Advisory } from "./advisor.js";
export { routeTripValidate, advisoryHasErrors } from "./advisor.js";
