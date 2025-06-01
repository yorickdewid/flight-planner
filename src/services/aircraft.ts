import { Aircraft, aircraftNormalizeRegistration, isAircraftRegistration } from "../aircraft.js";
import { CacheService } from "./cache.js";

/**
 * Options for configuring the AircraftService.
 */
export interface AircraftServiceOptions {
  /**
   * The maximum number of aircraft to store in the cache.
   * 
   * @default 1000
   */
  maxCacheSize?: number

  /**
   * A function to fetch aircraft by their registrations.
   * 
   * @param registration - An array of aircraft registrations.
   * @returns A promise that resolves to an array of Aircraft objects.
   */
  fetchByRegistration(registration: readonly string[]): Promise<Aircraft[]>;
}

/**
 * AircraftService class provides methods to manage and retrieve aircraft data.
 * 
 * @class AircraftService
 * @property {CacheService<string, Aircraft>} cache - Cache service for storing aircraft data.
 */
class AircraftService {
  private cache: CacheService<string, Aircraft>;

  /**
   * Creates a new instance of the AircraftService class.
   * 
   * @param options - Options for the AircraftService, including maxCacheSize and fetchByRegistration method.
   */
  constructor(private options: AircraftServiceOptions) {
    if (!options.fetchByRegistration) {
      throw new Error('AircraftService requires a fetchByRegistration method in options.');
    }
    const { maxCacheSize = 1000 } = options;
    this.cache = new CacheService<string, Aircraft>(maxCacheSize);
  }

  /**
   * Gets all aircraft registrations currently in the cache.
   * 
   * @returns An array of aircraft registration strings.
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Gets all aircraft objects currently in the cache.
   * 
   * @returns An array of Aircraft objects.
   */
  values(): Aircraft[] {
    return this.cache.values();
  }

  /**
   * Adds aircraft to the cache.
   * 
   * @param aircraftsToAdd - An array of Aircraft objects or a single Aircraft object to add.
   */
  private async addToCache(aircraftsToAdd: Aircraft | Aircraft[]): Promise<void> {
    let aircraftArray: Aircraft[] = [];
    if (Array.isArray(aircraftsToAdd)) {
      aircraftArray = aircraftsToAdd;
    } else {
      aircraftArray = [aircraftsToAdd];
    }

    for (const aircraft of aircraftArray) {
      this.cache.set(aircraft.registration, aircraft);
    }
  }

  /**
   * Retrieves an aircraft by its registration.
   * 
   * @param registration - The registration of the aircraft to retrieve.
   * @returns A promise that resolves to the Aircraft object or undefined if not found.
   */
  async get(registration: string): Promise<Aircraft | undefined> {
    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    const aircraft = this.cache.get(normalizedRegistration);
    if (aircraft) {
      return aircraft;
    }

    const results = await this.options.fetchByRegistration([normalizedRegistration]);
    if (results && results.length > 0) {
      await this.addToCache(results);
      // The first result should be the one we asked for, but CacheService might have evicted it
      // if the cache is very small and the fetcher returned many items.
      // Re-get it from cache to ensure LRU order is correct.
      return this.cache.get(results[0].registration);
    }
    return undefined;
  }
}

export default AircraftService;