import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { CacheService } from "./cache.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * Options for configuring the AerodromeService.
 */
interface AerodromeServiceOptions {
  /**
   * The maximum number of aerodromes to store in the cache.
   * @default 1000
   */
  maxCacheSize?: number
  /**
   * A function to fetch aerodromes by their ICAO codes.
   * @param icao - An array of ICAO codes.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByICAO(icao: readonly ICAO[]): Promise<Aerodrome[]>;
  /**
   * An optional function to fetch aerodromes within a bounding box.
   * @param bbox - A GeoJSON BBox object.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<Aerodrome[]>;
  /**
   * An optional function to fetch aerodromes within a radius of a location.
   * @param location - A GeoJSON Position object representing the center of the search.
   * @param distance - The radius in kilometers.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<Aerodrome[]>;
  /**
   * A function to fetch aerodromes by location, optionally within a specified radius.
   * @param location - A GeoJSON Position object.
   * @param radius - An optional radius in kilometers.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByLocation(location: GeoJSON.Position, radius?: number): Promise<Aerodrome[]>;
}

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @property {CacheService<ICAO, Aerodrome>} cache - Cache service for storing aerodrome data.
 * @throws Error if the repository is not set or doesn't support fetchByICAO.
 * @throws Error if no aerodromes are available and the repository doesn't support radius search.
 */
class AerodromeService {
  private cache: CacheService<ICAO, Aerodrome>;
  private options: AerodromeServiceOptions;

  /**
   * Creates a new instance of the AerodromeService class.
   *
   * @param options - Options for the AerodromeService, including maxCacheSize and repository methods.
   */
  constructor(options: AerodromeServiceOptions) {
    const { maxCacheSize = 1000 } = options;
    this.cache = new CacheService<ICAO, Aerodrome>(maxCacheSize);
    this.options = options;
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
        const fetchedResults = await this.options.fetchByICAO(missingIcaoCodes);
        await this.addToCache(fetchedResults);
        return [...cachedResults, ...fetchedResults];
      }

      return cachedResults;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const aerodrome = this.cache.get(icao);
      if (aerodrome) {
        return [aerodrome];
      }

      const result = await this.options.fetchByICAO([icao]);
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
    const result = await this.options.fetchByLocation(location, radius);
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

  /**
   * Fetches data by geographic location within specified radius.
   * 
   * @param location - The location coordinates [longitude, latitude].
   * @param radius - The radius in kilometers (default: 100, max: 1000).
   * @returns A promise that resolves to an array of data.
   */
  async getByLocation(location: GeoJSON.Position, radius: number = 100): Promise<Aerodrome[]> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

    const radiusRange = Math.min(1000, Math.max(1, radius));
    const resultList: Aerodrome[] = [];

    if (this.options.fetchByRadius) {
      const result = await this.options.fetchByRadius(location, radiusRange);
      resultList.push(...result);
    } else if (this.options.fetchByBbox) {
      const locationPoint = point(location);
      const buffered = buffer(locationPoint, radiusRange, { units: 'kilometers' });
      if (buffered) {
        const searchBbox = bbox(buffered) as GeoJSON.BBox;
        const result = await this.options.fetchByBbox(searchBbox);
        resultList.push(...result);
      }
    } else {
      throw new Error('This service does not implement fetchByRadius or fetchByBbox. At least one of these methods must be implemented to use fetchByLocation.');
    }

    return resultList;
  }
}

export default AerodromeService;