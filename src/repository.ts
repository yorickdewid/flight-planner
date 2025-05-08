import { ICAO } from "./index.js";

import { bbox, buffer, point } from "@turf/turf";

/**
 * AbstractRepository class provides a base implementation for repositories.
 * 
 * @abstract
 * @class AbstractRepository<T>
 * @template T - The type of data to be fetched.
 * @extends {RepositoryBase<T>}
 */
export abstract class RepositoryBase<T> {
  abstract fetchByICAO(icao: ICAO[]): Promise<T[]>;
  abstract fetchByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;
  abstract fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;

  /**
   * Fetches data by ICAO code.
   * 
   * @param icao - The ICAO code(s) to fetch data for.
   * @returns A promise that resolves to an array of data.
   */
  async fetchByLocation(location: GeoJSON.Position, radius: number = 100): Promise<T[]> {
    const radiusRange = Math.min(1000, Math.max(1, radius));

    const resultList: T[] = [];
    if (this.fetchByRadius) {
      const result = await this.fetchByRadius(location, radiusRange);
      resultList.push(...result);
    } else if (this.fetchByBbox) {
      const locationPoint = point(location);
      const buffered = buffer(locationPoint, radiusRange, { units: 'kilometers' });
      if (buffered) {
        const searchBbox = bbox(buffered) as GeoJSON.BBox;
        const result = await this.fetchByBbox(searchBbox);
        resultList.push(...result);
      }
    } else {
      throw new Error('Repository does not support fetchByRadius or fetchByBbox');
    }

    return resultList;
  }
}


export default RepositoryBase;