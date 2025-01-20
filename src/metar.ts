import { ICloud, IMetar } from "metar-taf-parser";

export enum FlightRules {
  VFR = 'VFR',
  MVFR = 'MVFR',
  IFR = 'IFR',
  LIFR = 'LIFR',
}

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
  visibility?: number;
  qnh?: number;
  ceiling?: number;
}

/**
 * Calculate the ceiling height based on the cloud layers.
 * 
 * @param clouds The cloud layers
 * @returns The ceiling height in feet, or undefined if the ceiling is unlimited.
 */
function calculateCeilingHeight(clouds: ICloud[]): number | undefined {
  const cloudCeilingQuantity = ['BKN', 'SCT', 'OVC'];
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
  if (metarData.visibility !== undefined) {
    if (metarData.visibility > 8000 && (metarData.ceiling === undefined || metarData.ceiling > 3000)) {
      return FlightRules.VFR;
    } else if (metarData.visibility > 5000 && metarData.ceiling !== undefined && metarData.ceiling > 1000) {
      return FlightRules.MVFR;
    } else if (metarData.visibility > 1500 && metarData.ceiling !== undefined && metarData.ceiling > 500) {
      return FlightRules.IFR;
    }
  }

  return FlightRules.LIFR;
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
    station: metar.station,
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

    visibility: metar.visibility?.value, // TODO: check the unit
    qnh: metar.altimeter?.value, // TODO: check the unit
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
export function formatVisibility(metarData: MetarData): string {
  if (metarData.visibility === undefined) {
    return 'Unknown';
  }

  if (metarData.visibility >= 9999) {
    return '10 km+';
  }

  if (metarData.visibility < 1000) {
    return `${metarData.visibility} m`;
  }

  return `${metarData.visibility / 1000} km`;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatQNH(metarData: MetarData): string {
  return `${metarData.qnh} hPa`;
}

/**
 * Converts a MetarData object to a METAR string.
 * 
 * @param metarData The MetarData object
 * @returns The METAR string
 */
export function formatCeiling(metarData: MetarData): string {
  if (metarData.ceiling === undefined) {
    return 'Unlimited';
  }

  return `${metarData.ceiling} ft`;
}
