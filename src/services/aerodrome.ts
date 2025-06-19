import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * Options for configuring the AerodromeService.
 */
export interface AerodromeServiceOptions {
  /**
   * A function to fetch aerodromes by their ICAO codes.
   * 
   * @param icao - An array of ICAO codes.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByICAO(icao: readonly ICAO[]): Promise<Aerodrome[]>;

  /**
   * An optional function to fetch aerodromes within a bounding box.
   * 
   * @param bbox - A GeoJSON BBox object.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<Aerodrome[]>;

  /**
   * An optional function to fetch aerodromes within a radius of a location.
   * 
   * @param location - A GeoJSON Position object representing the center of the search.
   * @param distance - The radius in kilometers.
   * @returns A promise that resolves to an array of Aerodrome objects.
   */
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<Aerodrome[]>;
}

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @throws Error if the repository is not set or doesn't support fetchByICAO.
 * @throws Error if no aerodromes are available and the repository doesn't support radius search.
 */
class AerodromeService {
  /**
   * Creates a new instance of the AerodromeService class.
   *
   * @param options - Options for the AerodromeService, including repository methods.
   */
  constructor(private options: AerodromeServiceOptions) {
    if (!options.fetchByICAO) {
      throw new Error('AerodromeService requires a fetchByICAO method in options.');
    }
  }

  /**
   * Finds aerodromes by ICAO code(s).
   *
   * @param icao - A single ICAO code or an array of ICAO codes to search for.
   * @returns A promise that resolves to an array of Aerodrome objects, or undefined if not found.
   * @throws Error if the repository is not set or doesn't support fetchByICAO.
   */
  get(icao: string | string[]): Promise<Aerodrome[] | undefined> {
    if (Array.isArray(icao)) {
      const validIcaoCodes = icao.filter(code => typeof code === 'string' && isICAO(code)) as ICAO[];
      if (!validIcaoCodes.length) return Promise.resolve(undefined);

      return this.options.fetchByICAO(validIcaoCodes);
    } else if (typeof icao === 'string' && isICAO(icao)) {
      return this.options.fetchByICAO([icao]);
    }

    return Promise.resolve(undefined);
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
    const aerodromes = await this.getByLocation(location, radius);

    if (aerodromes.length === 0) return undefined;

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const aerodromeCandidates = aerodromes.filter(airport => !normalizedExclude.includes(normalizeICAO(airport.ICAO!))); // TODO: handle undefined ICAO

    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    return aerodromeCandidates.find(airport => airport.ICAO === nearest.properties.icao);
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