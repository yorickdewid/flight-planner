import { parseMetar } from "metar-taf-parser";
import { Aerodrome, ReportingPoint, Waypoint } from "./airport";
import { MetarData } from "./metar";
import { AerodromeService, WeatherService } from "./service";

export { parseMetar };

/**
 * The version of the library.
 */
export const LIBRARY_VERSION = "1.0.0";

/**
 * Represents a weather station with METAR and optional TAF information.
 */
export interface MetarStation {
  station: string;
  metarData: MetarData;
  rawTaf?: string;
  location: GeoJSON.Feature<GeoJSON.Point>; // TOOD: Change to GeoJSON.Position
}

/**
 * Represents a repository for weather stations.
 */
export interface WeatherRepository {
  findByICAO(icao: string): Promise<MetarStation | undefined>;
}

/**
 * Represents a repository for aerodromes.
 */
export interface AerodromeRepository {
  findByICAO(icao: string): Promise<Aerodrome | undefined>;
}

export { Waypoint, ReportingPoint, Aerodrome };
export { WeatherService, AerodromeService };
