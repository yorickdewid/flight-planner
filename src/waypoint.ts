import { calculateWindVector, capitalizeWords } from './utils.js';
import { ICAO, MetarStation } from './index.js';
import { Wind } from './metar.js';
import { Feature, Point, GeoJsonProperties } from 'geojson';
import { bearing, bearingToAzimuth, distance } from "@turf/turf";

export type WaypointLocation = Feature<Point, GeoJsonProperties>;

// TODO: Waypoint is not a class but an interface

/**
 * Represents a waypoint in the flight planning system
 * 
 * A waypoint is a specified geographical location used for navigation purposes.
 * It can be associated with a METAR weather observation station.
 * 
 * @example
 * ```typescript
 * const location: WaypointLocation = { lat: 37.62, lng: -122.38 };
 * const sfo = new Waypoint("KSFO", location);
 * ```
 */
export class Waypoint {
  public readonly name: string;
  public readonly location: WaypointLocation; // TODO: Replace with just GeoJSON.Position
  public metarStation?: MetarStation;

  /**
   * @param name The name of the waypoint
   * @param location The location of the waypoint
   * @returns An instance of the Waypoint class
   */
  constructor(name: string, location: WaypointLocation) {
    this.name = capitalizeWords(name);
    this.location = location;
  }

  /**
   * Returns a string representation of the waypoint.
   * 
   * @returns A string representation of the waypoint
   */
  toString(): string {
    return `${this.name}`;
  }

  /**
   * Calculates the distance to the given waypoint.
   * 
   * @param waypoint The waypoint to calculate the distance to
   * @returns The distance in nautical miles
   */
  distance(waypoint: Waypoint): number {
    return distance(this.location, waypoint.location, { units: 'nauticalmiles' });
  }

  /**
   * Calculates the heading to the given waypoint.
   * 
   * @param waypoint The waypoint to calculate the heading to
   * @returns The heading in degrees
   */
  heading(waypoint: Waypoint): number {
    const bearingValue = bearing(this.location, waypoint.location);
    return bearingToAzimuth(bearingValue)
  }
}

/**
 * Represents a reporting point in the flight plan.
 * A reporting point is a waypoint that may be required for the flight.
 * 
 * @extends Waypoint
 */
export class ReportingPoint extends Waypoint {
  public required: boolean;

  /**
   * @param name The name of the reporting point
   * @param location The location of the reporting point
   * @param required Whether the reporting point is required
   * @returns An instance of the ReportingPoint class
   */
  constructor(name: string, location: WaypointLocation, required: boolean = false) {
    super(name, location);
    this.required = required;
  }
}

/**
 * Represents a runway at an airport.
 * 
 * @interface Runway
 * @property {string} designator - The identifier of the runway (e.g., "09L", "27R").
 * @property {number} heading - The magnetic heading of the runway in degrees.
 * @property {string} [length] - The length of the runway, typically in feet or meters.
 * @property {string} [surface] - The surface material of the runway (e.g., "asphalt", "concrete").
 * @property {boolean} [isActive] - Indicates whether the runway is currently active/operational.
 */
export interface Runway {
  designator: string;
  heading: number;
  length?: string;
  surface?: string;
  isActive?: boolean;
}

/**
 * Enum representing various types of airport radio frequencies.
 * 
 * @enum {number}
 * @readonly
 */
export enum FrequencyType {
  Approach = 0,
  APRON = 1,
  Arrival = 2,
  Center = 3,
  CTAF = 4,
  Delivery = 5,
  Departure = 6,
  FIS = 7,
  Gliding = 8,
  Ground = 9,
  Information = 10,
  Multicom = 11,
  Unicom = 12,
  Radar = 13,
  Tower = 14,
  ATIS = 15,
  Radio = 16,
  Other = 17,
  AIRMET = 18,
  AWOS = 19,
  Lights = 20,
  VOLMET = 21,
  AFIS = 22,
}

/**
 * Defines the various types of aerodromes.
 * 
 * @enum {number}
 * @readonly
 */
export enum AerodromeType {
  Airport = 0,
  GliderSite = 1,
  AirfieldCivil = 2,
  InternationalAirport = 3,
  HeliportMilitary = 4,
  MilitaryAerodrome = 5,
  UltraLightFlyingSite = 6,
  HeliportCivil = 7,
  AerodromeClosed = 8,
  AirportIFR = 9,
  AirfieldWater = 10,
  LandingStrip = 11,
  AgriculturalLandingStrip = 12,
  Altiport = 13,
}

/**
 * Represents a radio frequency used at an airport.
 * 
 * @interface Frequency
 * @property {string} type - The type of frequency (e.g., TOWER, GROUND, APPROACH). TODO: Use enum instead of string.
 * @property {string} name - The name or description of the frequency.
 * @property {string} value - The actual frequency value (e.g., "118.5").
 */
export interface Frequency {
  type: FrequencyType;
  name: string;
  value: string;
}

/**
 * Converts a numeric frequency type to its enum value
 * 
 * @param type The numeric value of the frequency type
 * @returns The corresponding FrequencyType enum value
 */
export const validateFrequencyType = (type: number): FrequencyType => {
  if (Object.values(FrequencyType).includes(type) && typeof type === 'number') {
    return type as FrequencyType;
  }
  return FrequencyType.Other;
}

/**
 * Represents a wind vector in relation to a specific runway.
 * 
 * @interface RunwayWindVector
 * @property {Runway} runway - The runway for which the wind vector is calculated.
 * @property {number} windAngle - The angle between the runway heading and the wind direction in degrees.
 * @property {number} headwind - The headwind component in knots (positive for headwind, negative for tailwind).
 * @property {number} crosswind - The crosswind component in knots (absolute value).
 */
export interface RunwayWindVector {
  runway: Runway;
  windAngle: number;
  headwind: number;
  crosswind: number;
}

/**
 * Options for creating an Aerodrome instance.
 * 
 * @interface AerodromeOptions
 * @property {string} [IATA] - The IATA code of the airport (optional).
 * @property {Frequency[]} [frequencies] - An array of frequencies associated with the airport (optional).
 */
export interface AerodromeOptions {
  ICAO: ICAO;
  IATA?: string;
  name: string;
  location: WaypointLocation;
  runways: Runway[];
  frequencies?: Frequency[];
  elevation?: number;
}

/**
 * Represents an aerodrome (airport) in the flight planning system.
 * 
 * @extends Waypoint
 */
export class Aerodrome extends Waypoint {
  /**
   * @param options The options for creating the Aerodrome instance
   * @returns An instance of the Aerodrome class
   */
  constructor(
    public ICAO: ICAO,
    public IATA: string | undefined,
    name: string,
    public location: WaypointLocation,
    public runways: Runway[],
    public frequencies?: Frequency[],
    public elevation?: number) {
    super(name, location);
  }

  /**
   * Returns a string representation of the airport.
   * 
   * @returns A string representation of the airport
   */
  toString(): string {
    return `${this.name} (${this.ICAO})`;
  }

  /**
   * Returns the QFE (atmospheric pressure at aerodrome elevation) value.
   * 
   * @returns The QFE value in hPa (hectopascals), rounded to 2 decimal places, 
   *          or undefined if elevation or QNH data is not available
   */
  get QFE(): number | undefined {
    if (!this.elevation || !this.metarStation || !this.metarStation.metar.qnh) {
      return undefined;
    }

    // TODO: Standardize units
    return Math.round((this.metarStation.metar.qnh.value - (this.elevation / 30)) * 100) / 100;
  }

  /**
   * Calculates the wind vectors for all runways of the airport.
   * 
   * @returns The wind vectors for the runways in descending order of headwind
   */
  get runwayWind(): RunwayWindVector[] | undefined {
    if (!this.metarStation) {
      return undefined;
    }

    return this.runways
      .map(runway => Aerodrome.calculateRunwayWindVector(runway, this.metarStation!.metar.wind))
      .sort((a, b) => b.headwind - a.headwind)
  }

  /**
   * Calculates the wind vector for a specific runway.
   * 
   * @param runway The runway to calculate the wind vector for
   * @param wind The current wind data from METAR
   * @returns The calculated runway wind vector
   * @private
   */
  private static calculateRunwayWindVector(runway: Runway, wind: Wind): RunwayWindVector {
    const windVector = calculateWindVector(wind, runway.heading);

    return {
      runway,
      windAngle: windVector.angle,
      headwind: Math.round(windVector.headwind),
      crosswind: Math.round(windVector.crosswind),
    };
  }
}
