import { ICAO, MetarStation } from "../index.js";
import { isICAO, normalizeICAO } from "../utils.js";
import RepositoryBase from "../repository.js";

import { point, nearestPoint } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

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
   * @param repository - An optional repository for fetching METAR data.
   * @returns An instance of the WeatherService class.
   */
  constructor(private repository: RepositoryBase<MetarStation>) { }

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
    const metarStations: Map<ICAO, MetarStation> = new Map();

    const result = await this.repository.fetchByLocation(location, radius);
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
}

export default WeatherService;