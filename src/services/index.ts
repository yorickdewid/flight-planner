import AerodromeService from "./aerodrome.js";
import WeatherService from "./weather.js";

import { Aerodrome, ReportingPoint, Waypoint } from "../waypoint.types.js";
import { MetarStation } from "../metar.types.js";

import { isICAO } from "../utils.js";
import { point } from '@turf/turf';

type WaypointType = Aerodrome | ReportingPoint | Waypoint;

class PlannerService {
  /**
   * Creates a new FlightPlanner instance
   * 
   * @param weatherService - Weather service for retrieving weather data along the flight route
   *                         Used to get wind information and other meteorological conditions
   * @param aerodromeService - Aerodrome service for fetching airport and airfield data
   *                           Used to look up airports by ICAO code and retrieve their information
   */
  constructor(
    private weatherService: WeatherService,
    private aerodromeService: AerodromeService,
  ) { }

  /**
   * Attaches relevant weather data to waypoints by fetching METAR information
   * First tries to get data for aerodromes by ICAO code, then finds nearest stations for other waypoints
   * 
   * @param waypoints - The waypoints to attach weather data to
   * @param reassign - Whether to reassign the weather station for aerodromes
   *                 If true, it clears the existing METAR station before fetching new data
   * @throws Will not throw but logs errors encountered during the process
   */
  async attachWeatherToWaypoint(waypoints: Waypoint[], reassign = false): Promise<void> {
    const aerodromes = waypoints.filter(waypoint => waypoint.ICAO);
    // const icaoCodes = aerodromes.map(aerodrome => aerodrome.ICAO) as string[];

    if (reassign) {
      for (const aerodrome of aerodromes) {
        aerodrome.metarStation = undefined;
      }
    }

    // if (icaoCodes.length > 0) {
    //   try {
    //     const stations = await this.weatherService.findMany(icaoCodes);
    //     if (stations?.length) {
    //       const stationMap = new Map<string, MetarStation>();
    //       for (const station of stations) {
    //         stationMap.set(station.station, station);
    //       }

    //       for (const aerodrome of aerodromes) {
    //         const station = stationMap.get(aerodrome.ICAO!);
    //         if (station) {
    //           aerodrome.metarStation = station;
    //         }
    //       }
    //     }
    //   } catch { }
    // }

    await Promise.all(waypoints
      .filter(waypoint => !waypoint.metarStation)
      .map(async waypoint => {
        const station = await this.weatherService.nearest(waypoint.location.geometry.coordinates);
        if (station) {
          waypoint.metarStation = station;
        }
      }));
  }

  // TODO: Move this to a parser utility or similar
  /**
   * Parses a route string and returns an array of Aerodrome or Waypoint objects.
   * 
   * @param routeString - The route string to parse
   *                      Supported formats:
   *                      - ICAO codes (e.g., "EDDF")
   *                      - RP(name) for reporting points (e.g., "RP(ALPHA)")
   *                      - WP(lat,lng) for waypoints (e.g., "WP(50.05,8.57)")
   * @returns A promise that resolves to an array of Aerodrome, ReportingPoint, or Waypoint objects
   * @throws Error if the route string contains invalid waypoint formats
   */
  async parseRouteString(routeString: string): Promise<WaypointType[]> {
    if (!routeString) return [];

    const waypoints: WaypointType[] = [];
    const routeParts = routeString.toUpperCase().split(/[;\s\n]+/).filter(part => part.length > 0);

    const waypointRegex = /^WP\((-?\d+\.?\d*),(-?\d+\.?\d*)\)$/;

    const parseErrors: string[] = [];

    for (const part of routeParts) {
      try {
        // Check for ICAO code
        if (isICAO(part)) {
          const airport = await this.aerodromeService.findOne(part);
          if (airport) {
            waypoints.push(airport)
            continue;
          } else {
            throw new Error(`Could not find aerodrome with ICAO code: ${part}`);
          }
        }

        const waypointMatch = part.match(waypointRegex);
        if (waypointMatch) {
          const lat = parseFloat(waypointMatch[1]);
          const lng = parseFloat(waypointMatch[2]);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error(`Invalid coordinates in waypoint: ${part}`);
          }

          const name = `WP-${lat.toFixed(2)},${lng.toFixed(2)}`;
          waypoints.push({ name, location: point([lng, lat]) } as Waypoint);
          continue;
        }

        // TODO: Check for things like NAVAIDs, VORs, NDBs, etc.
        // TOOD: Check for VFR waypoints, starting with VRP_XX

        // const rpRegex = /^([A-Z]+)$/;
        // const rpMatch = part.match(rpRegex);
        // if (rpMatch) {
        //   const airport = await this.aerodromeService.get(part);
        //   waypoints.push(rp);
        //   continue;
        // }

        throw new Error(`Unrecognized waypoint format: ${part}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        parseErrors.push(`Error parsing route part "${part}": ${errorMessage}`);
        console.error(parseErrors[parseErrors.length - 1]);
      }
    }

    if (waypoints.length === 0 && parseErrors.length > 0) {
      throw new Error(`Failed to parse route string: ${parseErrors.join('; ')}`);
    }

    return waypoints;
  }
}

export default PlannerService;