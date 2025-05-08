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
 * Converts a METAR object to a MetarData object.
 * 
 * @param metar The METAR object
 * @returns The MetarData object
 */
function fromIMetar(metar: IMetar): MetarData {
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
 * Creates a Metar object from a raw METAR string.
 * 
 * @param raw The raw METAR string
 * @returns A Metar object
 */
export function createMetarFromRaw(raw: string): Metar {
  const metar = parseMetar(raw);
  return new Metar(fromIMetar(metar));
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
  wind: Wind;
  temperature?: number;
  dewpoint?: number;
  visibility?: Distance;
  qnh?: Pressure;
  clouds?: Cloud[];
}

// TOOD: Convert this into separate functions
// TODO: Make this the default export
export class Metar {
  /**
   * Creates a new Metar object.
   * 
   * @param metarData The METAR data object
   */
  constructor(
    private metarData: MetarData
  ) { }

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
   * Get the wind information from the METAR data.
   *
   * @returns The wind information object
   */
  get wind(): Wind {
    return this.metarData.wind;
  }

  /**
   * Get the cloud information from the METAR data.
   *
   * @returns An array of cloud objects, or undefined if no clouds are reported
   */
  get clouds(): Cloud[] | undefined {
    return this.metarData.clouds;
  }

  /**
   * Get the temperature from the METAR data.
   * 
   * @returns The temperature in degrees Celsius, or undefined if not available
   */
  get QNH(): Pressure | undefined {
    return this.metarData.qnh;
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

  /**
   * Calculates the time elapsed since the METAR observation in minutes.
   * 
   * @returns The time elapsed since the observation in minutes
   */
  get timeElapsed(): number {
    const now = new Date();
    const elapsed = now.getTime() - this.metarData.observationTime.getTime();
    return Math.floor(elapsed / (1000 * 60));
  }

  /**
   * Checks if the METAR is expired based on either standard expiration rules or a custom duration.
   * 
   * @param options Configuration options
   * @param options.customMinutes Optional custom validity period in minutes
   * @param options.useStandardRules Whether to use standard aviation rules (default: true)
   * @returns True if the METAR is expired, false otherwise
   */
  isExpired(options: { customMinutes?: number; useStandardRules?: boolean } = {}): boolean {
    const now = new Date();
    const { customMinutes, useStandardRules = true } = options;

    if (customMinutes !== undefined) {
      const expirationTime = new Date(this.metarData.observationTime);
      expirationTime.setMinutes(this.metarData.observationTime.getMinutes() + customMinutes);
      return now > expirationTime;
    }

    if (useStandardRules) {
      const isSpecial = this.metarData.raw.includes('SPECI');

      const expirationTime = new Date(this.metarData.observationTime);

      // Regular METARs are typically valid for 1 hour
      // SPECIs are valid until the next report (usually the next regular METAR)
      const expirationMinutes = isSpecial ? 30 : 60;
      expirationTime.setMinutes(this.metarData.observationTime.getMinutes() + expirationMinutes);

      return now > expirationTime;
    }

    // Fallback to the old behavior with a default of 60 minutes
    const expirationTime = new Date(this.metarData.observationTime);
    expirationTime.setMinutes(this.metarData.observationTime.getMinutes() + 60);
    return now > expirationTime;
  }

  /**
   * Returns the raw METAR string.
   * 
   * @returns The raw METAR string
   */
  toString(): string {
    return this.metarData.raw;
  }

  /**
   * Formats the observation time of the METAR into a human-readable string.
   * 
   * @param locale Optional locale string for formatting
   * @returns A formatted string representing the observation time
   */
  formatObservationTime(locale?: string): string {
    if (!locale) {
      const date = this.metarData.observationTime;
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
    return this.metarData.observationTime.toLocaleString(locale, options);
  }

  /**
   * Formats wind information from the METAR data into a human-readable string.
   * 
   * @returns A formatted string describing wind conditions or 'Calm' if wind speed is 0
   */
  formatWind(): string {
    if (this.metarData.wind.speed === 0) {
      return 'Calm';
    }

    if (this.metarData.wind.direction) {
      let windString = `${this.metarData.wind.direction}° with ${this.metarData.wind.speed}kt`;
      if (this.metarData.wind.gust) {
        windString += ` gusting ${this.metarData.wind.gust}kt`;
      }

      if (this.metarData.wind.directionMin && this.metarData.wind.directionMax) {
        windString += ` variable between ${this.metarData.wind.directionMin}° and ${this.metarData.wind.directionMax}°`;
      }
      return windString;
    }

    return 'Calm';
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
   * Formats cloud information into a human-readable string.
   * The clouds are sorted by height with the lowest clouds first.
   * Clouds with undefined heights appear at the end of the list.
   * 
   * @returns A formatted string describing the clouds (sorted by height, lowest first), 
   *          or '-' if no clouds are reported
   */
  formatClouds(): string {
    if (this.metarData.clouds === undefined) {
      return '-';
    }
    if (this.metarData.clouds.length === 0) {
      return '-';
    }

    const sortedClouds = [...this.metarData.clouds].sort((a, b) => {
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
  get flightRuleColor(): string {
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

  /**
   * Determines the aviation color code based on meteorological conditions.
   * Color codes indicate current conditions at the aerodrome:
   * - GREEN: Normal operations - no significant restrictions
   * - BLUE: Minor deterioration in conditions - minor restrictions
   * - YELLOW: Significant deterioration - operations limited
   * - AMBER: Hazardous conditions - operations severely limited
   * - RED: Very hazardous conditions - operations not recommended
   * 
   * @returns A string representing the aviation color code:
   *          - 'green' for normal operations
   *          - 'blue' for minor deterioration
   *          - 'yellow' for significant deterioration
   *          - 'amber' for hazardous conditions
   *          - 'red' for very hazardous conditions
   */
  get colorCode(): string {
    const visibility = this.metarData.visibility;
    const ceiling = this.ceiling;
    const windSpeed = this.metarData.wind?.speed;
    const gustSpeed = this.metarData.wind?.gust;

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
}