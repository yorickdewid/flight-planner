import { ICAO } from "../index.js";
// import { point, bbox, buffer } from "@turf/turf";
// import { featureCollection } from '@turf/helpers';
// import { normalizeICAO } from "../utils.js";

// /**
//  * Represents an entity that has both an ICAO code and geographical coordinates.
//  * This interface is used as a constraint for entities that can be located and identified.
//  *
//  * @interface Locatable
//  * @property {ICAO} code - The ICAO identifier code for the entity.
//  * @property {GeoJSON.Position} coords - The geographical coordinates [longitude, latitude] of the entity.
//  */
// export interface Locatable {
//   code: ICAO;
//   coords: GeoJSON.Position;
// }

// type Locatable = Aerodrome | MetarStation;

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
export abstract class ServiceBase<T> {
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
  abstract findByLocation(location: GeoJSON.Position, radius: number): Promise<T[]>;

  async nearest(_location: GeoJSON.Position, _radius: number = 100, _exclude: string[] = []): Promise<T> {
    // const entities: Map<ICAO, T> = new Map();

    // const result = await this.findByLocation(location, radius);
    // result.forEach(entity => entities.set(normalizeICAO(entity.code), entity));

    // if (!entities.size) {
    //   throw new Error(`No entities found within ${radius}km of location [${location[0]}, ${location[1]}]`);
    // }

    // const normalizedExclude = exclude.map(icao => normalizeICAO(icao));
    // const candidates = Array.from(entities.values()).filter(entity => !normalizedExclude.includes(normalizeICAO(entity.code)));
    // if (candidates.length === 0) {
    //   throw new Error(`No entities found within ${radius}km of location [${location[0]}, ${location[1]}] after excluding: ${exclude.join(', ')}`);
    // }

    // const nearest = nearestPoint(location, featureCollection(candidates.map(entity => point(entity.coords, { code: entity.code }))));
    // const entityCode = nearest.properties?.code;
    // if (typeof entityCode !== 'string') {
    //   throw new Error('Failed to determine nearest entity code');
    // }

    // const nearestEntity = entities.get(normalizeICAO(entityCode));
    // if (!nearestEntity) {
    //   throw new Error('Failed to find nearest entity');
    // }
    // return nearestEntity;
    throw new Error('Method not implemented.');
  }
}
