import { AerodromeService } from './aerodrome.js';
import { WeatherService } from './weather.js';
import { flightPlan } from '../navigation.js';
import type { WaypointType, RouteSegment, RouteOptions, RouteTrip } from '../navigation.types.js';
import { Waypoint } from '../waypoint.types.js';
import { isICAO } from '../utils.js';
import { point as turfPoint } from '@turf/turf';
import { routeTripValidate, Advisory } from '../advisor.js';
import { Aircraft } from '../aircraft.js';

/**
 * Interface for waypoint resolvers that attempt to resolve a route string part into a waypoint.
 * Resolvers are called in sequence until one successfully resolves the waypoint.
 *
 * @interface WaypointResolver
 */
export interface WaypointResolver {
  /**
   * Attempts to resolve a route string part into a waypoint.
   *
   * @param part - The route string part to resolve (e.g., "KJFK", "WP(40.7128,-74.0060)", "VOR123")
   * @returns A promise that resolves to a WaypointType if successful, or null/undefined if the resolver cannot handle this part
   */
  resolve(part: string): Promise<WaypointType | null | undefined>;
}

/**
 * Default ICAO waypoint resolver that looks up aerodromes by ICAO code.
 */
class ICAOResolver implements WaypointResolver {
  constructor(private aerodromeService: AerodromeService) { }

  async resolve(part: string): Promise<WaypointType | null> {
    if (isICAO(part)) {
      const airport = await this.aerodromeService.findOne(part);
      if (airport) {
        return airport;
      }
      throw new Error(`Could not find aerodrome with ICAO code: ${part}`);
    }
    return null;
  }
}

/**
 * Default coordinate waypoint resolver that parses WP(lat,lng) format.
 */
class CoordinateResolver implements WaypointResolver {
  private waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

  async resolve(part: string): Promise<WaypointType | null> {
    const waypointMatch = part.match(this.waypointRegex);
    if (waypointMatch) {
      const lat = parseFloat(waypointMatch[1]);
      const lng = parseFloat(waypointMatch[2]);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid coordinates in waypoint: ${part}`);
      }

      const name = `WP-${lat.toFixed(2)},${lng.toFixed(2)}`;
      return { name, location: turfPoint([lng, lat]) } as Waypoint;
    }
    return null;
  }
}

/**
 * PlannerService class provides methods to create and manage flight plans.
 * Acts as a service layer that orchestrates route planning, weather data, and aircraft information.
 *
 * @class PlannerService
 */
export class PlannerService {
  private resolvers: WaypointResolver[];

  /**
   * Creates a new instance of the PlannerService class.
   *
   * @param aerodromeService - The aerodrome service for looking up airports and aerodromes.
   * @param weatherService - The weather service for attaching weather data to waypoints.
   * @param customResolvers - Optional array of custom waypoint resolvers. These will be tried before the default resolvers.
   */
  constructor(
    private aerodromeService: AerodromeService,
    private weatherService: WeatherService,
    customResolvers: WaypointResolver[] = []
  ) {
    if (!aerodromeService || !weatherService) {
      throw new Error('PlannerService requires all service dependencies.');
    }

    this.resolvers = [
      ...customResolvers,
      new ICAOResolver(aerodromeService),
      new CoordinateResolver()
    ];
  }

  /**
   * Adds a custom waypoint resolver to the resolver chain.
   * The resolver will be added at the beginning of the chain and will be tried before existing resolvers.
   *
   * @param resolver - The waypoint resolver to add.
   */
  addResolver(resolver: WaypointResolver): void {
    this.resolvers.unshift(resolver);
  }

  /**
   * Clears all waypoint resolvers from the resolver chain.
   */
  clearResolvers(): void {
    this.resolvers = [];
  }

  /**
   * Parses a route string into an array of waypoints.
   *
   * This function accepts a route string containing various waypoint formats and converts them
   * into standardized waypoint objects. It uses a chain of resolvers to identify and resolve waypoints.
   *
   * @param routeString - The route string to parse, containing waypoints separated by spaces, semicolons, or newlines
   * @returns A promise that resolves to an array of parsed waypoints
   *
   * @description
   * Default supported waypoint formats:
   * - ICAO codes: 4-letter airport identifiers (e.g., "KJFK", "EGLL")
   * - Coordinate waypoints: WP(latitude,longitude) format (e.g., "WP(40.7128,-74.0060)")
   *
   * Custom resolvers can be provided in the constructor to support additional formats such as:
   * - IATA codes (e.g., "JFK", "LHR")
   * - VOR/NDB navaids (e.g., "VOR123", "NDB456")
   * - IFR waypoints (e.g., "BOSOX", "CRISY")
   * - VFR reporting points (e.g., "VRP_XX")
   *
   * The function performs the following operations:
   * 1. Splits the route string by whitespace, semicolons, and newlines
   * 2. Filters out empty parts
   * 3. Converts all input to uppercase for consistency
   * 4. For each part, attempts to resolve using the chain of resolvers
   * 5. Collects parsing errors and throws if no valid waypoints are found
   *
   * @throws {Error} Throws an error if the route string cannot be parsed or contains no valid waypoints
   */
  async parseRouteString(routeString: string): Promise<WaypointType[]> {
    if (!routeString) return [];

    const waypoints: WaypointType[] = [];
    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);
    const parseErrors: string[] = [];

    for (const part of routeParts) {
      try {
        let resolved = false;

        // Try each resolver in sequence
        for (const resolver of this.resolvers) {
          const waypoint = await resolver.resolve(part);
          if (waypoint) {
            waypoints.push(waypoint);
            resolved = true;
            break;
          }
        }

        if (!resolved) {
          throw new Error(`Unrecognized waypoint format: ${part}`);
        }
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

  // TODO: All we really need is to resolve a route. Then the flightPlan function can handle the rest.
  /**
   * Creates a flight plan from a route string and route options.
   *
   * This function parses the route string into waypoints, attaches weather data, finds an alternate aerodrome if not provided,
   * and constructs a flight plan with segments and performance calculations.
   *
   * @param routeString - The route string to parse into waypoints.
   * @param options - Optional parameters for the flight plan, including aircraft, default altitude, departure date, and reserve fuel.
   * @returns A promise that resolves to a RouteTrip object with optional advisory information.
   */
  async createFlightPlanFromString(
    routeString: string,
    options: RouteOptions = {}
  ): Promise<RouteTrip & { advisory?: Advisory[] }> {
    const waypoints = await this.parseRouteString(routeString);
    const lastWaypoint = waypoints[waypoints.length - 1];

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

    // TODO: Move to flightPlan function
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

    // TODO: Dont need this here
    const advisory = routeTripValidate(routeTrip, options.aircraft as Aircraft, options);

    return { ...routeTrip, advisory };
  }
}
