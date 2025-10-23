import { ICAO } from "../index.js";

/**
 * Abstract base class for service implementations that handle entity retrieval.
 *
 * @template T - The type of entity this service manages
 *
 * @remarks
 * This class provides a standard interface for services that need to find entities
 * by ICAO codes or geographic location. All concrete implementations must provide
 * their own implementations of the abstract methods.
 *
 * @todo Rename to something like EntityServiceBase
 */
export abstract class ServiceBase<T> {
  /**
   * Finds entities by their ICAO codes.
   *
   * @param icao - An array of ICAO codes to search for
   * @returns A promise that resolves to an array of entities matching the provided ICAO codes
   *
   * @example
   * ```typescript
   * const results = await service.findByICAO(['KJFK', 'KLAX']);
   * ```
   */
  abstract findByICAO(icao: readonly ICAO[]): Promise<T[]>;

  /**
   * Finds entities within a specified radius of a geographic location.
   *
   * @param location - A GeoJSON position [longitude, latitude, altitude?] representing the center point
   * @param radius - The search radius in meters
   * @returns A promise that resolves to an array of entities within the specified radius
   *
   * @example
   * ```typescript
   * const results = await service.findByLocation([-74.0060, 40.7128], 50000);
   * ```
   */
  abstract findByLocation(location: GeoJSON.Position, radius: number): Promise<T[]>;
}
