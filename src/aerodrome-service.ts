import { ICAO } from "./index.js";
import { Aerodrome } from "./airport.js";
import { isICAO, normalizeICAO } from "./utils.js";
import WeatherService from "./weather-service.js";
import RepositoryBase from "./repository.js";

import { point, nearestPoint } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @property {Map<ICAO, Aerodrome>} aerodromes - A map of ICAO codes to Aerodrome objects.
 * @property {RepositoryBase<Aerodrome>} [repository] - Optional repository for fetching aerodrome data.
 * @property {WeatherService} [weatherService] - Optional weather service for fetching METAR data.
 */
class AerodromeService {
  private aerodromes: Map<ICAO, Aerodrome> = new Map();

  /**
   * Creates a new instance of the AerodromeService class.
   * 
   * @param repository - An optional repository for fetching aerodrome data.
   * @param weatherService - An optional weather service for fetching METAR data.
   */
  constructor(
    private repository: RepositoryBase<Aerodrome>,
    private weatherService?: WeatherService
  ) { }

  /**
   * Returns an array of ICAO codes for the aerodromes.
   * 
   * @returns An array of ICAO codes.
   */
  keys(): ICAO[] {
    return Array.from(this.aerodromes.keys());
  }

  /**
   * Returns an array of aerodromes.
   * 
   * @returns An array of Aerodrome objects.
   */
  values(): Aerodrome[] {
    return Array.from(this.aerodromes.values());
  }

  /**
   * Adds aerodromes to the service.
   * 
   * @param aerodromes - An array of Aerodrome objects or a single Aerodrome object to add.
   */
  async add(aerodromes: Aerodrome | Aerodrome[]): Promise<void> {
    let aerodromeArray: Aerodrome[] = [];
    if (Array.isArray(aerodromes)) {
      aerodromeArray = aerodromes;
    } else {
      aerodromeArray = [aerodromes];
    }

    const aerodromeWithoutMetar: Aerodrome[] = [];
    aerodromeArray.forEach(aerodrome => {
      const normalizedICAO = normalizeICAO(aerodrome.ICAO);
      if (isICAO(normalizedICAO)) {
        this.aerodromes.set(normalizedICAO, aerodrome);
        // TODO: calculate geohash
        if (!aerodrome.metarStation) {
          aerodromeWithoutMetar.push(aerodrome);
        }
      }
    });

    if (this.weatherService && aerodromeWithoutMetar.length > 0) {
      for (const aerodrome of aerodromeWithoutMetar) {
        if (aerodrome.location && aerodrome.location.geometry && aerodrome.location.geometry.coordinates) {
          const nearestMetar = await this.weatherService.nearest(aerodrome.location.geometry.coordinates);
          if (nearestMetar) {
            aerodrome.metarStation = nearestMetar;
            this.aerodromes.set(normalizeICAO(aerodrome.ICAO), aerodrome);
          }
        }
      }
    }
  }

  // TODO: Check if isICAO
  /**
   * Finds an aerodrome by its ICAO code.
   * 
   * @param icao - The ICAO code of the aerodrome.
   * @returns A promise that resolves to the aerodrome, or undefined if not found.
   */
  async get(icao: string): Promise<Aerodrome | undefined> {
    const normalizedIcao = normalizeICAO(icao);

    const aerodrome = this.aerodromes.get(normalizedIcao);
    if (aerodrome) {
      if (this.weatherService && aerodrome.metarStation) {
        const metar = await this.weatherService.get(aerodrome.metarStation.station);
        if (metar && metar.length > 0) {
          aerodrome.metarStation = metar[0];
        }
      }
      return aerodrome;
    } else {
      const result = await this.repository.fetchByICAO([normalizedIcao]);
      await this.add(result);
    }

    return this.aerodromes.get(normalizedIcao);
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
    if (!this.repository || !this.repository.fetchByRadius) {
      throw new Error('Repository not set or does not support fetchByRadius');
    }

    const radiusRange = Math.min(1000, Math.max(1, radius));

    const result = await this.repository.fetchByRadius(location, radiusRange);
    await this.add(result);

    if (this.aerodromes.size === 0) {
      return undefined;
    }

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const aerodromeCandidates = this.values().filter(airport => !normalizedExclude.includes(normalizeICAO(airport.ICAO)));
    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    return this.get(nearest.properties.icao as string);
  }
}

export default AerodromeService;