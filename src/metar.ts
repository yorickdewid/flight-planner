import { normalizeICAO } from './utils.js';
import { ICloud, parseMetar } from "metar-taf-parser";
import { FlightRules } from './index.js';
import convert from 'convert-units';
import { Metar, Cloud, MetarFlightRuleColor, MetarColorCode, ColorCondition } from './metar.types.js';

/**
 * Creates a Metar object from a raw METAR string.
 *
 * @param raw The raw METAR string
 * @returns A Metar object
 */
export function createMetarFromString(raw: string): Metar {
  const metar = parseMetar(raw);

  const observationTime = new Date();
  observationTime.setUTCDate(metar.day ?? observationTime.getUTCDate());
  observationTime.setUTCHours(metar.hour ?? observationTime.getUTCHours());
  observationTime.setUTCMinutes(metar.minute ?? observationTime.getUTCMinutes());
  observationTime.setUTCSeconds(0);
  observationTime.setUTCMilliseconds(0);

  let windSpeed = metar.wind?.speed;
  if (metar.wind && metar.wind.unit === 'MPS') {
    windSpeed = metar.wind.speed && convert(metar.wind.speed).from('m/s').to('knot');
  } else if (metar.wind && metar.wind.unit === 'KM/H') {
    windSpeed = metar.wind.speed && convert(metar.wind.speed).from('km/h').to('knot');
  }
  let windGust = metar.wind?.gust;
  if (metar.wind && metar.wind.unit === 'MPS') {
    windGust = metar.wind.gust && convert(metar.wind.gust).from('m/s').to('knot');
  } else if (metar.wind && metar.wind.unit === 'KM/H') {
    windGust = metar.wind.gust && convert(metar.wind.gust).from('km/h').to('knot');
  }

  let visibility = metar.visibility?.value;
  if (metar.visibility && metar.visibility.unit === 'SM') {
    visibility = convert(metar.visibility?.value).from('mi').to('m');
  }

  let altimeter = metar.altimeter?.value;
  if (metar.altimeter && metar.altimeter.unit === 'inHg') {
    altimeter = metar.altimeter?.value * 33.8639; // TODO: sumbit PR to convert-units to add inHg
  }

  return {
    station: normalizeICAO(metar.station),
    observationTime,
    raw: metar.message,
    wind: {
      direction: metar.wind?.degrees,
      directionMin: metar.wind?.minVariation,
      directionMax: metar.wind?.maxVariation,
      speed: windSpeed ?? 0,
      gust: windGust,
    },
    temperature: metar.temperature,
    dewpoint: metar.dewPoint,
    visibility,
    qnh: altimeter,
    clouds: metar.clouds?.map((cloud: ICloud) => ({
      quantity: cloud.quantity,
      height: cloud.height,
    })) as Cloud[],
  }
}

/**
 * Calculates the ceiling from METAR data.
 * The ceiling is defined as the height of the lowest cloud layer that is 'BKN' (broken) or 'OVC' (overcast).
 *
 * @param {Metar} metar - The METAR data.
 * @returns {number | undefined} The ceiling height in feet, or undefined if no ceiling exists.
 */
export function metarCeiling(metar: Metar): number | undefined {
  const cloudCeilingQuantity = ['BKN', 'OVC'];
  const clouds = metar.clouds || [];
  const cloudCeiling = clouds.filter(cloud => cloudCeilingQuantity.includes(cloud.quantity)).sort((a, b) => (a.height ?? 0) - (b.height ?? 0));
  if (cloudCeiling.length > 0) {
    return cloudCeiling[0].height;
  }
  return undefined;
}

/**
 * Determines the flight rules category based on METAR data.
 *
 * @param {Metar} metar - The METAR data.
 * @returns {FlightRules} The flight rules category (LIFR, IFR, MVFR, VFR).
 */
export function metarFlightRule(metar: Metar): FlightRules {
  const ceiling = metarCeiling(metar);

  if ((metar.visibility !== undefined && metar.visibility <= 1500) ||
    (ceiling !== undefined && ceiling <= 500)) {
    return FlightRules.LIFR;
  }
  if ((metar.visibility !== undefined && metar.visibility <= 5000) ||
    (ceiling !== undefined && ceiling <= 1000)) {
    return FlightRules.IFR;
  }
  if ((metar.visibility !== undefined && metar.visibility <= 8000) ||
    (ceiling !== undefined && ceiling <= 3000)) {
    return FlightRules.MVFR;
  }
  return FlightRules.VFR;
}

/**
 * Checks if a METAR report has expired.
 *
 * By default, it uses standard expiration rules: 60 minutes for regular METARs,
 * and 30 minutes for SPECI reports.
 * A custom expiration time in minutes can also be provided.
 *
 * @param {Metar} metar - The METAR data.
 * @param {object} [options] - Options for expiration checking.
 * @param {number} [options.customMinutes] - Custom expiration time in minutes.
 * @param {boolean} [options.useStandardRules=true] - Whether to use standard expiration rules.
 * @returns {boolean} True if the METAR has expired, false otherwise.
 */
export function isMetarExpired(metar: Metar, options: { customMinutes?: number; useStandardRules?: boolean } = {}): boolean {
  const now = new Date();
  const { customMinutes, useStandardRules = true } = options;

  if (customMinutes !== undefined) {
    return now.getTime() > metar.observationTime.getTime() + customMinutes * 60_000;
  }

  if (useStandardRules) {
    const isSpecial = metar.raw.includes('SPECI');
    const expirationMinutes = isSpecial ? 30 : 60;
    return now.getTime() > metar.observationTime.getTime() + expirationMinutes * 60_000;
  }

  // Fallback to the old behavior with a default of 60 minutes
  return now.getTime() > metar.observationTime.getTime() + 60 * 60_000;
}

/**
 * Gets the color associated with the flight rule category of a METAR.
 *
 * @param {Metar} metarData - The METAR data.
 * @returns {MetarFlightRuleColor} The color string ('green', 'blue', 'red', 'purple', 'black').
 */
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

const colorConditions: ColorCondition[] = [
  {
    color: 'red',
    visibilityLessThan: 800,
    ceilingLessThan: 200,
    windSpeedGreaterThan: 40,
    gustSpeedGreaterThan: 50,
  },
  {
    color: 'amber',
    visibilityLessThan: 1600,
    ceilingLessThan: 400,
    windSpeedGreaterThan: 30,
    gustSpeedGreaterThan: 40,
  },
  {
    color: 'yellow',
    visibilityLessThan: 3200,
    ceilingLessThan: 700,
    windSpeedGreaterThan: 20,
    gustSpeedGreaterThan: 30,
  },
  {
    color: 'blue',
    visibilityLessThan: 5000,
    ceilingLessThan: 1500,
    windSpeedGreaterThan: 15,
    gustSpeedGreaterThan: 20,
  },
];

/**
 * Determines the color code for a METAR based on visibility, ceiling, and wind conditions.
 *
 * The color code represents the severity of the weather conditions, with 'green' being the mildest
 * and 'red' being the most severe.
 *
 * @param {Metar} metarData - The METAR data to evaluate.
 * @returns {MetarColorCode} The color code representing the weather conditions.
 */
export function metarColorCode(metarData: Metar): MetarColorCode {
  const visibility = metarData.visibility;
  const ceiling = metarCeiling(metarData);
  const windSpeed = metarData.wind?.speed;
  const gustSpeed = metarData.wind?.gust;

  for (const condition of colorConditions) {
    if (
      (condition.visibilityLessThan && visibility && visibility < condition.visibilityLessThan) ||
      (condition.ceilingLessThan && ceiling && ceiling < condition.ceilingLessThan) ||
      (condition.windSpeedGreaterThan && windSpeed && windSpeed > condition.windSpeedGreaterThan) ||
      (condition.gustSpeedGreaterThan && gustSpeed && gustSpeed > condition.gustSpeedGreaterThan)
    ) {
      return condition.color;
    }
  }

  return 'green';
}
