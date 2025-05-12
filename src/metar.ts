import { normalizeICAO } from './utils.js';
import { ICloud, IMetar, parseMetar } from "metar-taf-parser";
import convert from 'convert-units';

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
 * Represents a distance measurement.
 * 
 * @interface Distance
 * @property {number} value - The numerical value of the distance.
 * @property {'m'|'sm'} unit - The unit of measurement, either meters ('m') or statute miles ('sm').
 */
interface Distance {
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
interface Cloud {
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
export function createMetarFromRaw(raw: string): Metar {
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

export function calculateMetarCeiling(metarData: Metar): number | undefined {
  const cloudCeilingQuantity = ['BKN', 'OVC'];
  const clouds = metarData.clouds || [];
  const cloudCeiling = clouds.filter(cloud => cloudCeilingQuantity.includes(cloud.quantity)).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  if (cloudCeiling.length > 0) {
    return cloudCeiling[0].height;
  }
  return undefined;
}

export function determineMetarFlightRule(metarData: Metar): FlightRules {
  const ceiling = calculateMetarCeiling(metarData);
  let visibilityMeters: number | undefined;

  if (metarData.visibility !== undefined) {
    visibilityMeters = metarData.visibility.value;
    if (metarData.visibility.unit === 'sm') {
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

export function calculateMetarTimeElapsed(metarData: Metar): number {
  const now = new Date();
  const elapsed = now.getTime() - metarData.observationTime.getTime();
  return Math.floor(elapsed / (1000 * 60));
}

export function isMetarExpired(metarData: Metar, options: { customMinutes?: number; useStandardRules?: boolean } = {}): boolean {
  const now = new Date();
  const { customMinutes, useStandardRules = true } = options;

  if (customMinutes !== undefined) {
    const expirationTime = new Date(metarData.observationTime);
    expirationTime.setMinutes(metarData.observationTime.getMinutes() + customMinutes);
    return now > expirationTime;
  }

  if (useStandardRules) {
    const isSpecial = metarData.raw.includes('SPECI');
    const expirationTime = new Date(metarData.observationTime);
    const expirationMinutes = isSpecial ? 30 : 60;
    expirationTime.setMinutes(metarData.observationTime.getMinutes() + expirationMinutes);
    return now > expirationTime;
  }

  // Fallback to the old behavior with a default of 60 minutes
  const expirationTime = new Date(metarData.observationTime);
  expirationTime.setMinutes(metarData.observationTime.getMinutes() + 60);
  return now > expirationTime;
}

export function formatMetarObservationTime(metarData: Metar, locale?: string): string {
  if (!locale) {
    const date = metarData.observationTime;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  };
  return metarData.observationTime.toLocaleString(locale, options);
}

// TODO: Make this a utility function that takes a Wind object and returns a formatted string
export function formatMetarWind(metarData: Metar): string {
  if (metarData.wind.speed === 0) {
    return 'Calm';
  }

  if (metarData.wind.direction !== undefined) { // Ensure direction is defined before using
    let windString = `${metarData.wind.direction}° with ${metarData.wind.speed}kt`;
    if (metarData.wind.gust) {
      windString += ` gusting ${metarData.wind.gust}kt`;
    }

    if (metarData.wind.directionMin && metarData.wind.directionMax) {
      windString += ` variable between ${metarData.wind.directionMin}° and ${metarData.wind.directionMax}°`;
    }
    return windString;
  }

  return 'Calm'; // Fallback if direction is somehow undefined despite type
}

// TODO: Make this a utility function that takes a temperature and returns a formatted string
export function formatMetarTemperature(metarData: Metar): string {
  if (metarData.temperature === undefined) {
    return '-';
  }
  return `${metarData.temperature}°C`;
}

// TODO: Make this a utility function that takes a dewpoint and returns a formatted string
export function formatMetarDewpoint(metarData: Metar): string {
  if (metarData.dewpoint === undefined) {
    return '-';
  }
  return `${metarData.dewpoint}°C`;
}

// TODO: Make this a utility function that takes a visibility and returns a formatted string
export function formatMetarVisibility(metarData: Metar): string {
  if (metarData.visibility === undefined) {
    if (metarData.raw.includes('CAVOK')) {
      return '10 km+';
    }
    return '-';
  }

  if (metarData.visibility.value >= 9999 && metarData.visibility.unit === 'm') {
    return '10 km+';
  } else if (metarData.visibility.value >= 10 && metarData.visibility.unit === 'sm') {
    return '10 sm+';
  }

  if (metarData.visibility.unit === 'm') {
    if (metarData.visibility.value < 1000) {
      return `${metarData.visibility.value} m`;
    }
    return `${(metarData.visibility.value / 1000).toFixed(1)} km`;
  } else {
    return `${metarData.visibility.value} sm`;
  }
}

export function formatMetarQNH(metarData: Metar): string {
  if (metarData.qnh === undefined) {
    return '-';
  }
  return `${metarData.qnh.value} ${metarData.qnh.unit}`;
}

export function formatMetarCeiling(metarData: Metar): string {
  const ceiling = calculateMetarCeiling(metarData);
  if (ceiling === undefined) {
    return '-';
  }
  return `${ceiling} ft`;
}

export function formatMetarClouds(metarData: Metar): string {
  if (metarData.clouds === undefined || metarData.clouds.length === 0) {
    return '-';
  }

  const sortedClouds = [...metarData.clouds].sort((a, b) => {
    if (a.height === undefined) return 1;
    if (b.height === undefined) return -1;
    return a.height - b.height;
  });

  const cloudQuantityMap: Record<string, string> = {
    'SKC': 'Clear',
    'FEW': 'Few',
    'BKN': 'Broken',
    'SCT': 'Scattered',
    'OVC': 'Overcast',
    'NSC': 'No Significant Clouds',
  };

  return sortedClouds.map(cloud => {
    if (cloud.height) {
      return `${cloudQuantityMap[cloud.quantity]} at ${cloud.height} ft`;
    }
    return cloudQuantityMap[cloud.quantity];
  }).join(', ');
}

export function getMetarFlightRuleColor(metarData: Metar): string {
  const flightRule = determineMetarFlightRule(metarData);
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

export function getMetarColorCode(metarData: Metar): string {
  const visibility = metarData.visibility;
  const ceiling = calculateMetarCeiling(metarData);
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