import { ICAO, MetarStation } from "./index.js";
import { Aerodrome } from "./airport.js";
import { isICAO, normalizeICAO } from "./utils.js";
import { bbox, buffer, point, nearestPoint, bboxPolygon } from "@turf/turf";
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
 * AerodromeServiceOptions interface defines the options for initializing the AerodromeService.
 * 
 * @interface AerodromeServiceOptions
 * @property {Aerodrome[]} [aerodromes] - Optional array of aerodromes to initialize the service with.
 * @property {RepositoryBase<Aerodrome>} [repository] - Optional repository for fetching aerodrome data.
 * @property {WeatherService} [weatherService] - Optional weather service for fetching METAR data.
 */
export interface AerodromeServiceOptions {
  aerodromes?: Aerodrome[];
  repository?: RepositoryBase<Aerodrome>;
  weatherService?: WeatherService;
}

/**
 * AerodromeService class provides methods to manage and retrieve aerodrome data.
 * 
 * @class AerodromeService
 * @property {Map<ICAO, Aerodrome>} aerodromes - A map of ICAO codes to Aerodrome objects.
 * @property {RepositoryBase<Aerodrome>} [repository] - Optional repository for fetching aerodrome data.
 * @property {WeatherService} [weatherService] - Optional weather service for fetching METAR data.
 */
export class AerodromeService {
  private aerodromes: Map<ICAO, Aerodrome>;
  private repository?: RepositoryBase<Aerodrome>;
  private weatherService?: WeatherService;

  /**
   * Creates a new instance of the AerodromeService class.
   * 
   * @param options - An object containing optional properties for initializing the service.
   * @returns An instance of the AerodromeService class.
   */
  constructor(options: AerodromeServiceOptions = {}) {
    this.repository = options.repository;
    this.weatherService = options.weatherService;
    this.aerodromes = options.aerodromes
      ? new Map(options.aerodromes.map(aerodrome => [normalizeICAO(aerodrome.ICAO), aerodrome]))
      : new Map();
  }

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
      // TODO: We're better off using a bounding box to fetch the METAR stations
      await this.weatherService.update(aerodromeWithoutMetar.map(aerodrome => aerodrome.ICAO));

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
        if (metar) {
          aerodrome.metarStation = metar;
        }
      }
      return aerodrome;
    } else if (this.repository) {
      const result = await this.repository.fetchByICAO([normalizedIcao]);
      await this.add(result);
    }

    return this.aerodromes.get(normalizedIcao);
  }

  /**
   * Finds the nearest aerodrome to the given location.
   * 
   * @param location - The geographical location to find the nearest aerodrome to.
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest aerodrome, or undefined if not found.
   */
  async nearest(location: GeoJSON.Position, exclude: string[] = []): Promise<Aerodrome | undefined> {
    if (this.aerodromes.size === 0 && this.repository && this.repository.fetchByRadius) {
      const result = await this.repository.fetchByRadius(location, 100);
      await this.add(result);

      if (this.aerodromes.size === 0) {
        return undefined;
      }
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

/**
 * Options for initializing a WeatherService instance.
 * 
 * @interface WeatherStationOptions
 * @property {MetarStation[]} [metarStations] - Optional array of METAR stations to initialize the service with.
 * @property {AbstractMetarRepository} [repository] - Optional repository for fetching METAR data.
 */
export interface WeatherStationOptions {
  metarStations?: MetarStation[];
  repository?: RepositoryBase<MetarStation>;
}

/**
 * WeatherService class provides methods to manage and retrieve METAR station data.
 * 
 * @class WeatherService
 * @property {Map<ICAO, MetarStation>} metarStations - A map of ICAO codes to MetarStation objects.
 * @property {RepositoryBase<MetarStation>} [repository] - Optional repository for fetching METAR data.
 */
export class WeatherService {
  private metarStations: Map<ICAO, MetarStation>;
  private repository?: RepositoryBase<MetarStation>;

  /**
   * Creates a new instance of the WeatherService class.
   * 
   * @param metarStations - An optional array of METAR stations to initialize the service with.
   * @returns An instance of the WeatherService class.
   */
  constructor(options: WeatherStationOptions = {}) {
    this.repository = options.repository;
    this.metarStations = options.metarStations
      ? new Map(options.metarStations.map(metar => [normalizeICAO(metar.station), metar]))
      : new Map();
  }

  /**
   * Returns an array of ICAO codes for the METAR stations.
   * 
   * @returns An array of ICAO codes.
   */
  keys(): ICAO[] {
    return Array.from(this.metarStations.keys());
  }

  /**
   * Returns an array of METAR stations.
   * 
   * @returns An array of METAR stations.
   */
  values(): MetarStation[] {
    return Array.from(this.metarStations.values());
  }

  /**
   * Adds a METAR station to the service.
   * 
   * @param metar - The METAR station to add.
   */
  async add(stations: MetarStation | MetarStation[]): Promise<void> {
    let metarArray: MetarStation[] = [];
    if (Array.isArray(stations)) {
      metarArray = stations;
    } else {
      metarArray = [stations];
    }

    metarArray.forEach(metar => {
      const normalizedICAO = normalizeICAO(metar.station);
      if (isICAO(normalizedICAO)) {
        this.metarStations.set(normalizedICAO, metar);
      }
    });
  }

  /**
   * Refreshes the METAR stations based on the provided search query or bounding box.
   * 
   * @param search - The search string, array of ICAO codes, or bounding box to use for refreshing METAR stations.
   * @param extend - Optional distance in kilometers to extend the bounding box.
   */
  async update(search?: string | string[] | GeoJSON.BBox, extend?: number): Promise<void> {
    if (!this.repository || !this.repository.fetchByICAO || !this.repository.fetchByBbox) {
      throw new Error('Repository not set or does not support fetchByICAO or fetchByBbox');
    }

    if (search === undefined) {
      const result = await this.repository.fetchByICAO(Array.from(this.metarStations.keys()));
      await this.add(result);
    } else if (Array.isArray(search) && search.length === 4 && search.every(item => typeof item === 'number')) {
      const bboxPoly = bboxPolygon(search as GeoJSON.BBox);
      const featureBuffer = buffer(bboxPoly, extend || 0, { units: 'kilometers' });
      if (featureBuffer) {
        const extendedBbox = bbox(featureBuffer) as GeoJSON.BBox;

        const result = await this.repository.fetchByBbox(extendedBbox);
        await this.add(result);
      }
    } else if (Array.isArray(search) && search.every(item => typeof item === 'string')) {
      const result = await this.repository.fetchByICAO(search.filter(code => isICAO(code)) as ICAO[]);
      await this.add(result);
    } else if (typeof search === 'string' && isICAO(search)) {
      const result = await this.repository.fetchByICAO([search]);
      await this.add(result);
    }
  }

  /**
   * Finds a METAR station by its ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @returns A promise that resolves to the METAR station, or undefined if not found.
   */
  async get(icao: string): Promise<MetarStation | undefined> {
    if (!this.repository || !this.repository.fetchByICAO) {
      throw new Error('Repository not set or does not support fetchByICAO');
    }

    const normalizedICAO = normalizeICAO(icao);
    const metarResults = await this.repository.fetchByICAO([normalizedICAO]);
    if (metarResults.length === 0) {
      return undefined;
    }

    const metarStation = metarResults[0];
    if (isICAO(metarStation.station)) {
      return metarStation;
    }

    return undefined;
  }

  /**
   * Finds the nearest METAR station to the given location.
   * 
   * @param location - The geographical location to find the nearest METAR station to.
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest METAR station, or undefined if not found.
   */
  async nearest(location: GeoJSON.Position, exclude: string[] = []): Promise<MetarStation | undefined> {
    // if (this.metarStations.size === 0) {
    //   await this.update(location, 100);

    //   if (this.metarStations.size === 0) {
    //     return undefined;
    //   }
    // }

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const metarCandidates = this.values().filter(metar => !normalizedExclude.includes(normalizeICAO(metar.station)));
    if (metarCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => {
      return point(metar.coords, { station: metar.station });
    })));

    return this.metarStations.get(nearest.properties?.station);
  }
}
