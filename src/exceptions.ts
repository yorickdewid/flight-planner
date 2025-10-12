/**
 * Base class for all flight planner exceptions.
 */
export abstract class FlightPlannerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Exception thrown when insufficient waypoints are provided for route planning.
 * A valid route requires at least a departure and arrival waypoint.
 */
export class InsufficientWaypointsError extends FlightPlannerError {
  constructor(providedCount: number = 0) {
    const message = `At least departure and arrival waypoints are required. Provided: ${providedCount} waypoint(s)`;
    super(message, 'INSUFFICIENT_WAYPOINTS');
  }
}

/**
 * Exception thrown when route parsing fails.
 */
export class RouteParsingError extends FlightPlannerError {
  constructor(message: string, public readonly routeString?: string) {
    super(message, 'ROUTE_PARSING_ERROR');
  }
}

/**
 * Exception thrown when aircraft data is invalid or missing.
 */
export class AircraftDataError extends FlightPlannerError {
  constructor(message: string, public readonly aircraftRegistration?: string) {
    super(message, 'AIRCRAFT_DATA_ERROR');
  }
}

/**
 * Exception thrown when waypoint data is invalid or missing.
 */
export class WaypointDataError extends FlightPlannerError {
  constructor(message: string, public readonly waypointIdentifier?: string) {
    super(message, 'WAYPOINT_DATA_ERROR');
  }
}

/**
 * Exception thrown when weather data cannot be retrieved or is invalid.
 */
export class WeatherDataError extends FlightPlannerError {
  constructor(message: string, public readonly location?: string) {
    super(message, 'WEATHER_DATA_ERROR');
  }
}
