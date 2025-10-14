import { AerodromeService } from './aerodrome.js';
import { WeatherService } from './weather.js';
import type { WaypointType } from '../navigation.types.js';
import { Waypoint, Aerodrome } from '../waypoint.types.js';
import { isICAO } from '../utils.js';
import { point as turfPoint } from '@turf/turf';

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
   * @returns A promise that resolves to a WaypointType if successful, null/undefined if the resolver cannot handle this part
   * @throws {Error} May throw an error if the part matches the resolver's pattern but is invalid (e.g., invalid ICAO, malformed coordinates)
   */
  resolve(part: string): Promise<WaypointType | null | undefined>;
}

/**
 * Default ICAO waypoint resolver that looks up aerodromes by ICAO code.
 *
 * @class ICAOResolver
 * @implements {WaypointResolver}
 */
class ICAOResolver implements WaypointResolver {
  constructor(private aerodromeService: AerodromeService) { }

  /**
   * Resolves a route part if it matches a valid ICAO code pattern (4 letters).
   *
   * @param part - The route string part to resolve
   * @returns The aerodrome if found, null if part is not a valid ICAO code
   * @throws {Error} If the part is a valid ICAO code but no aerodrome is found
   */
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
 *
 * @class CoordinateResolver
 * @implements {WaypointResolver}
 */
class CoordinateResolver implements WaypointResolver {
  private waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

  /**
   * Resolves a route part if it matches the WP(lat,lng) coordinate format.
   *
   * @param part - The route string part to resolve
   * @returns A waypoint with the parsed coordinates, or null if the part doesn't match the coordinate format
   * @throws {Error} If the part matches the format but contains invalid numeric values
   */
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
   * @param aerodromeService - The aerodrome service for looking up airports and aerodromes
   * @param weatherService - The weather service for attaching weather data to waypoints
   * @param customResolvers - Optional array of custom waypoint resolvers that will be tried before the default resolvers (ICAO and Coordinate)
   * @throws {Error} If aerodromeService or weatherService are not provided
   */
  constructor(
    private aerodromeService: AerodromeService,
    private weatherService: WeatherService,
    customResolvers: WaypointResolver[] = []
  ) {
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
   * @param resolver - The waypoint resolver to add
   * @returns void
   */
  addResolver(resolver: WaypointResolver): void {
    this.resolvers.unshift(resolver);
  }

  /**
   * Clears all waypoint resolvers from the resolver chain.
   *
   * @remarks
   * WARNING: This removes ALL resolvers including the default ICAO and Coordinate resolvers.
   * After calling this method, route parsing will fail unless new resolvers are added.
   *
   * @returns void
   */
  clearResolvers(): void {
    this.resolvers = [];
  }

  /**
   * Parses a route string into an array of waypoints.
   *
   * This function accepts a route string containing various waypoint formats and converts them
   * into standardized waypoint objects using a chain of resolvers.
   *
   * @param routeString - The route string to parse, containing waypoints separated by spaces, semicolons, or newlines
   * @returns A promise that resolves to an array of successfully parsed waypoints
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
   * 1. Returns empty array if routeString is empty or falsy
   * 2. Converts input to uppercase for consistency
   * 3. Splits the route string by whitespace, semicolons, and newlines
   * 4. Filters out empty parts
   * 5. For each part, attempts to resolve using the chain of resolvers in order
   * 6. Silently skips parts that cannot be resolved by any resolver
   *
   * @remarks
   * Note: This method does NOT throw errors for unresolved waypoints. Parts that cannot be resolved
   * by any resolver are silently skipped. This means the returned array may have fewer waypoints
   * than parts in the input string. If a resolver throws an error for a matched pattern
   * (e.g., valid ICAO but aerodrome not found), that error will propagate.
   *
   * @example
   * ```typescript
   * const waypoints = await planner.parseRouteString("KJFK EGLL WP(51.5,-0.1)");
   * // Returns array with resolved waypoints, skipping any unresolvable parts
   * ```
   */
  async parseRouteString(routeString: string): Promise<WaypointType[]> {
    if (!routeString) return [];

    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);
    return await this.resolveRouteParts(routeParts);
  }

  /**
   * Attempts to resolve multiple route parts into waypoints using the chain of resolvers.
   *
   * @param parts - An array of route string parts to resolve
   * @returns A promise that resolves to an array of successfully resolved waypoints
   *
   * @remarks
   * For each part, resolvers are tried in order until one successfully resolves it.
   * Parts that cannot be resolved by any resolver are silently skipped.
   * If a resolver throws an error for a matched pattern, that error will propagate and stop processing.
   */
  async resolveRouteParts(parts: string[]): Promise<WaypointType[]> {
    const waypoints: WaypointType[] = [];

    for (const part of parts) {
      for (const resolver of this.resolvers) {
        const waypoint = await resolver.resolve(part);
        if (waypoint) {
          waypoints.push(waypoint);
          break;
        }
      }
    }

    return waypoints;
  }

  /**
   * Attempts to resolve a single route part into a waypoint using the chain of resolvers.
   *
   * @param part - The route string part to resolve
   * @returns A promise that resolves to a WaypointType if any resolver successfully handles it, or null/undefined if no resolver can handle it
   *
   * @remarks
   * Resolvers are tried in order (custom resolvers first, then ICAO, then Coordinate).
   * Returns the result from the first resolver that returns a non-null/non-undefined value.
   * If a resolver throws an error, that error will propagate.
   */
  async resolveRoutePart(part: string): Promise<WaypointType | null | undefined> {
    for (const resolver of this.resolvers) {
      const waypoint = await resolver.resolve(part);
      if (waypoint) {
        return waypoint;
      }
    }

    return null;
  }

  /**
   * Attaches weather data to an array of waypoints using the WeatherService.
   *
   * @param waypoints - The array of waypoints to attach weather data to
   * @returns A promise that resolves when the weather data has been attached to all waypoints
   *
   * @remarks
   * This method mutates the waypoints by adding weather/METAR station data to them.
   * Weather attachment may fail silently for waypoints without associated METAR stations.
   */
  async attachWeatherToWaypoints(waypoints: WaypointType[]): Promise<void> {
    await this.weatherService.attachWeather(waypoints);
  }

  /**
   * Finds an alternate aerodrome near the destination waypoint.
   *
   * @param destination - The destination aerodrome to search near
   * @param radius - The search radius in kilometers (default: 50 km)
   * @param excludeICAOs - Array of ICAO codes to exclude from the search (in addition to the destination's ICAO if present)
   * @returns A promise that resolves to the nearest alternate aerodrome waypoint, or null if none found within the radius
   *
   * @remarks
   * This method searches for the nearest aerodrome to the destination waypoint within the specified radius.
   * It uses the destination's coordinates to perform a proximity search and excludes any specified ICAO codes.
   * The destination's ICAO code is automatically excluded if present, ensuring the alternate is different from the destination.
   * This is commonly used to find suitable alternate airports for flight planning.
   *
   * @example
   * ```typescript
   * const destination = await planner.resolveRoutePart("KJFK");
   * // KJFK is automatically excluded from the search
   * const alternate = await planner.findAlternateAerodrome(destination, 100);
   * ```
   */
  async findAlternateAerodrome(
    destination: Aerodrome,
    radius: number = 50,
    excludeICAOs: string[] = []
  ): Promise<WaypointType | null> {
    const exclude = destination.ICAO
      ? [...excludeICAOs, destination.ICAO]
      : excludeICAOs;
    return await this.aerodromeService.nearest(destination.location.geometry.coordinates, radius, exclude);
  }

  /**
   * Creates a flight plan from a route string by parsing waypoints, attaching weather data, and finding an alternate aerodrome.
   *
   * @param routeString - The route string to parse into waypoints (must contain at least departure and destination)
   * @param alternate - Optional ICAO code or waypoint identifier for the alternate aerodrome. If not provided, the nearest suitable aerodrome to the destination will be automatically selected
   * @param alternateRadius - The search radius in kilometers for finding an alternate aerodrome (default: 50 km)
   * @returns A promise that resolves to an object containing the parsed waypoints array and optional alternate waypoint
   *
   * @throws {Error} If the route string contains fewer than 2 waypoints (departure and destination required)
   * @throws {Error} If a specified alternate waypoint cannot be resolved
   * @throws {Error} If no suitable alternate aerodrome is found within the specified radius
   *
   * @remarks
   * The function performs the following operations:
   * 1. Parses the route string into waypoints using the resolver chain
   * 2. Validates that at least 2 waypoints (departure and destination) are present
   * 3. If alternate is specified, resolves it as a waypoint
   * 4. If alternate is not specified, finds the nearest aerodrome to the destination within the alternateRadius,
   *    excluding the destination itself
   * 5. Attaches weather data to all waypoints including the alternate
   *
   * Note: The alternate aerodrome selection logic is basic and only considers distance.
   * It does not validate runway length, instrument approaches, or services availability.
   *
   * @example
   * ```typescript
   * // With automatic alternate selection
   * const plan = await planner.createRouteFromString("KJFK EGLL");
   *
   * // With specified alternate
   * const plan = await planner.createRouteFromString("KJFK EGLL", "EGLC");
   * ```
   */
  async createRouteFromString(
    routeString: string,
    alternate?: string,
    alternateRadius: number = 50,
  ): Promise<{ waypoints: WaypointType[]; alternate?: WaypointType }> {
    const waypoints = await this.parseRouteString(routeString);
    if (waypoints.length < 2) {
      throw new Error('Route must contain at least two waypoints (departure and destination).');
    }

    // TODO: Improve this logic to find the alternate aerodrome
    // - Consider factors like runway length, instrument approaches, and services available.
    // - This might involve more complex lookups or integration with additional data sources.
    let alternateWaypoint: WaypointType | null | undefined;
    if (alternate) {
      alternateWaypoint = await this.resolveRoutePart(alternate);
      if (!alternateWaypoint) {
        throw new Error(`Could not resolve alternate waypoint: ${alternate}`);
      }
    } else {
      const lastWaypoint = waypoints[waypoints.length - 1];
      const alternateExclude = lastWaypoint.ICAO ? [lastWaypoint.ICAO] : [];
      const alternate = await this.aerodromeService.nearest(lastWaypoint.location.geometry.coordinates, alternateRadius, alternateExclude);
      if (alternate) {
        alternateWaypoint = alternate;
      }
    }

    await this.weatherService.attachWeather(waypoints);
    if (alternateWaypoint) {
      await this.weatherService.attachWeather([alternateWaypoint]);
    }

    return {
      waypoints,
      alternate: alternateWaypoint ?? undefined
    };
  }
}
