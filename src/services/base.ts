import { ICAO } from "../index.js";

export interface ServiceBase<T> {
  /**
   * Finds entities by their ICAO codes.
   *
   * @param icaoCodes - An array of ICAO codes to search for.
   * @returns A promise that resolves to an array of found entities.
   */
  findByICAO(icaoCodes: readonly ICAO[]): Promise<T[]>;

  /**
   * Finds entities within a bounding box.
   *
   * @param bbox - A GeoJSON BBox object defining the search area.
   * @returns A promise that resolves to an array of entities within the bounding box.
   */
  findByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;

  /**
   * Finds entities within a specified radius of a geographical location.
   *
   * @param location - The geographical coordinates [longitude, latitude].
   * @param distance - The search radius in kilometers.
   * @returns A promise that resolves to an array of entities within the specified radius.
   */
  findByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;
}
