import { AerodromeService } from './aerodrome.js';
import { WeatherService } from './weather.js';
import { flightPlan } from '../navigation.js';
import type { WaypointType, RouteOptions, RouteTrip } from '../navigation.types.js';
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

    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);
    return await this.resolveRouteParts(routeParts);
  }

  /**
   * Attempts to resolve multiple route parts into waypoints using the chain of resolvers.
   *
   * @param parts - An array of route string parts to resolve.
   * @returns A promise that resolves to an array of successfully resolved waypoints.
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
   * @param part - The route string part to resolve.
   * @returns A promise that resolves to a WaypointType if successful, or null/undefined if no resolver could handle it.
   */
  async resolveRoutePart(part: string): Promise<WaypointType | null | undefined> {
    for (const resolver of this.resolvers) {
      const waypoint = await resolver.resolve(part);
      if (waypoint) {
        return waypoint;
      }
    }
  }

  /**
   * Attaches weather data to an array of waypoints using the WeatherService.
   *
   * @param waypoints - The array of waypoints to attach weather data to.
   * @returns A promise that resolves when the weather data has been attached.
   */
  async attachWeatherToWaypoints(waypoints: WaypointType[]): Promise<void> {
    await this.weatherService.attachWeather(waypoints);
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
    let alternateWaypoint: WaypointType | undefined;
    if (alternate) {
      alternateWaypoint = (await this.parseRouteString(alternate))[0];
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
      alternate: alternateWaypoint
    }

    // const segments: RouteSegment[] = waypoints.map(waypoint => ({
    //   waypoint,
    //   altitude: options.defaultAltitude
    // }));

    // TODO: Move to flightPlan function
    // segments[0].altitude = segments[0].waypoint.elevation;
    // segments[segments.length - 1].altitude = segments[segments.length - 1].waypoint.elevation;

    // const alternateSegment: RouteSegment | undefined = options.alternate ? {
    //   waypoint: options.alternate,
    //   altitude: options.alternate.elevation
    // } : undefined;

    // const routeTrip = flightPlan({
    //   segments: waypoints.map(waypoint => ({ waypoint, altitude: options.defaultAltitude })),
    //   alternateSegment: options.alternate ? { waypoint: options.alternate, altitude: options.alternate.elevation } : undefined,
    //   aircraft: options.aircraft,
    //   departureDate: options.departureDate,
    //   reserveFuel: options.reserveFuel,
    //   reserveFuelDuration: options.reserveFuelDuration,
    //   taxiFuel: options.taxiFuel,
    //   takeoffFuel: options.takeoffFuel,
    //   landingFuel: options.landingFuel
    // });

    // // TODO: Dont need this here
    // const advisory = routeTripValidate(routeTrip, options.aircraft as Aircraft, options);

    // return { ...routeTrip, advisory };
  }
}
