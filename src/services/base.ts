import { ICAO } from "../index.js";

// TODO: Rename to something like EntityServiceBase
export abstract class ServiceBase<T> {
  abstract findByICAO(icao: readonly ICAO[]): Promise<T[]>;
  abstract findByLocation(location: GeoJSON.Position, radius: number): Promise<T[]>;
}
