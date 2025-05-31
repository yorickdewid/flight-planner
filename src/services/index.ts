import AerodromeService from "./aerodrome.js";
import AircraftService from "./aircraft.js";
import WeatherService from "./weather.js";

import { Aerodrome, ReportingPoint, Waypoint } from "../waypoint.types.js";
import { MetarStation } from "../metar.types.js";
import { Aircraft } from "../aircraft.js";

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
   * @param aircraftService - Aircraft service for managing aircraft data
   *                          Used to fetch aircraft details and calculate performance metrics
   */
  constructor(
    private weatherService: WeatherService,
    private aerodromeService: AerodromeService,
    private aircraftService: AircraftService,
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
    const icaoCodes = aerodromes.map(aerodrome => aerodrome.ICAO) as string[];

    if (reassign) {
      for (const aerodrome of aerodromes) {
        aerodrome.metarStation = undefined;
      }
    }

    if (icaoCodes.length > 0) {
      const stations = await this.weatherService.get(icaoCodes);
      if (stations?.length) {
        const stationMap = new Map<string, MetarStation>();
        for (const station of stations) {
          stationMap.set(station.station, station);
        }

        for (const aerodrome of aerodromes) {
          const station = stationMap.get(aerodrome.ICAO!);
          if (station) {
            aerodrome.metarStation = station;
          }
        }
      }
    }

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
          const airport = await this.aerodromeService.get(part);
          if (airport?.length) {
            waypoints.push(...airport);
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

  /**
   * Finds METAR stations by their ICAO code.
   * 
   * @param icao - The ICAO code of the METAR station to find.
   * @returns A promise that resolves to an array of MetarStation objects if found, or throws an error if not found.
   * @throws Error if the provided ICAO code is invalid or no METAR station is found.
   */
  async findMetarsByICAO(icao: string | string[]): Promise<MetarStation[]> {
    if (!icao || typeof icao !== 'string') {
      throw new Error('Invalid ICAO code provided');
    }

    const metar = await this.weatherService.get(icao);
    if (!metar) {
      throw new Error(`METAR station with ICAO code ${icao} not found`);
    }
    return metar;
  }

  /**
   * Find aircraft by its registration number.
   * 
   * @param registration - The registration number of the aircraft to find.
   * @returns A promise that resolves to the Aircraft object if found, or undefined if not found.
   * @throws Error if the provided registration is invalid.
   */
  async findAircraftByRegistration(registration: string): Promise<Aircraft> {
    if (!registration || typeof registration !== 'string') {
      throw new Error('Invalid aircraft registration provided');
    }

    const aircraft = await this.aircraftService.get(registration);
    if (!aircraft) {
      throw new Error(`Aircraft with registration ${registration} not found`);
    }
    return aircraft;
  }

  /**
   * Finds aerodromes by their ICAO codes.
   *
   * @param icao - A single ICAO code or an array of ICAO codes.
   * @returns A promise that resolves to an array of Aerodrome objects.
   * @throws Error if the provided ICAO code(s) are invalid or no aerodromes are found.
   */
  async findAerodromesByICAO(icao: string | string[]): Promise<Aerodrome[]> {
    if (!icao || (Array.isArray(icao) && icao.length === 0)) {
      throw new Error('Invalid ICAO code(s) provided');
    }
    if (typeof icao === 'string') {
      icao = [icao];
    }

    const aerodromes = await this.aerodromeService.get(icao);
    if (!aerodromes || aerodromes.length === 0) {
      throw new Error(`Aerodromes with ICAO code(s) ${icao.join(', ')} not found`);
    }
    return aerodromes;
  }

  /**
   * Finds aerodromes within a given radius of a geographical location.
   *
   * @param location - The geographical coordinates [longitude, latitude].
   * @param radius - The search radius in kilometers (defaults to 100km).
   * @returns A promise that resolves to an array of Aerodrome objects.
   * @throws Error if the location format is invalid or no aerodromes are found.
   */
  async findAerodromesByLocation(location: GeoJSON.Position, radius: number = 100): Promise<Aerodrome[]> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

    const aerodromes = await this.aerodromeService.getByLocation(location, radius);
    if (!aerodromes || aerodromes.length === 0) {
      throw new Error(`No aerodromes found within ${radius} km of the specified location`);
    }
    return aerodromes;
  }

  /**
   * Finds the nearest aerodrome to a given geographical location, optionally excluding some ICAO codes.
   *
   * @param location - The geographical coordinates [longitude, latitude].
   * @param radius - The search radius in kilometers (defaults to 100km).
   * @param exclude - An array of ICAO codes to exclude from the search.
   * @returns A promise that resolves to the nearest Aerodrome object, or undefined if none is found.
   * @throws Error if the location format is invalid or no aerodrome is found.
   */
  async findNearestAerodrome(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<Aerodrome | undefined> {
    if (!Array.isArray(location) || location.length < 2 ||
      typeof location[0] !== 'number' || typeof location[1] !== 'number') {
      throw new Error('Invalid location format. Expected [longitude, latitude].');
    }

    const aerodrome = await this.aerodromeService.nearest(location, radius, exclude);
    if (!aerodrome) {
      throw new Error(`No aerodrome found within ${radius} km of the specified location`);
    }
    return aerodrome;
  }
}

export default PlannerService;