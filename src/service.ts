import { AerodromeRepository, ICAO, MetarStation } from "./index.js";
import { Aerodrome } from "./airport.js";
import { normalizeICAO } from "./utils.js";
import { bbox, buffer, point, nearestPoint, bboxPolygon } from "@turf/turf";
import { featureCollection } from '@turf/helpers';
import { parseMetar } from "metar-taf-parser";
import { fromIMetar } from "./metar.js";

export type FnFetchAerodrome = (icao: string) => Promise<Aerodrome>;

// TODO: Copy from byteflight app
export class AerodromeService implements AerodromeRepository {
  private aerodromes: Map<string, Aerodrome>;
  private fetchAerodrome?: FnFetchAerodrome;

  constructor(aerodromes: Aerodrome[] = []) {
    this.aerodromes = new Map(aerodromes.map(aerodrome => [aerodrome.ICAO, aerodrome]));
  }

  set fetchFunction(fnFetchAerodrome: FnFetchAerodrome) {
    this.fetchAerodrome = fnFetchAerodrome;
  }

  async findByICAO(icao: string): Promise<Aerodrome | undefined> {
    const icaoNormalized = normalizeICAO(icao);

    const aerodrome = this.aerodromes.get(icaoNormalized);
    if (aerodrome) {
      return aerodrome;
    } else if (this.fetchAerodrome) {
      const fetchedAerodrome = await this.fetchAerodrome(icaoNormalized);
      this.aerodromes.set(icaoNormalized, fetchedAerodrome);
      return fetchedAerodrome;
    }

    return undefined;
  }

  /**
   * Finds the nearest aerodrome to the specified location.
   * 
   * @param location - The location as a GeoJSON Position to find the nearest aerodrome to.
   * @param exclude - Optional array of ICAO codes to exclude from the search.
   * @returns A Promise that resolves to the nearest aerodrome, or undefined if none found.
   */
  public async nearestAerodrome(location: GeoJSON.Position, exclude: string[] = []): Promise<Aerodrome | undefined> {
    const aerodromeCandidates = Array.from(this.aerodromes.values()).filter(airport => !exclude.includes(airport.ICAO));

    if (aerodromeCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    // Use findByICAO to benefit from the fetch mechanism if not found locally
    return this.findByICAO(nearest.properties?.icao);
  }
}

/**
 * Abstract class representing a repository for METAR stations.
 * 
 * @abstract
 * @class AbstractMetarRepository
 * @property {Function} toMetarStation - Converts a METAR string to a MetarStation object.
 * @property {Function} fetchByICAO - Fetches a METAR station by its ICAO code.
 * @property {Function} fetchByBbox - Fetches METAR stations within a bounding box.
 */
export abstract class AbstractMetarRepository {
  /**
   * Converts a METAR string to a MetarStation object.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @param metar - The METAR string to convert.
   * @param coords - The geographical coordinates of the station.
   * @returns A MetarStation object.
   */
  toMetarStation(icao: ICAO, metar: string, coords: GeoJSON.Position): MetarStation {
    const metarData = fromIMetar(parseMetar(metar));
    return { station: icao, metarData, coords };
  }

  /**
   * Fetches METAR stations based on a search query or bounding box.
   * 
   * @param search - The search string or bounding box to use for fetching METAR stations.
   * @returns A promise that resolves to an array of METAR stations.
   */
  query(search: string | GeoJSON.BBox): Promise<MetarStation[] | MetarStation | undefined> {
    if (Array.isArray(search)) {
      return this.fetchByBbox(search);
    } else {
      return this.fetchByICAO(search);
    }
  }

  abstract fetchByICAO(icao: ICAO): Promise<MetarStation | undefined>;
  abstract fetchByBbox(bbox: GeoJSON.BBox): Promise<MetarStation[]>;
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
  repository?: AbstractMetarRepository;
}

// TODO: This can later be improved with geohashing
export class WeatherService {
  private metarStations: Map<string, MetarStation>;
  private repository?: AbstractMetarRepository;

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
   * Fetches and updates METAR stations based on a search query or bounding box.
   * Optionally extends the bounding box by a specified distance.
   *
   * @param search - The search string or bounding box to use for fetching METAR stations.
   * @param extend - Optional distance in kilometers to extend the bounding box (only applies when search is a bounding box).
   * @returns A promise that resolves when the data has been updated.
   */
  public async fetchAndUpdateStations(search: string | GeoJSON.BBox, extend?: number): Promise<void> {
    if (!this.repository) return;

    let searchQuery = search;

    // Only extend the bounding box if search is a bounding box and extend is defined
    if (Array.isArray(search) && extend !== undefined) {
      const bboxPoly = bboxPolygon(search);
      const featureBuffer = buffer(bboxPoly, extend, { units: 'kilometers' });
      if (featureBuffer) {
        searchQuery = bbox(featureBuffer) as GeoJSON.BBox;
      }
    }

    const result = await this.repository.query(searchQuery);
    if (Array.isArray(result)) {
      result.forEach(metar =>
        this.metarStations.set(normalizeICAO(metar.station), metar)
      );
    } else if (result) {
      this.metarStations.set(normalizeICAO(result.station), result);
    }
  }

  /**
   * Finds a METAR station by its ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @returns A promise that resolves to the METAR station, or undefined if not found.
   */
  public findByICAO(icao: string): MetarStation | undefined {
    return this.metarStations.get(normalizeICAO(icao));
  }

  /**
   * Finds the nearest METAR station to the specified location.
   * 
   * @param location - The location as a GeoJSON Point to find the nearest station to.
   * @param exclude - Optional array of station IDs to exclude from the search.
   * @returns The nearest METAR station, or undefined if none found or if no candidates available.
   */
  public findNearestStation(location: GeoJSON.Point, exclude: string[] = []): MetarStation | undefined {
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
