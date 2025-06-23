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

  /**
   * Finds a single aerodrome by its ICAO code.
   * 
   * @param icaoCode - The ICAO code to search for.
   * @returns A promise that resolves to the Aerodrome object or null if not found.
   */
  findOne(icaoCode: ICAO): Promise<Aerodrome | null>;

  /**
   * Checks if an aerodrome exists in the repository.
   * 
   * @param icaoCode - The ICAO code of the aerodrome to check.
   * @returns A promise that resolves to true if the aerodrome exists, false otherwise.
   */
  exists(icaoCode: ICAO): Promise<boolean>;
}
