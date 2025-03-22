import { AerodromeRepository, MetarStation, WeatherRepository } from ".";
import { Aerodrome } from "./airport";
import { normalizeICAO } from "./utils";
import { bbox, buffer, point, nearestPoint, bboxPolygon } from "@turf/turf";
import { featureCollection } from '@turf/helpers';

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

  // TOOD: This is not yet part of the interface
  // TODO: In the future return a NearestAirportResult object including the distance
  public nearestAerodrome(location: GeoJSON.Position, exclude: string[] = []): Promise<Aerodrome | undefined> {
    const aerodromeCandidates = Array.from(this.aerodromes.values()).filter(airport => !exclude.includes(airport.ICAO));

    const nearest = nearestPoint(location, featureCollection(aerodromeCandidates.map(airport => {
      return point(airport.location.geometry.coordinates, { icao: airport.ICAO });
    })));

    return this.findByICAO(nearest.properties?.icao);
  }
}

/**
 * Represents a function that fetches METAR stations.
 * 
 * @param search - The search string or bounding box to use for fetching METAR stations.
 * @returns A promise that resolves to an array of METAR stations.
 */
export type FnFetchMetarStation = (search: string | GeoJSON.BBox) => Promise<MetarStation[]>;

// TODO: This can later be improved with geohashing
export class WeatherService implements WeatherRepository {
  private metarStations: Map<string, MetarStation>;
  private fetchMetarStation?: FnFetchMetarStation;

  /**
   * Creates a new instance of the WeatherService class.
   * 
   * @param metarStations - An optional array of METAR stations to initialize the service with.
   * @returns An instance of the WeatherService class.
   */
  constructor(metarStations: MetarStation[] = []) {
    this.metarStations = new Map(metarStations.map(metar => [normalizeICAO(metar.station), metar]));
  }

  /**
   * Sets the function to fetch METAR stations.
   * 
   * @param fnFetchMetarStation - The function to fetch METAR stations.
   */
  set fetchFunction(fnFetchMetarStation: FnFetchMetarStation) {
    this.fetchMetarStation = fnFetchMetarStation;
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
    if (!this.fetchMetarStation) {
      return;
    }

    let searchQuery = search;

    // Only extend the bounding box if search is a bounding box and extend is defined
    if (Array.isArray(search) && extend !== undefined) {
      const bboxPoly = bboxPolygon(search);
      const featureBuffer = buffer(bboxPoly, extend, { units: 'kilometers' });
      if (featureBuffer) {
        searchQuery = bbox(featureBuffer) as GeoJSON.BBox;
      }
    }

    const fetchedMetarStations = await this.fetchMetarStation(searchQuery);
    fetchedMetarStations.forEach(metar =>
      this.metarStations.set(normalizeICAO(metar.station), metar)
    );
  }

  /**
   * Fetches and updates METAR stations within a circular area around a given location.
   * 
   * @param location - The center point coordinates as a GeoJSON Point.
   * @param radius - Radius in kilometers around the center point. Default is 35km.
   * @returns A promise that resolves when the stations have been fetched and updated.
   */
  public async fetchStationsByRadius(location: GeoJSON.Point, radius: number = 35): Promise<void> {
    const featureBuffer = buffer(point(location.coordinates), radius, { units: 'kilometers' });

    if (featureBuffer) {
      const bufferedBbox = bbox(featureBuffer);
      await this.fetchAndUpdateStations(bufferedBbox as GeoJSON.BBox);
    }
  }

  /**
   * Finds a METAR station by its ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @returns A promise that resolves to the METAR station, or undefined if not found.
   */
  public findByICAO(icao: string): MetarStation | undefined {
    const icaoNormalized = normalizeICAO(icao);

    return this.metarStations.get(icaoNormalized);
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

    // Return early if there are no candidates
    if (metarCandidates.length === 0) {
      return undefined;
    }

    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => {
      return point(metar.location.geometry.coordinates, { station: metar.station });
    })));

    return this.metarStations.get(nearest.properties?.station);
  }
}
