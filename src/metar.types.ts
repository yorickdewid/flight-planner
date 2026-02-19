import { ICAO } from './constants.js';

/**
 * Enumeration representing different flight rules categories.
 *
 * @enum {string}
 * @readonly
 * @property {string} VFR - Visual Flight Rules
 * @property {string} MVFR - Marginal Visual Flight Rules
 * @property {string} IFR - Instrument Flight Rules
 * @property {string} LIFR - Low Instrument Flight Rules
 */
export enum FlightRules {
  VFR = 'VFR',
  MVFR = 'MVFR',
  IFR = 'IFR',
  LIFR = 'LIFR',
}

/**
 * Represents a METAR (Meteorological Aerodrome Report) station.
 *
 * @interface MetarStation
 * @property {ICAO} station - The ICAO identifier for the METAR station.
 * @property {Metar} metar - The METAR data associated with the station.
 * @property {string} [tafRaw] - The raw TAF (Terminal Aerodrome Forecast) text string, if available.
 * @property {GeoJSON.Position} coords - The geographical coordinates of the station.
 */
export interface MetarStation {
  station: ICAO;
  metar: Metar;
  tafRaw?: string;
  coords: GeoJSON.Position;
}

/**
 * Represents cloud information.
 *
 * @interface Cloud
 * @property {'SKC' | 'FEW' | 'BKN' | 'SCT' | 'OVC' | 'NSC'} quantity - The cloud coverage quantity.
 * @property {number} [height] - The height of the cloud layer in feet (optional).
 */
export interface Cloud {
  quantity: 'SKC' | 'FEW' | 'BKN' | 'SCT' | 'OVC' | 'NSC';
  height?: number; // Height in feet
}

/**
 * Represents wind conditions.
 *
 * @interface Wind
 * @property {number} direction - The direction of the wind in degrees (0-359).
 * @property {number} [directionMin] - The minimum wind direction in degrees (optional).
 * @property {number} [directionMax] - The maximum wind direction in degrees (optional).
 * @property {number} speed - The speed of the wind in knots.
 * @property {number} [gust] - The gust speed in knots (optional).
 */
export interface Wind {
  direction?: number;
  directionMin?: number;
  directionMax?: number;
  speed: number;
  gust?: number;
}

/**
 * Represents weather phenomena conditions.
 *
 * @interface WeatherPhenomena
 * @property {'VC' | '-' | '+' | ''} intensity - Intensity of the phenomena (vicinity, light, heavy, moderate)
 * @property {string} phenomenon - The weather phenomenon code (e.g., 'RA', 'SN', 'FG', 'BR')
 * @property {string} [descriptor] - Optional descriptor (e.g., 'SH' for showers, 'TS' for thunderstorm)
 */
export interface WeatherPhenomena {
  intensity: 'VC' | '-' | '+' | '';
  phenomenon: string;
  descriptor?: string;
}

/**
 * Interface representing METAR (Meteorological Terminal Aviation Routine Weather Report) data.
 *
 * Contains parsed weather data from a METAR report, including station identification,
 * observation time, flight rules category, and various weather parameters.
 *
 * @interface Metar
 * @property {string} station - The ICAO code of the reporting station
 * @property {Date} observationTime - The date and time when the observation was made
 * @property {string} raw - The raw METAR text string
 * @property {Wind} wind - Wind conditions
 * @property {number} [temperature] - Temperature in degrees Celsius
 * @property {number} [dewpoint] - Dewpoint temperature in degrees Celsius
 * @property {number} [visibility] - Visibility in meters
 * @property {number} [qnh] - Barometric pressure (QNH) in hPa
 * @property {Cloud[]} [clouds] - Array of cloud layers, each with a quantity and optional height
 * @property {WeatherPhenomena[]} [weatherPhenomena] - Array of current weather phenomena
 * @property {boolean} [cavok] - CAVOK (Ceiling And Visibility OK) condition
 */
export interface Metar {
  station: string;
  observationTime: Date;
  raw: string;
  wind: Wind;
  temperature?: number;
  dewpoint?: number;
  visibility?: number; // in meters
  qnh?: number; // in hPa
  clouds?: Cloud[];
  weatherPhenomena?: WeatherPhenomena[];
  cavok?: boolean;
}

export type MetarFlightRuleColor = 'green' | 'blue' | 'red' | 'purple' | 'black';

export type MetarColorCode = 'green' | 'blue' | 'yellow' | 'amber' | 'red';

export interface ColorCondition {
  color: MetarColorCode;
  visibilityLessThan?: number;
  ceilingLessThan?: number;
  windSpeedGreaterThan?: number;
  gustSpeedGreaterThan?: number;
}
