import { ICAO, MetarStation } from "../index.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';
import { WeatherRepository } from "../repositories/weather.repository.js";

/**
 * WeatherService class provides methods to manage and retrieve METAR station data.
 * 
 * @class WeatherService
 * @property {RepositoryBase<MetarStation>} [repository] - Optional repository for fetching METAR data.
 */
class WeatherService {
  /**
   * Creates a new instance of the WeatherService class.
   * 
   * @param repository - The weather repository for data operations.
   * @throws Error if the repository is not provided.
   */
  constructor(private repository: WeatherRepository) {
    if (!repository) {
      throw new Error('WeatherService requires a repository instance.');
    }
  }

  /**
   * Finds METAR station(s) by ICAO code(s).
   *
   * @param icao - A single ICAO code or an array of ICAO codes to search for.
   * @returns A promise that resolves to:
   *   - A single MetarStation object when a string is provided
   *   - An array of MetarStation objects when an array is provided
   * @throws Error if invalid ICAO codes are provided or if no stations are found.
   */
  async findOne(icao: string): Promise<MetarStation>;
  async findOne(icao: string[]): Promise<MetarStation[]>;
  async findOne(icao: string | string[]): Promise<MetarStation | MetarStation[]> {
    if (Array.isArray(icao)) {
      const validIcaoCodes = icao.filter(code => typeof code === 'string' && isICAO(code)).map(code => normalizeICAO(code)) as ICAO[];
      if (!validIcaoCodes.length) {
        throw new Error(`No valid ICAO codes provided: ${icao.join(', ')}`);
      }

      const result = await this.repository.findByICAO(validIcaoCodes);
      if (result.length === 0) {
        throw new Error(`No METAR stations found for ICAO codes: ${validIcaoCodes.join(', ')}`);
      }
      return result;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const normalizedIcao = normalizeICAO(icao) as ICAO;
      const result = await this.repository.findOne(normalizedIcao);
      if (!result) {
        throw new Error(`METAR station not found for ICAO code: ${normalizedIcao}`);
      }
      return result;
    } else {
      throw new Error(`Invalid ICAO code: ${icao}`);
    }
  }

  /**
   * Finds the nearest METAR station to the given location.
   * 
   * @param location - The geographical location to find the nearest METAR station to.
   * @param radius - The search radius in kilometers (default is 100 km).
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest METAR station.
   * @throws Error if no METAR stations are found within the specified radius.
   */
  async nearest(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<MetarStation> {
    const metarStations: Map<ICAO, MetarStation> = new Map();

    const result = await this.getByLocation(location, radius);
    result.forEach(metar => metarStations.set(normalizeICAO(metar.station), metar));

    if (!metarStations.size) {
      throw new Error(`No METAR stations found within ${radius}km of location [${location[0]}, ${location[1]}]`);
    }

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const metarCandidates = Array.from(metarStations.values()).filter(metar => !normalizedExclude.includes(normalizeICAO(metar.station)));
    if (metarCandidates.length === 0) {
      throw new Error(`No METAR stations found within ${radius}km of location [${location[0]}, ${location[1]}] after excluding: ${exclude.join(', ')}`);
    }

    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => point(metar.coords, { station: metar.station }))));
    const stationId = nearest.properties?.station;
    if (typeof stationId !== 'string') {
      throw new Error('Failed to determine nearest station ID');
    }

    const nearestStation = metarStations.get(normalizeICAO(stationId));
    if (!nearestStation) {
      throw new Error('Failed to find nearest METAR station');
    }
    return nearestStation;
  }

  /**
   * Fetches data by geographic location within specified radius.
   * 
   * @param location - The location coordinates [longitude, latitude].
   * @param radius - The radius in kilometers (default: 100, max: 1000).
   * @returns A promise that resolves to an array of data.
   */
  async getByLocation(location: GeoJSON.Position, radius: number = 100): Promise<MetarStation[]> {
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
   * Checks if a METAR station exists.
   * 
   * @param icaoCode - The ICAO code of the METAR station to check.
   * @returns A promise that resolves to true if the METAR station exists, false otherwise.
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

export default WeatherService;