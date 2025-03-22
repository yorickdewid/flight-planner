import { parseMetar } from "metar-taf-parser";
import { Aerodrome, Frequency, ReportingPoint, RunwayWindVector, Waypoint } from "./airport";
import { FlightRules, colorizeFlightRules, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind, fromIMetar, MetarData } from "./metar";
import { AerodromeService, WeatherService } from "./service";
import { RouteLeg, RouteOptions, planFlightRoute, RouteTrip, routeTripWaypoints } from "./planner";
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
 * Represents a repository for weather information.
 * 
 * This interface provides methods to access and manage weather station data
 * including METAR (Meteorological Terminal Air Report) stations.
 */
export interface WeatherRepository {
  fetchAndUpdateStations(search: string | GeoJSON.BBox, extend?: number): Promise<void>;
  fetchStationsByRadius(location: GeoJSON.Point, radius: number): Promise<void>;
  findByICAO(icao: string): MetarStation | undefined;
  findNearestStation(location: GeoJSON.Point, exclude: string[]): MetarStation | undefined;
}

/**
 * Repository interface for aerodrome operations.
 * Defines methods to retrieve aerodrome information from a data store.
 */
export interface AerodromeRepository {
  findByICAO(icao: string): Promise<Aerodrome | undefined>;
}

export { parseMetar, parseRouteString, fromIMetar, normalizeICAO };
export { FlightRules, MetarData, formatCeiling, formatQNH, formatTemperature, formatVisibility, formatWind, colorizeFlightRules };
export { Waypoint, ReportingPoint, Aerodrome, Frequency, RunwayWindVector };
export { WeatherService, AerodromeService };
export { RouteOptions, RouteLeg, RouteTrip, planFlightRoute, routeTripWaypoints };
