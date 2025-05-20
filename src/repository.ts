import { ICAO } from "./index.js";
import { bbox, buffer, point } from "@turf/turf";

/**
 * RepositoryBase class provides a base implementation for repositories.
 * 
 * @abstract
 * @class RepositoryBase<T>
 * @template T - The type of data to be fetched.
 */
export abstract class RepositoryBase<T> {
  /**
   * Fetches data by ICAO codes.
   * 
   * @param icao - An array of ICAO codes.
   * @returns A promise that resolves to an array of data.
   */
  abstract fetchByICAO(icao: readonly ICAO[]): Promise<T[]>;

  /**
   * Fetches data by geographic bounding box.
   * 
   * @param bbox - The bounding box coordinates [west, south, east, north].
   * @returns A promise that resolves to an array of data.
   */
  fetchByBbox?(bbox: GeoJSON.BBox): Promise<T[]>;

  /**
   * Fetches data by geographic location within specified radius.
   * 
   * @param location - The location coordinates [longitude, latitude].
   * @param distance - The radius in kilometers.
   * @returns A promise that resolves to an array of data.
   */
  fetchByRadius?(location: GeoJSON.Position, distance: number): Promise<T[]>;

  /**
   * Fetches data by geographic location within specified radius.
   * 
   * @param location - The location coordinates [longitude, latitude].
   * @param radius - The radius in kilometers (default: 100, max: 1000).
   * @returns A promise that resolves to an array of data.
   */
  async fetchByLocation(location: GeoJSON.Position, radius: number = 100): Promise<T[]> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

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
      throw new Error('This repository does not implement fetchByRadius or fetchByBbox. At least one of these methods must be implemented to use fetchByLocation.');
    }

    return resultList;
  }
}

export default RepositoryBase;