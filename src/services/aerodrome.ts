import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";
import { AerodromeRepository } from "../repositories/aerodrome.repository.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * Acts as a service layer that handles business logic and validation.
 * 
 * @class AerodromeService
 * @throws Error if the repository is not provided.
 */
class AerodromeService {
  /**
   * Creates a new instance of the AerodromeService class.
   *
   * @param repository - The aerodrome repository for data operations.
   * @throws Error if the repository is not provided.
   */
  constructor(private repository: AerodromeRepository) {
    if (!repository) {
      throw new Error('AerodromeService requires a repository instance.');
    }
  }

  /**
   * Finds aerodrome(s) by ICAO code(s).
   *
   * @param icao - A single ICAO code or an array of ICAO codes to search for.
   * @returns A promise that resolves to:
   *   - A single Aerodrome object when a string is provided
   *   - An array of Aerodrome objects when an array is provided
   * @throws Error if invalid ICAO codes are provided or if no aerodromes are found.
   */
  async findOne(icao: string): Promise<Aerodrome>;
  async findOne(icao: string[]): Promise<Aerodrome[]>;
  async findOne(icao: string | string[]): Promise<Aerodrome | Aerodrome[]> {
    if (Array.isArray(icao)) {
      const validIcaoCodes = icao.filter(code => typeof code === 'string' && isICAO(code)).map(code => normalizeICAO(code)) as ICAO[];
      if (!validIcaoCodes.length) {
        throw new Error(`No valid ICAO codes provided: ${icao.join(', ')}`);
      }

      const result = await this.repository.findByICAO(validIcaoCodes);
      if (result.length === 0) {
        throw new Error(`No aerodromes found for ICAO codes: ${validIcaoCodes.join(', ')}`);
      }
      return result;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const normalizedIcao = normalizeICAO(icao) as ICAO;
      const result = await this.repository.findOne(normalizedIcao);
      if (!result) {
        throw new Error(`Aerodrome not found for ICAO code: ${normalizedIcao}`);
      }
      return result;
    } else {
      throw new Error(`Invalid ICAO code: ${icao}`);
    }
  }

  /**
   * Finds the nearest aerodrome to the given location.
   * 
   * @param location - The geographical location to find the nearest aerodrome to.
   * @param radius - The search radius in kilometers (default is 100 km).
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest aerodrome.
   * @throws Error if no aerodromes are found within the specified radius.
   */
  async nearest(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<Aerodrome> {
    const aerodromes = await this.getByLocation(location, radius);

    if (aerodromes.length === 0) {
      throw new Error(`No aerodromes found within ${radius}km of location [${location[0]}, ${location[1]}]`);
    }

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const aerodromeCandidates = aerodromes.filter(airport => !normalizedExclude.includes(normalizeICAO(airport.ICAO!))); // TODO: handle undefined ICAO

    if (aerodromeCandidates.length === 0) {
      throw new Error(`No aerodromes found within ${radius}km of location [${location[0]}, ${location[1]}] after excluding: ${exclude.join(', ')}`);
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    const result = aerodromeCandidates.find(airport => airport.ICAO === nearest.properties.icao);
    if (!result) {
      throw new Error('Failed to find nearest aerodrome');
    }
    return result;
  }

  /**
   * Fetches data by geographic location within specified radius.
   * 
   * @param location - The location coordinates [longitude, latitude].
   * @param radius - The radius in kilometers (default: 100, max: 1000).
   * @returns A promise that resolves to an array of aerodromes.
   */
  async getByLocation(location: GeoJSON.Position, radius: number = 100): Promise<Aerodrome[]> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

    const radiusRange = Math.min(1000, Math.max(1, radius));

    if (this.repository.findByRadius) {
      return await this.repository.findByRadius(location, radiusRange);
    }

    if (this.repository.findByBbox) {
      const locationPoint = point(location);
      const buffered = buffer(locationPoint, radiusRange, { units: 'kilometers' });
      if (buffered) {
        const searchBbox = bbox(buffered) as GeoJSON.BBox;
        return await this.repository.findByBbox(searchBbox);
      }
    }

    throw new Error('This repository does not implement findByRadius or findByBbox. At least one of these methods must be implemented to use getByLocation.');
  }

  /**
   * Checks if an aerodrome exists.
   * 
   * @param icaoCode - The ICAO code of the aerodrome to check.
   * @returns A promise that resolves to true if the aerodrome exists, false otherwise.
   * @throws Error if the ICAO code is invalid.
   */
  async exists(icaoCode: string): Promise<boolean> {
    if (!isICAO(icaoCode)) {
      throw new Error(`Invalid ICAO code: ${icaoCode}`);
    }

    const normalizedIcao = normalizeICAO(icaoCode) as ICAO;
    return await this.repository.exists(normalizedIcao);
  }
}

export default AerodromeService;