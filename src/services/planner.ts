import AerodromeService from './aerodrome.js';
import WeatherService from './weather.js';
import AircraftService from './aircraft.js';
import { flightPlan, WaypointType, RouteSegment } from '../planner.js';
import { RouteOptions, RouteTrip } from '../planner.js';
import { Waypoint } from '../waypoint.types.js';
import { isICAO } from '../utils.js';
import { point as turfPoint } from '@turf/turf';
import { routeTripValidate, Advisory } from '../advisor.js';
import { Aircraft } from '../aircraft.js';

/**
 * PlannerService class provides methods to create and manage flight plans.
 * Acts as a service layer that orchestrates route planning, weather data, and aircraft information.
 *
 * @class PlannerService
 */
class PlannerService {
  /**
   * Creates a new instance of the PlannerService class.
   *
   * @param aerodromeService - The aerodrome service for looking up airports and aerodromes.
   * @param weatherService - The weather service for attaching weather data to waypoints.
   * @param aircraftService - The aircraft service for looking up aircraft information.
   */
  constructor(
    private aerodromeService: AerodromeService,
    private weatherService: WeatherService,
    private aircraftService: AircraftService
  ) {
    if (!aerodromeService || !weatherService || !aircraftService) {
      throw new Error('PlannerService requires all service dependencies.');
    }
  }

  /**
   * Parses a route string into an array of waypoints.
   *
   * This function accepts a route string containing various waypoint formats and converts them
   * into standardized waypoint objects. It supports ICAO airport codes and coordinate-based waypoints.
   *
   * @param routeString - The route string to parse, containing waypoints separated by spaces, semicolons, or newlines
   * @returns A promise that resolves to an array of parsed waypoints
   *
   * @description
   * Supported waypoint formats:
   * - ICAO codes: 4-letter airport identifiers (e.g., "KJFK", "EGLL")
   * - Coordinate waypoints: WP(latitude,longitude) format (e.g., "WP(40.7128,-74.0060)")
   *
   * The function performs the following operations:
   * 1. Splits the route string by whitespace, semicolons, and newlines
   * 2. Filters out empty parts
   * 3. Converts all input to uppercase for consistency
   * 4. For each part, attempts to match against supported formats:
   *    - If ICAO code: looks up aerodrome using the provided service
   *    - If coordinate waypoint: creates a waypoint with the specified coordinates
   * 5. Collects parsing errors and throws if no valid waypoints are found
   *
   * @throws {Error} Throws an error if the route string cannot be parsed or contains no valid waypoints
   */
  async parseRouteString(routeString: string): Promise<WaypointType[]> {
    if (!routeString) return [];

    const waypoints: WaypointType[] = [];
    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);

    const waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

    const parseErrors: string[] = [];

    for (const part of routeParts) {
      try {
        if (isICAO(part)) {
          const airport = await this.aerodromeService.findOne(part);
          if (airport) {
            waypoints.push(airport);
            continue;
          } else {
            throw new Error(`Could not find aerodrome with ICAO code: ${part}`);
          }
        }

        const waypointMatch = part.match(waypointRegex);
        if (waypointMatch) {
          const lat = parseFloat(waypointMatch[1]);
          const lng = parseFloat(waypointMatch[2]);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error(`Invalid coordinates in waypoint: ${part}`);
          }

          const name = `WP-${lat.toFixed(2)},${lng.toFixed(2)}`;
          waypoints.push({ name, location: turfPoint([lng, lat]) } as Waypoint);
          continue;
        }

        // TODO: Check for things like NAVAIDs, VORs, NDBs, etc.
        // TODO: Check for VFR waypoints, starting with VRP_XX

        throw new Error(`Unrecognized waypoint format: ${part}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        parseErrors.push(`Error parsing route part "${part}": ${errorMessage}`);
        console.error(parseErrors[parseErrors.length - 1]);
      }
    }

    if (waypoints.length === 0 && parseErrors.length > 0) {
      throw new Error(`Failed to parse route string: ${parseErrors.join('; ')}`);
    }

    return waypoints;
  }

  /**
   * Creates a flight plan from a route string, aircraft registration, and optional route options.
   *
   * This function parses the route string into waypoints, attaches weather data, finds an alternate aerodrome if not provided,
   * and constructs a flight plan with segments and performance calculations.
   *
   * @param routeString - The route string to parse into waypoints.
   * @param aircraftRegistration - The registration of the aircraft to be used in the flight plan.
   * @param options - Optional parameters for the flight plan, including default altitude, departure date, and reserve fuel.
   * @returns A promise that resolves to a RouteTrip object with optional advisory information.
   */
  async createFlightPlanFromString(
    routeString: string,
    aircraftRegistration: string,
    options: RouteOptions = {}
  ): Promise<RouteTrip & { advisory?: Advisory[] }> {
    const waypoints = await this.parseRouteString(routeString);
    const lastWaypoint = waypoints[waypoints.length - 1];

    options.aircraft = await this.aircraftService.findByRegistration(aircraftRegistration);

    await this.weatherService.attachWeather(waypoints);

    // TODO: Improve this logic to find the alternate aerodrome
    // - Consider factors like runway length, instrument approaches, and services available.
    // - This might involve more complex lookups or integration with additional data sources.
    if (!options.alternate) {
      const alternateRadius = options.alternateRadius ?? 50; // Use option if provided, otherwise default to 50
      const alternateExclude = lastWaypoint.ICAO ? [lastWaypoint.ICAO] : [];
      const alternate = await this.aerodromeService.nearest(lastWaypoint.location.geometry.coordinates, alternateRadius, alternateExclude);
      if (alternate) {
        await this.weatherService.attachWeather([alternate]);
        options.alternate = alternate;
      }
    }

    const segments: RouteSegment[] = waypoints.map(waypoint => ({
      waypoint,
      altitude: options.defaultAltitude
    }));

    segments[0].altitude = segments[0].waypoint.elevation;
    segments[segments.length - 1].altitude = segments[segments.length - 1].waypoint.elevation;

    const alternateSegment: RouteSegment | undefined = options.alternate ? {
      waypoint: options.alternate,
      altitude: options.alternate.elevation
    } : undefined;

    const routeTrip = flightPlan({
      segments,
      alternateSegment,
      aircraft: options.aircraft,
      departureDate: options.departureDate,
      reserveFuel: options.reserveFuel,
      reserveFuelDuration: options.reserveFuelDuration,
      taxiFuel: options.taxiFuel,
      takeoffFuel: options.takeoffFuel,
      landingFuel: options.landingFuel
    });
    const advisory = routeTripValidate(routeTrip, options.aircraft as Aircraft, options);

    return { ...routeTrip, advisory };
  }
}

export default PlannerService;
