import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.js";
import { isICAO, normalizeICAO } from "../utils.js";
import RepositoryBase from "../repository.js";

import { point, nearestPoint } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @property {Map<ICAO, Aerodrome>} aerodromes - A map of ICAO codes to Aerodrome objects.
 * @property {RepositoryBase<Aerodrome>} [repository] - Optional repository for fetching aerodrome data.
 */
class AerodromeService {
  private aerodromes: Map<ICAO, Aerodrome> = new Map();
  private accessOrder: ICAO[] = [];
  private maxCacheSize: number;

  /**
   * Creates a new instance of the AerodromeService class.
   * 
   * @param repository - An optional repository for fetching aerodrome data.
   * @param maxCacheSize - Maximum number of aerodromes to keep in the cache (default: 1000).
   */
  constructor(
    private repository: RepositoryBase<Aerodrome>,
    maxCacheSize: number = 1_000
  ) {
    this.maxCacheSize = Math.max(1, maxCacheSize);
  }

  /**
   * Returns an array of ICAO codes for the aerodromes.
   * 
   * @returns An array of ICAO codes.
   */
  keys(): ICAO[] {
    return Array.from(this.aerodromes.keys());
  }

  /**
   * Returns an array of aerodromes.
   * 
   * @returns An array of Aerodrome objects.
   */
  values(): Aerodrome[] {
    return Array.from(this.aerodromes.values());
  }

  /**
   * Updates the access order for the LRU cache.
   * 
   * @param icao - The ICAO code that was accessed.
   */
  private updateAccessOrder(icao: ICAO): void {
    const index = this.accessOrder.indexOf(icao);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(icao);
  }

  /**
   * Enforces the cache size limit by removing least recently used items.
   */
  private enforceCacheLimit(): void {
    while (this.aerodromes.size > this.maxCacheSize && this.accessOrder.length > 0) {
      const leastUsedIcao = this.accessOrder.shift();
      if (leastUsedIcao) {
        this.aerodromes.delete(leastUsedIcao);
      }
    }
  }

  /**
   * Adds aerodromes to the service.
   * 
   * @param aerodromes - An array of Aerodrome objects or a single Aerodrome object to add.
   */
  private async addToCache(aerodromes: Aerodrome | Aerodrome[]): Promise<void> {
    let aerodromeArray: Aerodrome[] = [];
    if (Array.isArray(aerodromes)) {
      aerodromeArray = aerodromes;
    } else {
      aerodromeArray = [aerodromes];
    }

    for (const aerodrome of aerodromeArray) {
      this.aerodromes.set(aerodrome.ICAO, aerodrome);
      this.updateAccessOrder(aerodrome.ICAO);
    }

    this.enforceCacheLimit();
  }

  /**
   * Finds aerodromes by ICAO code(s).
   *
   * @param icao - A single ICAO code or an array of ICAO codes to search for.
   * @returns A promise that resolves to an array of Aerodrome objects, or undefined if not found.
   * @throws Error if the repository is not set or doesn't support fetchByICAO.
   */
  async get(icao: string | string[]): Promise<Aerodrome[] | undefined> {
    if (Array.isArray(icao)) {
      const validIcaoCodes = icao.filter(code => typeof code === 'string' && isICAO(code)) as ICAO[];
      if (!validIcaoCodes.length) return undefined;

      const cachedResults: Aerodrome[] = [];
      const missingIcaoCodes: ICAO[] = [];

      for (const code of validIcaoCodes) {
        const cachedAerodrome = this.aerodromes.get(code);
        if (cachedAerodrome) {
          cachedResults.push(cachedAerodrome);
          this.updateAccessOrder(code);
        } else {
          missingIcaoCodes.push(code);
        }
      }

      if (missingIcaoCodes.length > 0) {
        const fetchedResults = await this.repository.fetchByICAO(missingIcaoCodes);
        await this.addToCache(fetchedResults);
        return [...cachedResults, ...fetchedResults];
      }

      return cachedResults;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const aerodrome = this.aerodromes.get(icao);
      if (aerodrome) {
        return [aerodrome];
      }

      const result = await this.repository.fetchByICAO([icao]);
      await this.addToCache(result);
      return result;
    }

    return undefined;
  }

  /**
   * Finds the nearest aerodrome to the given location.
   * 
   * @param location - The geographical location to find the nearest aerodrome to.
   * @param radius - The search radius in kilometers (default is 100 km).
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest aerodrome, or undefined if not found.
   * @throws Error if no aerodromes are available and the repository doesn't support radius search.
   */
  async nearest(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<Aerodrome | undefined> {
    const result = await this.repository.fetchByLocation(location, radius);
    await this.addToCache(result);

    if (!this.aerodromes.size) return undefined;

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const aerodromeCandidates = this.values().filter(airport => !normalizedExclude.includes(normalizeICAO(airport.ICAO)));
    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    return this.aerodromes.get(nearest.properties.icao as ICAO)
  }
}

export default AerodromeService;