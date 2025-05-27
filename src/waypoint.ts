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
export const waypointDistance = (from: Waypoint, to: Waypoint): number => {
  return distance(from.location, to.location, { units: 'nauticalmiles' });
}

/**
 * Calculates the heading from one waypoint to another.
 * 
 * @param from The starting waypoint.
 * @param to The destination waypoint.
 * @returns The heading in degrees.
 */
export const waypointHeading = (from: Waypoint, to: Waypoint): number => {
  return bearingToAzimuth(bearing(from.location, to.location));
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
 * Calculates the QFE (atmospheric pressure at waypoint elevation) value.
 * 
 * @param waypoint The waypoint. For QFE calculation, this waypoint must have an 'elevation'
 *                 and provide a QNH value (typically via an associated 'metarStation' property
 *                 if the waypoint is an aerodrome or similar).
 * @returns The QFE value in hPa (hectopascals), rounded to 2 decimal places,
 *          or undefined if the waypoint's elevation or QNH data is not available.
 */
export const waypointQFE = (waypoint: Waypoint): number | undefined => {
  const qnh = waypoint.metarStation?.metar?.qnh;

  if (waypoint.elevation === undefined || waypoint.elevation === null || qnh === undefined || qnh === null) {
    return undefined;
  }

  // TODO: Use proper conversion for pressure lapse rate
  // Standard pressure lapse rate: 1 hPa per 27 feet
  // QFE = QNH - (Elevation_ft / PressureLapseRate_ft_per_hPa)
  return Math.round((qnh - (waypoint.elevation / 27)) * 100) / 100;
}

/**
 * Calculates the wind vector for a specific runway.
 * 
 * @param runway The runway to calculate the wind vector for.
 * @param wind The current wind data from METAR.
 * @returns The calculated runway wind vector.
 */
export const calculateRunwayWindVector = (runway: Runway, wind: Wind): RunwayWindVector => {
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
export const calculateAerodromeRunwayWinds = (aerodrome: Aerodrome): RunwayWindVector[] | undefined => {
  if (!aerodrome.metarStation || !aerodrome.metarStation.metar.wind) {
    return undefined;
  }

  return aerodrome.runways
    .map(runway => calculateRunwayWindVector(runway, aerodrome.metarStation!.metar.wind!))
    .sort((a, b) => b.headwind - a.headwind);
}
