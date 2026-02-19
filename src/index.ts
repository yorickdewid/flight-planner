/**
 * Flight planning library for aviation applications.
 *
 * @module flight-planner
 */

// =============================================================================
// CORE TYPES AND CONSTANTS
// =============================================================================

export type { ICAO } from "./constants.js";
export {
  ISA_STANDARD_PRESSURE_HPA,
  ISA_STANDARD_PRESSURE_LAPSE_RATE,
  ISA_STANDARD_TEMPERATURE_CELSIUS,
  ISA_STANDARD_TEMPERATURE_LAPSE_RATE,
  DefaultUnits
} from "./constants.js";

export { FlightRules } from "./metar.types.js";

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
export { validateFrequencyType, calculateRunwayWindVector, evaluateRunways, isWaypointType } from "./waypoint.js";

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

// =============================================================================
// PLANNER & SERVICES
// =============================================================================

/**
 * Planner service types and implementations for route parsing and waypoint resolution.
 */
export type { WaypointResolver } from "./planner.js";
export { ServiceBase, PlannerService, createDefaultPlannerService } from "./planner.js";
