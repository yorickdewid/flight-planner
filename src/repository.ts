import { ICAO } from "./index.js";

import { bbox, buffer, point } from "@turf/turf";

/**
 * RepositoryBase interface defines the methods for fetching data from a repository.
 * 
 * @interface RepositoryBase<T>
 * @template T - The type of data to be fetched.
 * @property {function(ICAO[]): Promise<T[]>} fetchByICAO - Fetches data by ICAO codes.
 * @property {function(GeoJSON.BBox): Promise<T[]>} [fetchByBbox] - Optional method to fetch data by bounding box.
 * @property {function(GeoJSON.Position, number): Promise<T[]>} [fetchByRadius] - Optional method to fetch data by radius.
 */
interface RepositoryBase<T> {
  fetchByICAO(icao: ICAO[]): Promise<T[]>;
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;
}

export abstract class AbstractRepository<T> implements RepositoryBase<T> {
  abstract fetchByICAO(icao: ICAO[]): Promise<T[]>;
  abstract fetchByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;
  abstract fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;

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