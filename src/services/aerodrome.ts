import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";
import { AerodromeRepository } from "../repositories/aerodrome.repository.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

export type { AerodromeRepository } from "../repositories/aerodrome.repository.js";

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * Acts as a service layer that handles business logic and validation.
 *
 * @class AerodromeService
 * @throws Error if the repository is not provided.
 */
export class AerodromeService {
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
   * Finds a single aerodrome by ICAO code.
   *
   * @param icao - The ICAO code to search for.
   * @returns A promise that resolves to an Aerodrome object.
   * @throws Error if the ICAO code is invalid or if no aerodrome is found.
   */
  async findOne(icao: string): Promise<Aerodrome> {
    if (!isICAO(icao)) {
      throw new Error(`Invalid ICAO code: ${icao}`);
    }

    const normalizedIcao = normalizeICAO(icao) as ICAO;
    const result = await this.repository.findOne(normalizedIcao);
    if (!result) {
      throw new Error(`Aerodrome not found for ICAO code: ${normalizedIcao}`);
    }
    return result;
  }

  /**
   * Finds multiple aerodromes by ICAO codes.
   *
   * @param icaoCodes - An array of ICAO codes to search for.
   * @returns A promise that resolves to an array of Aerodrome objects.
   * @throws Error if no valid ICAO codes are provided or if no aerodromes are found.
   */
  async findMany(icaoCodes: string[]): Promise<Aerodrome[]> {
    const validIcaoCodes = icaoCodes.filter(code => typeof code === 'string' && isICAO(code)).map(code => normalizeICAO(code)) as ICAO[];
    if (!validIcaoCodes.length) {
      throw new Error(`No valid ICAO codes provided: ${icaoCodes.join(', ')}`);
    }

    const result = await this.repository.findByICAO(validIcaoCodes);
    if (result.length === 0) {
      throw new Error(`No aerodromes found for ICAO codes: ${validIcaoCodes.join(', ')}`);
    }
    return result;
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
}
