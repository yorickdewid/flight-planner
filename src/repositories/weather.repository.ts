import { ICAO, MetarStation } from "../index.js";

/**
 * Repository interface for METAR station data operations.
 * Provides a clean abstraction layer for METAR station data access operations.
 */
export interface WeatherRepository {
  /**
   * Finds METAR stations by their ICAO codes.
   *
   * @param icaoCodes - An array of ICAO codes to search for.
   * @returns A promise that resolves to an array of found MetarStation objects.
   */
  findByICAO(icaoCodes: readonly ICAO[]): Promise<MetarStation[]>;

  /**
   * Finds METAR stations within a bounding box.
   *
   * @param bbox - A GeoJSON BBox object defining the search area.
   * @returns A promise that resolves to an array of MetarStation objects within the bounding box.
   */
  findByBbox?(bbox: GeoJSON.BBox): Promise<MetarStation[]>;

  /**
   * Finds METAR stations within a specified radius of a geographical location.
   *
   * @param location - The geographical coordinates [longitude, latitude].
   * @param distance - The search radius in kilometers.
   * @returns A promise that resolves to an array of MetarStation objects within the specified radius.
   */
  findByRadius?(location: GeoJSON.Position, distance: number): Promise<MetarStation[]>;

  /**
   * Finds a single METAR station by its ICAO code.
   *
   * @param icaoCode - The ICAO code to search for.
   * @returns A promise that resolves to the MetarStation object or null if not found.
   */
  findOne(icaoCode: ICAO): Promise<MetarStation | null>;
}
