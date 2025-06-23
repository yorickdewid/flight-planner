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
   * @param icao - The ICAO code(s) of the METAR station(s) to find.
   * @returns A promise that resolves to an array of METAR stations, or undefined if none found.
   * @throws Error if the repository is not set or doesn't support fetchByICAO.
   */
  async get(icao: string | string[]): Promise<MetarStation[] | undefined> {
    if (Array.isArray(icao)) {
      const validIcaoCodes = icao.filter(code => typeof code === 'string' && isICAO(code)) as ICAO[];
      if (!validIcaoCodes.length) return undefined;

      const result = await this.repository.findByICAO(validIcaoCodes);
      return result.length > 0 ? result : undefined;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const result = await this.repository.findByICAO([icao]);
      return result.length > 0 ? result : undefined;
    }

    return undefined;
  }

  /**
   * Finds the nearest METAR station to the given location.
   * 
   * @param location - The geographical location to find the nearest METAR station to.
   * @param radius - The search radius in kilometers (default is 100 km).
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest METAR station, or undefined if not found.
   * @throws Error if the repository is not set or if no appropriate fetch method is available.
   */
  async nearest(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<MetarStation | undefined> {
    const metarStations: Map<ICAO, MetarStation> = new Map();

    const result = await this.getByLocation(location, radius);
    result.forEach(metar => metarStations.set(normalizeICAO(metar.station), metar));

    if (!metarStations.size) return undefined;

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const metarCandidates = Array.from(metarStations.values()).filter(metar => !normalizedExclude.includes(normalizeICAO(metar.station)));
    if (metarCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => point(metar.coords, { station: metar.station }))));
    const stationId = nearest.properties?.station;
    if (typeof stationId !== 'string') {
      return undefined;
    }
    return metarStations.get(normalizeICAO(stationId));
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
   * Finds a single METAR station by its ICAO code.
   * 
   * @param icaoCode - The ICAO code to search for.
   * @returns A promise that resolves to the MetarStation object or null if not found.
   * @throws Error if the ICAO code is invalid.
   */
  async findOne(icaoCode: string): Promise<MetarStation | null> {
    if (!isICAO(icaoCode)) {
      throw new Error(`Invalid ICAO code: ${icaoCode}`);
    }

    const normalizedIcao = normalizeICAO(icaoCode) as ICAO;
    return await this.repository.findOne(normalizedIcao);
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