import { parseMetar } from "metar-taf-parser";
import { Aerodrome, Frequency, ReportingPoint, RunwayWindVector, Waypoint } from "./airport";
import { FlightRules, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind, fromIMetar, MetarData } from "./metar";
import { AerodromeService, WeatherService } from "./service";
import { RouteLeg, RouteOptions, routePlan, RouteTrip } from "./planner";
import { normalizeICAO, parseRouteString } from "./utils";

/**
 * Represents a METAR (Meteorological Aerodrome Report) station.
 *
 * @interface MetarStation
 * @property {string} station - The identifier for the METAR station.
 * @property {MetarData} metarData - The METAR data associated with the station.
 * @property {string} [rawTaf] - The raw TAF (Terminal Aerodrome Forecast) data, if available.
 * @property {GeoJSON.Feature<GeoJSON.Point>} location - The geographical location of the station.
 * @todo Change location type to GeoJSON.Position
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
  refreshByRadius(location: GeoJSON.Point, radius: number): Promise<void>;
  nearestStation(location: GeoJSON.Point, radius: number, exclude: string[]): Promise<MetarStation | undefined>;
}

/**
 * Represents a repository for aerodromes.
 */
export interface AerodromeRepository {
  findByICAO(icao: string): Promise<Aerodrome | undefined>;
}

export { parseMetar, parseRouteString, fromIMetar, normalizeICAO };
export { FlightRules, MetarData, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind };
export { Waypoint, ReportingPoint, Aerodrome, Frequency, RunwayWindVector };
export { WeatherService, AerodromeService };
export { RouteOptions, RouteLeg, RouteTrip, routePlan }
