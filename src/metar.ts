import { normalizeICAO } from './utils.js';
import { ICloud, IMetar } from "metar-taf-parser";

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

  return {
    station: normalizeICAO(metar.station),
    observationTime: observationTime,
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
 * @interface MetarData
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
export interface MetarData {
  station: string;
  observationTime: Date;
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

  clouds?: Cloud[];
}

export class Metar {
  private metarData: MetarData;

  constructor(metarData: MetarData) {
    this.metarData = metarData;
  }

  /**
   * Get the METAR data.
   * 
   * @returns The METAR data object
   */
  get metar(): MetarData {
    return this.metarData;
  }

  /**
   * Get the ICAO code of the station.
   * 
   * @returns The ICAO code of the station
   */
  get station(): string {
    return this.metarData.station;
  }

  /**
   * Get the observation time of the METAR.
   * 
   * @returns The observation time of the METAR
   */
  get raw(): string {
    return this.metarData.raw;
  }

  /**
   * Calculate the ceiling height based on the cloud layers.
   * 
   * @returns The ceiling height in feet, or undefined if the ceiling is unlimited.
   */
  get ceiling(): number | undefined {
    const cloudCeilingQuantity = ['BKN', 'OVC'];
    const clouds = this.metarData.clouds || [];
    const cloudCeiling = clouds.filter(cloud => cloudCeilingQuantity.includes(cloud.quantity)).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
    if (cloudCeiling.length > 0) {
      return cloudCeiling[0].height;
    }

    return undefined;
  }

  /**
   * Calculate the flight rules based on the visibility and ceiling.
   * 
   * @returns The flight rules category based on visibility and ceiling
   */
  get flightRule(): FlightRules {
    const ceiling = this.ceiling;
    let visibilityMeters: number | undefined;

    if (this.metarData.visibility !== undefined) {
      visibilityMeters = this.metarData.visibility.value;
      if (this.metarData.visibility.unit === 'sm') {
        // Convert statute miles to meters
        visibilityMeters *= 1609.34;
      }
    }

    // Check for LIFR first (most restrictive)
    if ((visibilityMeters !== undefined && visibilityMeters <= 1500) ||
      (ceiling !== undefined && ceiling <= 500)) {
      return FlightRules.LIFR;
    }

    // Check for IFR
    if ((visibilityMeters !== undefined && visibilityMeters <= 5000) ||
      (ceiling !== undefined && ceiling <= 1000)) {
      return FlightRules.IFR;
    }

    // Check for MVFR
    if ((visibilityMeters !== undefined && visibilityMeters <= 8000) ||
      (ceiling !== undefined && ceiling <= 3000)) {
      return FlightRules.MVFR;
    }

    // Default to VFR when all other conditions are not met
    return FlightRules.VFR;
  }

  /**
   * Formats wind information from the METAR data into a human-readable string.
   * 
   * @returns A formatted string describing wind conditions or 'Calm' if no wind direction is present
   */
  formatWind(): string {
    if (!this.metarData.windDirection) {
      return 'Calm';
    }

    let windString = `${this.metarData.windDirection}° ${this.metarData.windSpeed}kt`;
    if (this.metarData.windGust) {
      windString += ` gusting ${this.metarData.windGust}kt`;
    }

    if (this.metarData.windDirectionMin && this.metarData.windDirectionMax) {
      windString += ` (${this.metarData.windDirectionMin}° to ${this.metarData.windDirectionMax}°)`;
    }

    return windString;
  }

  /**
   * Formats temperature information from the METAR data into a human-readable string.
   * 
   * @returns A formatted string with temperature in Celsius, or '-' if temperature is not available
   */
  formatTemperature(): string {
    if (this.metarData.temperature === undefined) {
      return '-';
    }
    return `${this.metarData.temperature}°C`;
  }

  /**
   * Formats dewpoint information from the METAR data into a human-readable string.
   * 
   * @returns A formatted string with dewpoint in Celsius, or '-' if dewpoint is not available
   */
  formatDewpoint(): string {
    if (this.metarData.dewpoint === undefined) {
      return '-';
    }
    return `${this.metarData.dewpoint}°C`;
  }

  /**
   * Formats visibility information into a human-readable string.
   * 
   * @returns A formatted visibility string, accounting for unit conversions and special cases like CAVOK
   */
  formatVisibility(): string {
    if (this.metarData.visibility === undefined) {
      // Check if CAVOK (Ceiling And Visibility OK) conditions are present in the raw METAR
      if (this.metarData.raw.includes('CAVOK')) {
        return '10 km+';
      }
      return '-';
    }

    if (this.metarData.visibility.value >= 9999 && this.metarData.visibility.unit === 'm') {
      return '10 km+';
    } else if (this.metarData.visibility.value >= 10 && this.metarData.visibility.unit === 'sm') {
      return '10 sm+';
    }

    if (this.metarData.visibility.unit === 'm') {
      if (this.metarData.visibility.value < 1000) {
        return `${this.metarData.visibility.value} m`;
      }
      return `${(this.metarData.visibility.value / 1000).toFixed(1)} km`;
    } else {
      return `${this.metarData.visibility.value} sm`;
    }
  }

  /**
   * Formats barometric pressure (QNH) into a human-readable string.
   * 
   * @returns A formatted pressure string with appropriate units, or '-' if not available
   */
  formatQNH(): string {
    if (this.metarData.qnh === undefined) {
      return '-';
    }

    return `${this.metarData.qnh.value} ${this.metarData.qnh.unit}`;
  }

  /**
   * Formats ceiling information into a human-readable string.
   * 
   * @returns A formatted ceiling height string with units, or '-' if unlimited
   */
  formatCeiling(): string {
    if (this.ceiling === undefined) {
      return '-';
    }

    return `${this.ceiling} ft`;
  }

  /**
   * Determines the color associated with the current flight rules.
   * 
   * @returns A string representing the color associated with the flight rules:
   *          - 'green' for VFR (Visual Flight Rules)
   *          - 'blue' for MVFR (Marginal Visual Flight Rules)
   *          - 'red' for IFR (Instrument Flight Rules)
   *          - 'purple' for LIFR (Low Instrument Flight Rules)
   *          - 'black' for any undefined flight rules
   */
  flightRuleColor(): string {
    switch (this.flightRule) {
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
}