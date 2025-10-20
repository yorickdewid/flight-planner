import { ICAO } from "../index.js";
import { Aerodrome } from "../waypoint.types.js";

/**
 * Repository interface for aerodrome data operations.
 * Provides a clean abstraction layer for aerodrome data access operations.
 */
export interface AerodromeRepository {
  /**
   * Finds aerodromes by their ICAO codes.
   *
   * @param icaoCodes - An array of ICAO codes to search for.
   * @returns A promise that resolves to an array of found Aerodrome objects.
   */
  findByICAO(icaoCodes: readonly ICAO[]): Promise<Aerodrome[]>;

  /**
   * Finds aerodromes within a bounding box.
   *
   * @param bbox - A GeoJSON BBox object defining the search area.
   * @returns A promise that resolves to an array of Aerodrome objects within the bounding box.
   */
  findByBbox?(bbox: GeoJSON.BBox): Promise<Aerodrome[]>;

  /**
   * Finds aerodromes within a specified radius of a geographical location.
   *
   * @param location - The geographical coordinates [longitude, latitude].
   * @param distance - The search radius in kilometers.
   * @returns A promise that resolves to an array of Aerodrome objects within the specified radius.
   */
  findByRadius?(location: GeoJSON.Position, distance: number): Promise<Aerodrome[]>;
}
