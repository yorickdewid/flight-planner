import { ICAO } from "../index.js";
import { point, nearestPoint, bbox, buffer } from "@turf/turf";
import { featureCollection } from '@turf/helpers';
import { normalizeICAO } from "../utils.js";

/**
 * Represents an entity that has both an ICAO code and geographical coordinates.
 * This interface is used as a constraint for entities that can be located and identified.
 *
 * @interface Locatable
 * @property {ICAO} code - The ICAO identifier code for the entity.
 * @property {GeoJSON.Position} coords - The geographical coordinates [longitude, latitude] of the entity.
 */
export interface Locatable {
  code: ICAO;
  coords: GeoJSON.Position;
}

/**
 * Abstract base class for services that manage locatable entities with ICAO codes.
 * Provides common functionality for finding and locating entities by ICAO code,
 * bounding box, radius, or nearest proximity to a given location.
 *
 * @abstract
 * @class ServiceBase
 * @template T - The type of entity managed by this service, must implement Locatable interface.
 *
 * @example
 * ```typescript
 * class MyEntityService extends ServiceBase<MyEntity> {
 *   async findByICAO(icaoCodes: readonly ICAO[]): Promise<MyEntity[]> {
 *     // Implementation
 *   }
 *
 *   async findByRadius(location: GeoJSON.Position, distance: number): Promise<MyEntity[]> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export abstract class ServiceBase<T extends Locatable> {
  /**
   * Finds entities by their ICAO codes.
   * Implementing classes must provide the specific logic for retrieving entities.
   *
   * @abstract
   * @param {readonly ICAO[]} icaoCodes - An array of ICAO codes to search for.
   * @returns {Promise<T[]>} A promise that resolves to an array of found entities.
   */
  abstract findByICAO(icaoCodes: readonly ICAO[]): Promise<T[]>;

  /**
   * Finds entities within a bounding box.
   * Optional method that can be implemented for spatial queries.
   *
   * @abstract
   * @param {GeoJSON.BBox} bbox - A GeoJSON BBox object defining the search area [minLon, minLat, maxLon, maxLat].
   * @returns {Promise<T[]>} A promise that resolves to an array of entities within the bounding box.
   */
  abstract findByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;

  /**
   * Finds entities within a specified radius of a geographical location.
   * Optional method that can be implemented for radial searches.
   *
   * @abstract
   * @param {GeoJSON.Position} location - The geographical coordinates [longitude, latitude].
   * @param {number} distance - The search radius in kilometers.
   * @returns {Promise<T[]>} A promise that resolves to an array of entities within the specified radius.
   */
  abstract findByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;

  /**
   * Finds the nearest entity to a given geographical location.
   * Searches within the specified radius and optionally excludes certain entities by ICAO code.
   *
   * @param {GeoJSON.Position} location - The geographical coordinates [longitude, latitude] to search near.
   * @param {number} [radius=100] - The search radius in kilometers (default: 100km).
   * @param {string[]} [exclude=[]] - An optional array of ICAO codes to exclude from the search.
   * @returns {Promise<T>} A promise that resolves to the nearest entity.
   * @throws {Error} If no entities are found within the specified radius.
   * @throws {Error} If no entities remain after applying exclusion filters.
   * @throws {Error} If the nearest entity cannot be determined or retrieved.
   *
   * @example
   * ```typescript
   * const nearest = await service.nearest([4.7683, 52.3105], 50, ['EHAM']);
   * console.log(`Nearest entity: ${nearest.code}`);
   * ```
   */
  async nearest(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<T> {
    const entities: Map<ICAO, T> = new Map();

    const result = await this.getByLocation(location, radius);
    result.forEach(entity => entities.set(normalizeICAO(entity.code), entity));

    if (!entities.size) {
      throw new Error(`No entities found within ${radius}km of location [${location[0]}, ${location[1]}]`);
    }

    const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    const candidates = Array.from(entities.values()).filter(entity => !normalizedExclude.includes(normalizeICAO(entity.code)));
    if (candidates.length === 0) {
      throw new Error(`No entities found within ${radius}km of location [${location[0]}, ${location[1]}] after excluding: ${exclude.join(', ')}`);
    }

    const nearest = nearestPoint(location, featureCollection(candidates.map(entity => point(entity.coords, { code: entity.code }))));
    const entityCode = nearest.properties?.code;
    if (typeof entityCode !== 'string') {
      throw new Error('Failed to determine nearest entity code');
    }

    const nearestEntity = entities.get(normalizeICAO(entityCode));
    if (!nearestEntity) {
      throw new Error('Failed to find nearest entity');
    }
    return nearestEntity;
  }

  /**
   * Retrieves entities by geographical location within a specified radius.
   * This method automatically chooses between radius-based or bounding box-based search
   * depending on which methods are implemented by the concrete service class.
   *
   * @protected
   * @param {GeoJSON.Position} location - The geographical coordinates [longitude, latitude].
   * @param {number} [radius=100] - The search radius in kilometers (default: 100km, max: 1000km, min: 1km).
   * @returns {Promise<T[]>} A promise that resolves to an array of entities within the specified area.
   * @throws {Error} If the location format is invalid.
   * @throws {Error} If neither findByRadius nor findByBbox methods are implemented.
   *
   * @remarks
   * The radius is automatically clamped between 1km and 1000km for safety.
   * If findByRadius is implemented, it will be used preferentially.
   * Otherwise, findByBbox will be used with a calculated bounding box.
   */
  protected async getByLocation(location: GeoJSON.Position, radius: number = 100): Promise<T[]> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

    const radiusRange = Math.min(1000, Math.max(1, radius));

    if (this.findByRadius) {
      return await this.findByRadius(location, radiusRange);
    }

    if (this.findByBbox) {
      const locationPoint = point(location);
      const buffered = buffer(locationPoint, radiusRange, { units: 'kilometers' });
      if (buffered) {
        const searchBbox = bbox(buffered) as GeoJSON.BBox;
        return await this.findByBbox(searchBbox);
      }
    }

    throw new Error('This service does not implement findByRadius or findByBbox. At least one of these methods must be implemented to use getByLocation.');
  }
}
