import { calculateWindVector } from './utils.js';
import { Wind } from './metar.js';
import { bearing, bearingToAzimuth, distance } from "@turf/turf";
import { Aerodrome, FrequencyType, Runway, RunwayWindVector, Waypoint } from './waypoint.types.js';

/**
 * Calculates the distance from one waypoint to another.
 * 
 * @param from The starting waypoint.
 * @param to The destination waypoint.
 * @returns The distance in nautical miles.
 */
export function waypointDistance(from: Waypoint, to: Waypoint): number {
  return distance(from.location, to.location, { units: 'nauticalmiles' });
}

/**
 * Calculates the heading from one waypoint to another.
 * 
 * @param from The starting waypoint.
 * @param to The destination waypoint.
 * @returns The heading in degrees.
 */
export function waypointHeading(from: Waypoint, to: Waypoint): number {
  const bearingValue = bearing(from.location, to.location);
  return bearingToAzimuth(bearingValue);
}

/**
 * Returns a string representation of the aerodrome (Name (ICAO)).
 * 
 * @param aerodrome The aerodrome.
 * @returns A string representation of the aerodrome.
 */
export function aerodromeToString(aerodrome: Aerodrome): string {
  return `${aerodrome.name} (${aerodrome.ICAO})`;
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
 * Calculates the QFE (atmospheric pressure at aerodrome elevation) value.
 * 
 * @param aerodrome The aerodrome.
 * @returns The QFE value in hPa (hectopascals), rounded to 2 decimal places,
 *          or undefined if elevation or QNH data is not available.
 */
export function calculateAerodromeQFE(aerodrome: Aerodrome): number | undefined {
  if (!aerodrome.elevation || !aerodrome.metarStation || !aerodrome.metarStation.metar.qnh) {
    return undefined;
  }
  // Standard pressure lapse rate: 1 hPa per 27 feet (approx 30ft for simplicity often used in some contexts, but 27ft is more accurate)
  // QFE = QNH - (Elevation_ft / PressureLapseRate_ft_per_hPa)
  return Math.round((aerodrome.metarStation.metar.qnh - (aerodrome.elevation / 27)) * 100) / 100;
}

/**
 * Calculates the wind vector for a specific runway.
 * 
 * @param runway The runway to calculate the wind vector for.
 * @param wind The current wind data from METAR.
 * @returns The calculated runway wind vector.
 */
export function calculateRunwayWindVector(runway: Runway, wind: Wind): RunwayWindVector {
  const windVector = calculateWindVector(wind, runway.heading);
  return {
    runway,
    windAngle: windVector.angle,
    headwind: Math.round(windVector.headwind),
    crosswind: Math.round(windVector.crosswind),
  };
}

/**
 * Calculates the wind vectors for all runways of the aerodrome.
 * 
 * @param aerodrome The aerodrome.
 * @returns The wind vectors for the runways in descending order of headwind,
 *          or undefined if METAR station data or wind data is not available.
 */
export function calculateAerodromeRunwayWinds(aerodrome: Aerodrome): RunwayWindVector[] | undefined {
  if (!aerodrome.metarStation || !aerodrome.metarStation.metar.wind) {
    return undefined;
  }
  return aerodrome.runways
    .map(runway => calculateRunwayWindVector(runway, aerodrome.metarStation!.metar.wind!))
    .sort((a, b) => b.headwind - a.headwind);
}
