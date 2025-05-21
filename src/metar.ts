import { normalizeICAO } from './utils.js';
import { ICloud, parseMetar } from "metar-taf-parser";
import convert from 'convert-units';
import { FlightRules, ICAO } from './index.js';

/**
 * Represents a METAR (Meteorological Aerodrome Report) station.
 *
 * @interface MetarStation
 * @property {ICAO} station - The ICAO identifier for the METAR station.
 * @property {Metar} metar - The METAR data associated with the station.
 * @property {GeoJSON.Position} coords - The geographical coordinates of the station.
 */
export interface MetarStation {
  station: ICAO;
  metar: Metar;
  coords: GeoJSON.Position;
}

/**
 * Represents a distance measurement.
 * 
 * @interface Distance
 * @property {number} value - The numerical value of the distance.
 * @property {'m'|'sm'} unit - The unit of measurement, either meters ('m') or statute miles ('sm').
 */
export interface Distance {
  value: number;
  unit: 'm' | 'sm';
}

/**
 * Represents atmospheric pressure information.
 * 
 * @interface Pressure
 * @property {number} value - The numeric value of the pressure measurement
 * @property {'hPa' | 'inHg'} unit - The unit of measurement for pressure, either hectopascals (hPa) or inches of mercury (inHg)
 */
interface Pressure {
  value: number;
  unit: 'hPa' | 'inHg';
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
  direction: number;
  directionMin?: number;
  directionMax?: number;
  speed: number;
  gust?: number;
}

/**
 * Creates a Metar object from a raw METAR string.
 * 
 * @param raw The raw METAR string
 * @returns A Metar object
 */
export function createMetarFromString(raw: string): Metar {
  const metar = parseMetar(raw);

  const observationTime = new Date();
  if (metar.day) {
    observationTime.setUTCDate(metar.day);
  } else {
    observationTime.setUTCDate(observationTime.getUTCDate() - 1);
  }
  if (metar.hour) {
    observationTime.setUTCHours(metar.hour);
  }
  if (metar.minute) {
    observationTime.setUTCMinutes(metar.minute);
  }
  observationTime.setUTCSeconds(0);
  observationTime.setUTCMilliseconds(0);

  // TODO: This is where we do all the conversion to the correct units
  return {
    station: normalizeICAO(metar.station),
    observationTime,
    raw: metar.message,
    wind: {
      direction: metar.wind?.degrees,
      directionMin: metar.wind?.minVariation,
      directionMax: metar.wind?.maxVariation,
      speed: metar.wind?.speed,
      gust: metar.wind?.gust,
    } as Wind,
    temperature: metar.temperature,
    dewpoint: metar.dewPoint,
    visibility: metar.visibility ? {
      value: metar.visibility.value,
      unit: metar.visibility.unit === 'm' ? 'm' : 'sm', // TODO: Drop the unit, convert to meters
    } as Distance : undefined,
    qnh: metar.altimeter ? {
      value: metar.altimeter.value,
      unit: metar.altimeter.unit === 'hPa' ? 'hPa' : 'inHg' // TODO: Drop the unit, convert to hPa
    } as Pressure : undefined,
    clouds: metar.clouds?.map((cloud: ICloud) => ({
      quantity: cloud.quantity,
      height: cloud.height,
    })) as Cloud[],
  }
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
 * @property {number} [windDirection] - Wind direction in degrees
 * @property {number} [windDirectionMin] - Minimum wind direction in degrees (for variable wind direction)
 * @property {number} [windDirectionMax] - Maximum wind direction in degrees (for variable wind direction)
 * @property {number} [windSpeed] - Wind speed in the units used in the METAR (typically knots)
 * @property {number} [windGust] - Wind gust speed in the same units as windSpeed
 * @property {number} [temperature] - Temperature in degrees Celsius
 * @property {number} [dewpoint] - Dewpoint temperature in degrees Celsius
 * @property {number} [visibility] - Visibility in statute miles or meters (depends on country)
 * @property {number} [qnh] - Barometric pressure (QNH) in hPa or inHg (depends on country)
 * @property {Cloud[]} [clouds] - Array of cloud layers, each with a quantity and optional height
 */
export interface Metar {
  station: string;
  observationTime: Date;
  raw: string;
  wind: Wind;
  temperature?: number;
  dewpoint?: number;
  visibility?: Distance;
  qnh?: Pressure;
  clouds?: Cloud[];
}

export function metarCeiling(metar: Metar): number | undefined {
  const cloudCeilingQuantity = ['BKN', 'OVC'];
  const clouds = metar.clouds || [];
  const cloudCeiling = clouds.filter(cloud => cloudCeilingQuantity.includes(cloud.quantity)).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  if (cloudCeiling.length > 0) {
    return cloudCeiling[0].height;
  }
  return undefined;
}

export function metarFlightRule(metar: Metar): FlightRules {
  const ceiling = metarCeiling(metar);
  let visibilityMeters: number | undefined;

  if (metar.visibility !== undefined) {
    visibilityMeters = metar.visibility.value;
    if (metar.visibility.unit === 'sm') {
      // TODO: Move this to a utility function so it can be used once the METAR is parsed
      visibilityMeters = convert(visibilityMeters).from('mi').to('m');
    }
  }
  if ((visibilityMeters !== undefined && visibilityMeters <= 1500) ||
    (ceiling !== undefined && ceiling <= 500)) {
    return FlightRules.LIFR;
  }
  if ((visibilityMeters !== undefined && visibilityMeters <= 5000) ||
    (ceiling !== undefined && ceiling <= 1000)) {
    return FlightRules.IFR;
  }
  if ((visibilityMeters !== undefined && visibilityMeters <= 8000) ||
    (ceiling !== undefined && ceiling <= 3000)) {
    return FlightRules.MVFR;
  }
  return FlightRules.VFR;
}

export function isMetarExpired(metar: Metar, options: { customMinutes?: number; useStandardRules?: boolean } = {}): boolean {
  const now = new Date();
  const { customMinutes, useStandardRules = true } = options;

  if (customMinutes !== undefined) {
    const expirationTime = new Date(metar.observationTime);
    expirationTime.setMinutes(metar.observationTime.getMinutes() + customMinutes);
    return now > expirationTime;
  }

  if (useStandardRules) {
    const isSpecial = metar.raw.includes('SPECI');
    const expirationTime = new Date(metar.observationTime);
    const expirationMinutes = isSpecial ? 30 : 60;
    expirationTime.setMinutes(metar.observationTime.getMinutes() + expirationMinutes);
    return now > expirationTime;
  }

  // Fallback to the old behavior with a default of 60 minutes
  const expirationTime = new Date(metar.observationTime);
  expirationTime.setMinutes(metar.observationTime.getMinutes() + 60);
  return now > expirationTime;
}

export type MetarFlightRuleColor = 'green' | 'blue' | 'red' | 'purple' | 'black';

export function metarFlightRuleColor(metarData: Metar): MetarFlightRuleColor {
  const flightRule = metarFlightRule(metarData);
  switch (flightRule) {
    case FlightRules.VFR:
      return 'green';
    case FlightRules.MVFR:
      return 'blue';
    case FlightRules.IFR:
      return 'red';
    case FlightRules.LIFR:
      return 'purple';
    default:
      return 'black';
  }
}

export type MetarColorCode = 'green' | 'blue' | 'yellow' | 'amber' | 'red';

export function metarColorCode(metarData: Metar): MetarColorCode {
  const visibility = metarData.visibility;
  const ceiling = metarCeiling(metarData);
  const windSpeed = metarData.wind?.speed;
  const gustSpeed = metarData.wind?.gust;

  let visibilityMeters: number | undefined;
  if (visibility) {
    visibilityMeters = visibility.value;
    if (visibility.unit === 'sm') {
      // TODO: Move this to a utility function so it can be used once the METAR is parsed
      visibilityMeters = convert(visibilityMeters).from('mi').to('m');
    }
  }
  if (
    (visibilityMeters !== undefined && visibilityMeters < 800) ||
    (ceiling !== undefined && ceiling < 200) ||
    (windSpeed !== undefined && windSpeed > 40) ||
    (gustSpeed !== undefined && gustSpeed > 50)
  ) {
    return 'red';
  }
  if (
    (visibilityMeters !== undefined && visibilityMeters < 1600) ||
    (ceiling !== undefined && ceiling < 400) ||
    (windSpeed !== undefined && windSpeed > 30) ||
    (gustSpeed !== undefined && gustSpeed > 40)
  ) {
    return 'amber';
  }
  if (
    (visibilityMeters !== undefined && visibilityMeters < 3200) ||
    (ceiling !== undefined && ceiling < 700) ||
    (windSpeed !== undefined && windSpeed > 20) ||
    (gustSpeed !== undefined && gustSpeed > 30)
  ) {
    return 'yellow';
  }
  if (
    (visibilityMeters !== undefined && visibilityMeters < 5000) ||
    (ceiling !== undefined && ceiling < 1500) ||
    (windSpeed !== undefined && windSpeed > 15) ||
    (gustSpeed !== undefined && gustSpeed > 20)
  ) {
    return 'blue';
  }
  return 'green';
}