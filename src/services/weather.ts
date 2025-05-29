import { ICAO, MetarStation } from "../index.js";
import { isICAO, normalizeICAO } from "../utils.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * Options for configuring the WeatherService.
 */
export interface WeatherServiceOptions {
  /**
   * Fetches METAR stations by ICAO codes.
   * 
   * @param icao - An array of ICAO codes.
   * @returns A promise that resolves to an array of METAR stations.
   */
  fetchByICAO(icao: readonly ICAO[]): Promise<MetarStation[]>;

  /**
   * Fetches METAR stations by bounding box.
   * 
   * @param bbox - A GeoJSON bounding box.
   * @returns A promise that resolves to an array of METAR stations.
   */
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<MetarStation[]>;

  /**
   * Fetches METAR stations by radius from a location.
   * 
   * @param location - A GeoJSON position (longitude, latitude).
   * @param distance - The radius in kilometers.
   * @returns A promise that resolves to an array of METAR stations.
   */
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<MetarStation[]>;
}

/**
 * WeatherService class provides methods to manage and retrieve METAR station data.
 * 
 * @class WeatherService
 * @property {RepositoryBase<MetarStation>} [repository] - Optional repository for fetching METAR data.
 */
class WeatherService {
  constructor(private options: WeatherServiceOptions) { }

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

      const result = await this.options.fetchByICAO(validIcaoCodes);
      return result.length > 0 ? result : undefined;
    } else if (typeof icao === 'string' && isICAO(icao)) {
      const result = await this.options.fetchByICAO([icao]);
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
    const resultList: MetarStation[] = [];

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

export default WeatherService;