import { Aircraft, aircraftNormalizeRegistration, isAircraftRegistration } from "../aircraft.js";

/**
 * Defines the signature for a function that fetches aircraft data.
 * 
 * @param registrations - An array of aircraft registrations to fetch.
 * @returns A promise that resolves to an array of Aircraft objects or undefined if not found.
 */
export type AircraftFetcher = (registrations: string[]) => Promise<Aircraft[] | undefined>;

class AircraftService {
  private aircrafts: Map<string, Aircraft> = new Map();
  private accessOrder: string[] = [];
  private maxCacheSize: number;
  private fetcher: AircraftFetcher;

  /**
   * Creates a new instance of the AircraftService class.
   * 
   * @param fetcher - A function to fetch aircraft data by registrations.
   * @param maxCacheSize - Maximum number of aircraft to keep in the cache (default: 1000).
   */
  constructor(fetcher: AircraftFetcher, maxCacheSize: number = 1_000) {
    this.fetcher = fetcher;
    this.maxCacheSize = Math.max(1, maxCacheSize);
  }

  /**
   * Gets all aircraft registrations currently in the cache.
   * 
   * @returns An array of aircraft registration strings.
   */
  keys(): string[] {
    return Array.from(this.aircrafts.keys());
  }

  /**
   * Gets all aircraft objects currently in the cache.
   * 
   * @returns An array of Aircraft objects.
   */
  values(): Aircraft[] {
    return Array.from(this.aircrafts.values());
  }

  /**
   * Updates the access order for the LRU cache.
   * 
   * @param registration - The registration that was accessed.
   */
  private updateAccessOrder(registration: string): void {
    const index = this.accessOrder.indexOf(registration);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(registration);
  }

  /**
   * Enforces the cache size limit by removing least recently used items.
   */
  private enforceCacheLimit(): void {
    while (this.aircrafts.size > this.maxCacheSize && this.accessOrder.length > 0) {
      const leastUsedRegistration = this.accessOrder.shift();
      if (leastUsedRegistration) {
        this.aircrafts.delete(leastUsedRegistration);
      }
    }
  }

  /**
   * Adds aircraft to the service.
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
      this.aircrafts.set(aircraft.registration, aircraft);
      this.updateAccessOrder(aircraft.registration);
    }

    this.enforceCacheLimit();
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

    const aircraft = this.aircrafts.get(aircraftNormalizeRegistration(registration));
    if (aircraft) {
      this.updateAccessOrder(registration);
      return aircraft;
    }

    const results = await this.fetcher([aircraftNormalizeRegistration(registration)]);
    if (results && results.length > 0) {
      await this.addToCache(results);
      return results[0];
    }
    return undefined;
  }
}

export default AircraftService;