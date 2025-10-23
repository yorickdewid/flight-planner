import type { WaypointType } from './navigation.types.js';
import { Aerodrome, WaypointVariant, Waypoint } from './waypoint.types.js';
import { isICAO } from './utils.js';
import type { ICAO } from './index.js';

/**
 * Abstract base class for service implementations that handle entity retrieval.
 *
 * @template T - The type of entity this service manages
 *
 * @remarks
 * This class provides a standard interface for services that need to find entities
 * by ICAO codes or geographic location. All concrete implementations must provide
 * their own implementations of the abstract methods.
 *
 * Users of this library must implement this class to provide data fetching logic
 * for their specific data sources (database, API, cache, etc.).
 *
 * @example
 * ```typescript
 * class MyAerodromeService extends ServiceBase<Aerodrome> {
 *   async findByICAO(icao: readonly ICAO[]): Promise<Aerodrome[]> {
 *     return await database.getAerodromesByICAO(icao);
 *   }
 *
 *   async findByLocation(location: GeoJSON.Position, radius: number): Promise<Aerodrome[]> {
 *     return await database.getAerodromesNearLocation(location, radius);
 *   }
 * }
 * ```
 */
export abstract class ServiceBase<T> {
  /**
   * Finds entities by their ICAO codes.
   *
   * @param icao - An array of ICAO codes to search for
   * @returns A promise that resolves to an array of entities matching the provided ICAO codes
   *
   * @example
   * ```typescript
   * const results = await service.findByICAO(['KJFK', 'KLAX']);
   * ```
   */
  abstract findByICAO(icao: readonly ICAO[]): Promise<T[]>;

  /**
   * Finds entities within a specified radius of a geographic location.
   *
   * @param location - A GeoJSON position [longitude, latitude, altitude?] representing the center point
   * @param radius - The search radius in kilometers
   * @returns A promise that resolves to an array of entities within the specified radius
   *
   * @example
   * ```typescript
   * const results = await service.findByLocation([-74.0060, 40.7128], 50000);
   * ```
   */
  abstract findByLocation(location: GeoJSON.Position, radius: number): Promise<T[]>;
}

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
  constructor(private aerodromeService: ServiceBase<Aerodrome>) { }

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

      // TODO: Call createWaypoint utility function?
      const name = `WP-${lat.toFixed(2)},${lng.toFixed(2)}`;
      return { name, coords: [lng, lat], waypointVariant: WaypointVariant.Waypoint } as Waypoint;
    }
    return null;
  }
}

/**
 * PlannerService class provides methods to parse and resolve flight route strings into waypoints.
 * Uses a configurable chain of resolvers to support various waypoint formats.
 *
 * @class PlannerService
 *
 * @remarks
 * **Typical Usage**: Use the `createDefaultPlannerService()` factory function to get a pre-configured
 * instance with ICAO and coordinate resolvers.
 *
 * **Advanced Usage**: Use the constructor directly when you need full control over the resolver chain,
 * such as when you want to exclude default resolvers or change their order.
 *
 * @example
 * ```typescript
 * // Recommended: Use factory function for standard use cases
 * const planner = createDefaultPlannerService(aerodromeService);
 *
 * // Advanced: Direct construction for custom resolver chains
 * const planner = new PlannerService([
 *   new MyCustomResolver(),
 *   new ICAOResolver(aerodromeService),
 * ]);
 * ```
 */
export class PlannerService {
  /**
   * Creates a new instance of the PlannerService class.
   *
   * @param resolvers - Array of waypoint resolvers that will be tried in sequence to resolve route parts
   *
   * @remarks
   * Resolvers are tried in the order they appear in the array. The first resolver to return a
   * non-null/non-undefined value wins. Consider using `createDefaultPlannerService()` instead
   * for typical use cases.
   */
  constructor(
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
   * This method accepts a route string containing various waypoint formats and converts them
   * into standardized waypoint objects using a chain of resolvers.
   *
   * @param routeString - The route string to parse, containing waypoints separated by spaces, semicolons, or newlines
   * @returns A promise that resolves to an array of successfully parsed waypoints
   *
   * @remarks
   * Supported waypoint formats depend on the configured resolvers. The default factory function
   * (`createDefaultPlannerService`) provides support for:
   * - ICAO codes: 4-letter airport identifiers (e.g., "KJFK", "EGLL")
   * - Coordinate waypoints: WP(latitude,longitude) format (e.g., "WP(40.7128,-74.0060)")
   *
   * Custom resolvers can be added to support additional formats such as:
   * - IATA codes (e.g., "JFK", "LHR")
   * - VOR/NDB navaids (e.g., "VOR123", "NDB456")
   * - IFR waypoints (e.g., "BOSOX", "CRISY")
   * - VFR reporting points (e.g., "VRP_XX")
   *
   * Processing steps:
   * 1. Returns empty array if routeString is empty or falsy
   * 2. Converts input to uppercase for consistency
   * 3. Splits the route string by whitespace, semicolons, and newlines
   * 4. Filters out empty parts
   * 5. For each part, attempts to resolve using the chain of resolvers in order
   * 6. Silently skips parts that cannot be resolved by any resolver
   *
   * **Error Handling**:
   * - Parts that don't match any resolver pattern are **silently skipped**
   * - Parts that match a resolver's pattern but fail to resolve (e.g., valid ICAO code but
   *   aerodrome not found in database) **will throw an error**
   * - This means the returned array may have fewer waypoints than parts in the input string
   *
   * For example:
   * - "KJFK UNKNOWN EGLL" where UNKNOWN is not a valid ICAO → returns 2 waypoints (KJFK, EGLL)
   * - "KJFK XXXX EGLL" where XXXX is a valid ICAO pattern but not found → throws error
   *
   * @throws {Error} When a resolver matches a pattern but fails to find the entity
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
 * const planner = createDefaultPlannerService(aerodromeService);
 * // Creates a planner with ICAO and coordinate resolvers
 * ```
 *
 * @example
 * ```typescript
 * const planner = createDefaultPlannerService(
 *   aerodromeService,
 *   [new IATAResolver(), new VORResolver()]
 * );
 * // Creates a planner that tries custom resolvers first, then ICAO, then coordinate resolvers
 * ```
 */
export function createDefaultPlannerService(
  aerodromeService: ServiceBase<Aerodrome>,
  customResolvers: WaypointResolver[] = []
): PlannerService {
  return new PlannerService([
    ...customResolvers,
    new ICAOResolver(aerodromeService),
    new CoordinateResolver()
  ]);
}
