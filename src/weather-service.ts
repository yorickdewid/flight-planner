import { ICAO, MetarStation } from "./index.js";
import { isICAO, normalizeICAO } from "./utils.js";
import { bbox, buffer, point, nearestPoint } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * RepositoryBase interface defines the methods for fetching data from a repository.
 * 
 * @interface RepositoryBase<T>
 * @template T - The type of data to be fetched.
 * @property {function(ICAO[]): Promise<T[]>} fetchByICAO - Fetches data by ICAO codes.
 * @property {function(GeoJSON.BBox): Promise<T[]>} [fetchByBbox] - Optional method to fetch data by bounding box.
 * @property {function(GeoJSON.Position, number): Promise<T[]>} [fetchByRadius] - Optional method to fetch data by radius.
 */
export interface RepositoryBase<T> {
  fetchByICAO(icao: ICAO[]): Promise<T[]>;
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;
}

/**
 * WeatherService class provides methods to manage and retrieve METAR station data.
 * 
 * @class WeatherService
 * @property {RepositoryBase<MetarStation>} [repository] - Optional repository for fetching METAR data.
 */
export class WeatherService {
  /**
   * Creates a new instance of the WeatherService class.
   *
   * @param repository - An optional repository for fetching METAR data.
   * @returns An instance of the WeatherService class.
   */
  constructor(
    private repository: RepositoryBase<MetarStation>,
  ) { }

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
      if (validIcaoCodes.length === 0) {
        return undefined;
      }

      const result = await this.repository.fetchByICAO(validIcaoCodes);
      return result.length > 0 ? result : undefined;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const result = await this.repository.fetchByICAO([icao]);
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
    const radiusRange = Math.min(1000, Math.max(1, radius));

    const metarStations: Map<ICAO, MetarStation> = new Map();
    if (this.repository.fetchByRadius) {
      const result = await this.repository.fetchByRadius(location, radiusRange);
      result.forEach(metar => metarStations.set(normalizeICAO(metar.station), metar));
    } else if (this.repository.fetchByBbox) {
      const locationPoint = point(location);
      const buffered = buffer(locationPoint, radiusRange, { units: 'kilometers' });
      if (buffered) {
        const searchBbox = bbox(buffered) as GeoJSON.BBox;
        const result = await this.repository.fetchByBbox(searchBbox);
        result.forEach(metar => metarStations.set(normalizeICAO(metar.station), metar));
      }
    } else {
      throw new Error('Repository does not support fetchByRadius or fetchByBbox');
    }

    if (metarStations.size === 0) {
      return undefined;
    }

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
}