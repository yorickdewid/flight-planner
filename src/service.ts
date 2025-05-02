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

export class AerodromeService {
  private aerodromes: Map<string, Aerodrome>;
  private repository?: RepositoryBase<Aerodrome>;
  private weatherService?: WeatherService;

  constructor(options: AerodromeServiceOptions = {}) {
    this.repository = options.repository;
    this.weatherService = options.weatherService;
    this.aerodromes = options.aerodromes
      ? new Map(options.aerodromes.map(aerodrome => [normalizeICAO(aerodrome.ICAO), aerodrome]))
      : new Map();
  }

  get aerodromesList(): Aerodrome[] {
    return Array.from(this.aerodromes.values());
  }

  addAerodromes(aerodromes: Aerodrome | Aerodrome[]): void {
    let aerodromeArray: Aerodrome[] = [];
    if (Array.isArray(aerodromes)) {
      aerodromeArray = aerodromes;
    } else {
      aerodromeArray = [aerodromes];
    }

    // TODO: Filter all aerodromes that do not have a metar station set.

    aerodromeArray.forEach(aerodrome => {
      const normalizedICAO = normalizeICAO(aerodrome.ICAO);
      if (isICAO(normalizedICAO)) {
        this.aerodromes.set(normalizedICAO, aerodrome);
      }
    });
  }

  async refreshByRadius(location: GeoJSON.Position, distance: number = 50): Promise<void> {
    if (!this.repository || !this.repository.fetchByRadius) {
      throw new Error('Repository not set or does not support fetchByRadius');
    }

    const result = await this.repository.fetchByRadius(location, distance);
    this.addAerodromes(result);
  }

  // TODO: Check if isICAO
  async findByICAO(icao: string): Promise<Aerodrome | undefined> {
    const normalizedIcao = normalizeICAO(icao);

    const aerodrome = this.aerodromes.get(normalizedIcao);
    if (aerodrome) {
      return aerodrome;
    } else if (this.repository) {
      const result = await this.repository.fetchByICAO([normalizedIcao]);
      this.addAerodromes(result);
    }
  }

  async nearestAerodrome(location: GeoJSON.Position, exclude: string[] = []): Promise<Aerodrome | undefined> {
    if (this.aerodromes.size === 0) {
      await this.refreshByRadius(location, 100);

      if (this.aerodromes.size === 0) {
        return undefined;
      }
    }

    const normalizedExclude = exclude.map(icao => icao.toUpperCase());
    const aerodromeCandidates = Array.from(this.aerodromes.values())
      .filter(airport => !normalizedExclude.includes(airport.ICAO.toUpperCase()));

    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    // Create a feature collection of points
    const points = aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    });

    const nearest = nearestPoint(location, featureCollection(points));
    if (!nearest?.properties?.icao) {
      return undefined;
    }

    return this.findByICAO(nearest.properties.icao as string);
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

// TODO: This can later be improved with geohashing
export class WeatherService {
  private metarStations: Map<string, MetarStation>;
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
   * Returns the METAR stations.
   * 
   * @returns An array of METAR stations.
   */
  get stations(): MetarStation[] {
    return Array.from(this.metarStations.values());
  }

  /**
   * Adds a METAR station to the service.
   * 
   * @param metar - The METAR station to add.
   */
  addStations(stations: MetarStation | MetarStation[]): void {
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
  async refreshStations(search?: string | string[] | GeoJSON.BBox, extend?: number): Promise<void> {
    if (!this.repository || !this.repository.fetchByICAO || !this.repository.fetchByBbox) {
      throw new Error('Repository not set or does not support fetchByICAO or fetchByBbox');
    }

    if (search === undefined) {
      const result = await this.repository.fetchByICAO(Array.from(this.metarStations.keys()));
      this.addStations(result);
    } else if (Array.isArray(search) && search.length === 4 && search.every(item => typeof item === 'number')) {
      const bboxPoly = bboxPolygon(search as GeoJSON.BBox);
      const featureBuffer = buffer(bboxPoly, extend || 0, { units: 'kilometers' });
      if (featureBuffer) {
        const extendedBbox = bbox(featureBuffer) as GeoJSON.BBox;

        const result = await this.repository.fetchByBbox(extendedBbox);
        this.addStations(result);
      }
    } else if (Array.isArray(search) && search.every(item => typeof item === 'string')) {
      const result = await this.repository.fetchByICAO(search.filter(code => isICAO(code)) as ICAO[]);
      this.addStations(result);
    } else if (typeof search === 'string' && isICAO(search)) {
      const result = await this.repository.fetchByICAO([search]);
      this.addStations(result);
    }
  }

  /**
   * Finds a METAR station by its ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @returns A promise that resolves to the METAR station, or undefined if not found.
   */
  findByICAO(icao: string): MetarStation | undefined {
    return this.metarStations.get(normalizeICAO(icao))
  }

  // TODO: location -> location: GeoJSON.Position
  /**
   * Finds the nearest METAR station to the specified location.
   * 
   * @param location - The location as a GeoJSON Point to find the nearest station to.
   * @param exclude - Optional array of station IDs to exclude from the search.
   * @returns The nearest METAR station, or undefined if none found or if no candidates available.
   */
  nearestStation(location: GeoJSON.Point, exclude: string[] = []): MetarStation | undefined {
    const metarCandidates = this.stations.filter(metar => !exclude.includes(metar.station));
    if (metarCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => {
      return point(metar.coords, { station: metar.station });
    })));

    return this.metarStations.get(nearest.properties?.station);
  }
}
