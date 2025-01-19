import { AerodromeRepository, MetarStation, WeatherRepository } from ".";
import { Aerodrome } from "./airport.js";
import { normalizeICAO } from "./utils.js";
import nearestPoint from '@turf/nearest-point';
import { featureCollection } from '@turf/helpers';
import { bbox, buffer, point } from "@turf/turf";

export type FnFetchAerodrome = (icao: string) => Promise<Aerodrome>;

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

export type FnFetchMetarStation = (search: string | GeoJSON.BBox) => Promise<MetarStation[]>;

// TODO: This can later be improved with geohashing
export class WeatherService implements WeatherRepository {
  private metarStations: Map<string, MetarStation>;
  private fetchMetarStation?: FnFetchMetarStation;

  constructor(metarStations: MetarStation[] = []) {
    this.metarStations = new Map(metarStations.map(metar => [normalizeICAO(metar.station), metar]));
  }

  set fetchFunction(fnFetchMetarStation: FnFetchMetarStation) {
    this.fetchMetarStation = fnFetchMetarStation;
  }

  get stations(): MetarStation[] {
    return Array.from(this.metarStations.values());
  }

  /**
   * Refreshes the METAR stations within a bounding box.
   *
   * @param bbox - The bounding box as an array of coordinates [minX, minY, maxX, maxY].
   * @returns A promise that resolves when the data has been refreshed.
   */
  private async refreshData(search: string | GeoJSON.BBox): Promise<void> {
    if (this.fetchMetarStation) {
      const fetchedMetarStations = await this.fetchMetarStation(search);
      fetchedMetarStations.forEach(metar => this.metarStations.set(normalizeICAO(metar.station), metar));
    }
  }

  /**
   * Refreshes the METAR stations within a bounding box.
   * 
   * @param bbox - The bounding box as an array of coordinates [minX, minY, maxX, maxY].
   * @returns A promise that resolves when the data has been refreshed.
   */
  public async refreshByRadius(location: GeoJSON.Point, radius: number = 35): Promise<void> {
    const featureBuffer = buffer(point(location.coordinates), radius);

    if (featureBuffer) {
      const bufferedBbox = bbox(featureBuffer);
      await this.refreshData(bufferedBbox as GeoJSON.BBox);
    }
  }

  /**
   * Finds a METAR station by its ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station.
   * @returns A promise that resolves to the METAR station, or undefined if not found.
   */
  public async findByICAO(icao: string): Promise<MetarStation | undefined> {
    const icaoNormalized = normalizeICAO(icao);

    await this.refreshData(icaoNormalized);
    return this.metarStations.get(icaoNormalized);
  }

  /**
   * Finds the nearest METAR station to a location within a specified radius, excluding certain stations.
   * 
   * @param location - The center location as a GeoJSON point.
   * @param radius - The radius in kilometers (default is 35).
   * @param exclude - An optional array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest METAR station, or undefined if not found.
   */
  public async nearestStation(location: GeoJSON.Point, radius: number = 35, exclude: string[] = []): Promise<MetarStation | undefined> {
    await this.refreshByRadius(location, radius);

    const metarCandidates = this.stations.filter(metar => !exclude.includes(metar.station));
    const nearest = nearestPoint(location, featureCollection(metarCandidates.map(metar => {
      return point(metar.location.geometry.coordinates, { station: metar.station });
    })));

    return this.metarStations.get(nearest.properties?.station);
  }
}
