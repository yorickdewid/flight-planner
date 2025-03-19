import { ICloud, IMetar } from "metar-taf-parser";
import { normalizeICAO } from "./utils";

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
 * Interface representing METAR (Meteorological Terminal Aviation Routine Weather Report) data.
 *
 * Contains parsed weather data from a METAR report, including station identification,
 * observation time, flight rules category, and various weather parameters.
 *
 * @interface MetarData
 * @property {string} station - The ICAO code of the reporting station
 * @property {Date} observationTime - The date and time when the observation was made
 * @property {FlightRules} flightRules - The flight rules category (VFR, MVFR, IFR, LIFR)
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
 * @property {number} [ceiling] - Height of the lowest broken or overcast cloud layer in feet
 */
export interface MetarData {
  station: string;
  observationTime: Date;
  flightRules: FlightRules;
  raw: string;

  windDirection?: number;
  windDirectionMin?: number;
  windDirectionMax?: number;
  windSpeed?: number;
  windGust?: number;

  temperature?: number;
  dewpoint?: number;
  visibility?: Distance;
  qnh?: Pressure;
  ceiling?: number;
}

/**
 * Calculate the ceiling height based on the cloud layers.
 * 
 * @param clouds The cloud layers
 * @returns The ceiling height in feet, or undefined if the ceiling is unlimited.
 */
function calculateCeilingHeight(clouds: ICloud[]): number | undefined {
  const cloudCeilingQuantity = ['BKN', 'OVC'];
  const cloudCeiling = clouds.filter(cloud => cloudCeilingQuantity.includes(cloud.quantity)).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  if (cloudCeiling.length > 0) {
    return cloudCeiling[0].height ?? undefined;
  }

  return undefined;
}

/**
 * Calculate the flight rules based on the visibility and ceiling.
 * 
 * @param metarData The METAR data
 * @returns The flight rules
 */
function calculateFlightRules(metarData: MetarData): FlightRules {
  let visibilityMeters: number | undefined;

  if (metarData.visibility !== undefined) {
    visibilityMeters = metarData.visibility.value;
    if (metarData.visibility.unit === 'sm') {
      visibilityMeters *= 1609.34;
    }
  }

  // Check for LIFR first (most restrictive)
  if (visibilityMeters !== undefined && visibilityMeters <= 1500 ||
    metarData.ceiling !== undefined && metarData.ceiling <= 500) {
    return FlightRules.LIFR;
  }

  // Check for IFR
  if (visibilityMeters !== undefined && visibilityMeters <= 5000 ||
    metarData.ceiling !== undefined && metarData.ceiling <= 1000) {
    return FlightRules.IFR;
  }

  // Check for MVFR
  if (visibilityMeters !== undefined && visibilityMeters <= 8000 ||
    metarData.ceiling !== undefined && metarData.ceiling <= 3000) {
    return FlightRules.MVFR;
  }

  return FlightRules.VFR;
}

/**
 * Converts a METAR object to a MetarData object.
 * 
 * @param metar The METAR object
 * @returns The MetarData object
 */
export function fromIMetar(metar: IMetar): MetarData {
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

  const data = {
    station: normalizeICAO(metar.station),
    observationTime: observationTime,
    flightRules: 'VFR' as FlightRules,
    raw: metar.message,

    windDirection: metar?.wind?.degrees,
    windDirectionMin: metar?.wind?.minVariation,
    windDirectionMax: metar?.wind?.maxVariation,
    windSpeed: metar?.wind?.speed, // TODO: check the unit
    windGust: metar?.wind?.gust, // TODO: check the unit

    temperature: metar.temperature,
    dewpoint: metar.dewPoint,

    visibility: metar.visibility ? {
      value: metar.visibility.value,
      unit: metar.visibility.unit === 'm' ? 'm' : 'sm',
    } as Distance : undefined,
    qnh: metar.altimeter ? {
      value: metar.altimeter.value,
      unit: metar.altimeter.unit === 'hPa' ? 'hPa' : 'inHg'
    } as Pressure : undefined,
    ceiling: calculateCeilingHeight(metar.clouds),
  };

  data.flightRules = calculateFlightRules(data);
  return data;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatWind(metarData: MetarData): string {
  if (!metarData.windDirection) {
    return 'Calm';
  }

  let windString = `${metarData.windDirection}° ${metarData.windSpeed}kt`;
  if (metarData.windGust) {
    windString += ` gusting ${metarData.windGust}kt`;
  }

  if (metarData.windDirectionMin && metarData.windDirectionMax) {
    windString += ` (${metarData.windDirectionMin}° to ${metarData.windDirectionMax}°)`;
  }

  return windString;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatTemperature(metarData: MetarData): string {
  return `${metarData.temperature}°C`;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatDewpoint(metarData: MetarData): string {
  return `${metarData.dewpoint}°C`;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatVisibility(metarData: MetarData): string {
  if (metarData.visibility === undefined) {
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

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatQNH(metarData: MetarData): string {
  if (metarData.qnh === undefined) {
    return '-';
  }

  return `${metarData.qnh.value} ${metarData.qnh.unit}`;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatCeiling(metarData: MetarData): string {
  if (metarData.ceiling === undefined) {
    return '-';
  }

  return `${metarData.ceiling} ft`;
}

/**
 * Returns a color string corresponding to the given flight rules.
 * 
 * @param flightRules - The flight rules to convert to a color
 * @returns A string representing the color associated with the flight rules:
 *          - 'green' for VFR (Visual Flight Rules)
 *          - 'blue' for MVFR (Marginal Visual Flight Rules)
 *          - 'red' for IFR (Instrument Flight Rules)
 *          - 'purple' for LIFR (Low Instrument Flight Rules)
 *          - 'black' for any undefined flight rules
 */
export function colorizeFlightRules(flightRules: FlightRules): string {
  switch (flightRules) {
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
