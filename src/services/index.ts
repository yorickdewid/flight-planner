import AerodromeService from "./aerodrome.js";
import AircraftService from "./aircraft.js";
import WeatherService from "./weather.js";

import { Aerodrome, Waypoint } from "../waypoint.types.js";
import { MetarStation } from "../metar.types.js";
import { Aircraft } from "../aircraft.js";

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
  public async attachWeatherToWaypoint(waypoints: Waypoint[], reassign = false): Promise<void> {
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

  /**
   * Find aircraft by its registration number.
   * 
   * @param registration - The registration number of the aircraft to find.
   * @returns A promise that resolves to the Aircraft object if found, or undefined if not found.
   * @throws Error if the provided registration is invalid.
   */
  public async findAircraftByRegistration(registration: string): Promise<Aircraft> {
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
  public async findAerodromesByICAO(icao: string | string[]): Promise<Aerodrome[]> {
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
  public async findAerodromesByLocation(location: GeoJSON.Position, radius: number = 100): Promise<Aerodrome[]> {
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
  public async findNearestAerodrome(location: GeoJSON.Position, radius: number = 100, exclude: string[] = []): Promise<Aerodrome | undefined> {
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