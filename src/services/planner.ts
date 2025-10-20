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
      const airports = await this.aerodromeService.findByICAO([part]);
      if (airports && airports.length > 0) {
        return airports[0];
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
    private resolvers: WaypointResolver[] = []
  ) { }

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
   * Resolvers are tried in the order they exist in the resolvers array.
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
   * Attaches the closest METAR station to each waypoint in the provided array.
   *
   * This method finds and assigns the nearest weather station to each waypoint by using the
   * waypoint's geographical coordinates. It modifies the waypoints in place by setting their
   * `metarStation` property. By default, it only processes waypoints that don't already have
   * a METAR station assigned.
   *
   * @param waypoints - An array of waypoints to attach weather data to
   * @param reassign - Whether to reassign existing weather data (default: false). When true,
   *                   clears all existing `metarStation` assignments before searching for new ones
   * @returns A promise that resolves when all waypoints have been processed
   *
   * @remarks
   * - Waypoints that already have a `metarStation` assigned are skipped unless `reassign` is true
   * - If no METAR station is found near a waypoint, its `metarStation` property remains undefined
   * - The method processes all waypoints in parallel for better performance
   * - Uses the weather service's `nearest()` method to find the closest station to each waypoint
   *
   * @example
   * ```typescript
   * const waypoints = await planner.parseRouteString("KJFK EGLL");
   * await planner.attachWeatherToWaypoints(waypoints);
   * // Each waypoint now has metarStation property set (if a nearby station was found)
   * ```
   */
  async attachWeatherToWaypoints(waypoints: Waypoint[], reassign = false): Promise<void> {
    if (reassign) {
      for (const waypoint of waypoints) {
        waypoint.metarStation = undefined;
      }
    }

    await Promise.all(waypoints
      .filter(waypoint => !waypoint.metarStation)
      .map(async waypoint => {
        const station = await this.weatherService.nearest(waypoint.location.geometry.coordinates);
        if (station) {
          waypoint.metarStation = station;
        }
      }));
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
}

/**
 * Creates a PlannerService instance with default waypoint resolvers.
 *
 * This factory function initializes a PlannerService with a standard resolver chain that includes:
 * 1. Any custom resolvers provided (tried first)
 * 2. ICAOResolver - for resolving 4-letter ICAO airport codes
 * 3. CoordinateResolver - for resolving WP(lat,lng) coordinate waypoints
 *
 * @param aerodromeService - The aerodrome service for looking up airports and aerodromes
 * @param weatherService - The weather service for attaching weather data to waypoints
 * @param customResolvers - Optional array of custom waypoint resolvers that will be tried before the default resolvers
 * @returns A configured PlannerService instance with the resolver chain
 *
 * @remarks
 * Custom resolvers are placed at the beginning of the resolver chain, allowing you to override
 * or extend the default behavior. For example, you could add an IATA code resolver that would
 * be tried before the ICAO resolver.
 *
 * @example
 * ```typescript
 * const planner = createDefaultPlannerService(aerodromeService, weatherService);
 * // Creates a planner with ICAO and coordinate resolvers
 * ```
 *
 * @example
 * ```typescript
 * const planner = createDefaultPlannerService(
 *   aerodromeService,
 *   weatherService,
 *   [new IATAResolver(), new VORResolver()]
 * );
 * // Creates a planner that tries IATA, then VOR, then ICAO, then coordinate resolvers
 * ```
 */
export function createDefaultPlannerService(
  aerodromeService: AerodromeService,
  weatherService: WeatherService,
  customResolvers: WaypointResolver[] = []
): PlannerService {
  return new PlannerService(aerodromeService, weatherService, [
    ...customResolvers,
    new ICAOResolver(aerodromeService),
    new CoordinateResolver()
  ]);
}
