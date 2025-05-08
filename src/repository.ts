import { ICAO } from "./index.js";

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

export default RepositoryBase;