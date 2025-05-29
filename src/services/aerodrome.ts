import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";
import { isICAO, normalizeICAO } from "../utils.js";
import RepositoryBase from "../repository.js";
import { CacheService } from "./cache.js";

import { point, nearestPoint } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @property {CacheService<ICAO, Aerodrome>} cache - Cache service for storing aerodrome data.
 * @property {RepositoryBase<Aerodrome>} repository - Repository for fetching aerodrome data.
 * @throws Error if the repository is not set or doesn't support fetchByICAO.
 * @throws Error if no aerodromes are available and the repository doesn't support radius search.
 */
class AerodromeService {
  private cache: CacheService<ICAO, Aerodrome>;
  private repository: RepositoryBase<Aerodrome>;

  /**
   * Creates a new instance of the AerodromeService class.
   * 
   * @param repository - An optional repository for fetching aerodrome data.
   * @param maxCacheSize - Maximum number of aerodromes to keep in the cache (default: 1000).
   */
  constructor(repository: RepositoryBase<Aerodrome>, maxCacheSize: number = 1_000) {
    this.repository = repository;
    this.cache = new CacheService<ICAO, Aerodrome>(maxCacheSize);
  }

  /**
   * Returns an array of ICAO codes for the aerodromes.
   * 
   * @returns An array of ICAO codes.
   */
  keys(): ICAO[] {
    return this.cache.keys();
  }

  /**
   * Returns an array of aerodromes.
   * 
   * @returns An array of Aerodrome objects.
   */
  values(): Aerodrome[] {
    return this.cache.values();
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
      if (aerodrome.ICAO) {
        this.cache.set(aerodrome.ICAO, aerodrome);
      }
    }
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
        const cachedAerodrome = this.cache.get(code);
        if (cachedAerodrome) {
          cachedResults.push(cachedAerodrome);
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
      const aerodrome = this.cache.get(icao);
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

    if (!this.cache.keys().length) return undefined;

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const aerodromeCandidates = this.values().filter(airport => !normalizedExclude.includes(normalizeICAO(airport.ICAO!))); // TODO: handle undefined ICAO
    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    return this.cache.get(nearest.properties.icao as ICAO);
  }
}

export default AerodromeService;