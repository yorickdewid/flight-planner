import { ICAO, MetarStation } from './index.js';
import { Feature, Point, GeoJsonProperties } from 'geojson';

export type WaypointLocation = Feature<Point, GeoJsonProperties>;

/**
 * Enum representing the variant of waypoint.
 */
export enum WaypointVariant {
  Waypoint,
  ReportingPoint,
  Aerodrome,
}

/**
 * Represents a waypoint in the flight planning system.
 *
 * A waypoint is a specified geographical location used for navigation purposes.
 * It can be associated with a METAR weather observation station.
 *
 * @interface Waypoint
 * @property {ICAO} [ICAO] - The ICAO code of the waypoint, if available.
 * @property {string} [IATA] - The IATA code of the waypoint, if available.
 * @property {string} name - The name of the waypoint.
 * @property {WaypointLocation} location - The geographical location of the waypoint, represented as a GeoJSON Point.
 * @property {number} [elevation] - The elevation of the waypoint in feet.
 * @property {number} [declination] - The magnetic declination at the waypoint in degrees.
 * @property {MetarStation} [metarStation] - Optional METAR station associated with the waypoint, providing weather information.
 * @property {WaypointVariant} waypointVariant - The variant of the waypoint, indicating its type (e.g., Waypoint, ReportingPoint, Aerodrome).
 */
export interface Waypoint {
  readonly ICAO?: ICAO;
  readonly IATA?: string;
  readonly name: string;
  readonly location: WaypointLocation; // TODO: Replace with just GeoJSON.Position
  readonly elevation?: number;
  readonly declination?: number;
  metarStation?: MetarStation;
  readonly waypointVariant: WaypointVariant;
}

/**
 * Represents a reporting point in the flight planning system.
 *
 * A reporting point is a specific location where pilots are required to report their position to air traffic control.
 *
 * @interface ReportingPoint
 * @extends Waypoint
 * @property {boolean} compulsory - Indicates whether the reporting point is compulsory for pilots to report.
 * @property {WaypointVariant.ReportingPoint} waypointVariant - The variant of the waypoint, fixed to ReportingPoint.
 */
export interface ReportingPoint extends Waypoint {
  readonly compulsory: boolean;
  readonly waypointVariant: WaypointVariant.ReportingPoint;
}

/**
 * Enum representing the main composite of a runway surface.
 *
 * @enum {number}
 * @readonly
 */
export enum RunwaySurface {
  Asphalt = 0,
  Concrete = 1,
  Grass = 2,
  Sand = 3,
  Water = 4,
  BituminousTarOrAsphalt = 5, // "earth cement"
  Brick = 6,
  MacadamOrTarmac = 7, // water-bound crushed rock
  Stone = 8,
  Coral = 9,
  Clay = 10,
  Laterite = 11, // high iron clay formed in tropical areas
  Gravel = 12,
  Earth = 13,
  Ice = 14,
  Snow = 15,
  ProtectiveLaminate = 16, // usually made of rubber
  Metal = 17,
  LandingMat = 18, // portable system usually made of aluminium
  PiercedSteelPlanking = 19,
  Wood = 20,
  NonBituminousMix = 21,
  Unknown = 22,
}

/**
 * Represents a runway at an airport.
 *
 * @interface Runway
 * @property {string} designator - The identifier of the runway (e.g., "09L", "27R").
 * @property {number} heading - The magnetic heading of the runway in degrees.
 * @property {string} [length] - The length of the runway, in meters.
 * @property {string} [width] - The width of the runway, in meters.
 * @property {RunwaySurface} [surface] - The surface material of the runway.
 * @property {boolean} [isActive] - Indicates whether the runway is currently active/operational.
 */
export interface Runway {
  designator: string;
  heading: number;
  length?: string;
  width?: string;
  surface?: RunwaySurface;
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

// TODO: Move this some place else
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
 * Represents an aerodrome (airport) in the flight planning system.
 *
 * @property {Runway[]} runways - An array of runways available at the aerodrome.
 * @property {Frequency[]} [frequencies] - Optional array of radio frequencies used at the aerodrome.
 * @property {boolean} [ppr] - Indicates if prior permission is required (PPR) to use the aerodrome.
 * @property {WaypointVariant.Aerodrome} waypointVariant - The variant of the waypoint, fixed to Aerodrome.
 */
export interface Aerodrome extends Waypoint {
  readonly runways: Runway[];
  readonly frequencies?: Frequency[];
  readonly ppr?: boolean;
  readonly waypointVariant: WaypointVariant.Aerodrome;
}
