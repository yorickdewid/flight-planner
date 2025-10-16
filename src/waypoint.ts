import { calculateWindVector } from './utils.js';
import { Wind } from './metar.types.js';
import { bearing, bearingToAzimuth, distance } from "@turf/turf";
import { FrequencyType, Runway, RunwayWindVector, Waypoint, WaypointVariant } from './waypoint.types.js';

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
 * Type guard function that checks if a waypoint matches a specific variant type.
 *
 * This function performs a runtime check on the waypoint's variant and provides TypeScript
 * type narrowing, allowing you to safely access variant-specific properties within the type-guarded block.
 *
 * @template T - The specific waypoint type that extends the base waypoint variant structure.
 *               Must have a waypointVariant property.
 * @param waypoint - The waypoint to check.
 * @param variant - The WaypointVariant to check against (e.g., WaypointVariant.Aerodrome, WaypointVariant.Navaid).
 * @returns A type predicate indicating whether the waypoint matches the specified variant.
 *          Returns true if the waypoint's variant matches the provided variant type.
 *
 * @example
 * ```typescript
 * const waypoint: Waypoint = getWaypoint();
 *
 * if (isWaypointType(waypoint, WaypointVariant.Aerodrome)) {
 *   // TypeScript now knows waypoint has aerodrome-specific properties
 *   console.log(waypoint.runways);
 *   console.log(waypoint.frequencies);
 * }
 * ```
 */
export function isWaypointType<T extends { waypointVariant: WaypointVariant }>(
  waypoint: Waypoint,
  variant: WaypointVariant
): waypoint is Waypoint & T {
  return waypoint.waypointVariant === variant;
}

/**
 * Creates a Waypoint object from a longitude and latitude.
 *
 * @param location - The location as a [longitude, latitude] tuple.
 * @param name - Optional name for the waypoint.
 * @returns A Waypoint object.
 */
export const createWaypoint = (location: [number, number], name: string = 'locationPoint'): Waypoint => {
  return {
    name,
    location: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: location
      },
      properties: {}
    },
    waypointVariant: WaypointVariant.Waypoint,
  };
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
 * Evaluates all runways based on wind conditions.
 *
 * Returns all runways with wind vector information and a 'favored' field indicating which runway has the maximum headwind component.
 * The array is sorted with the favored runway as the first item.
 *
 * @param runways Array of available runways to evaluate.
 * @param wind Current wind data from METAR.
 * @returns Array of runways with wind angle, headwind, crosswind, and favored fields, sorted with the favored runway first. Returns empty array if no runways are available.
 */
export const evaluateRunways = (runways: Runway[], wind: Wind): Array<RunwayWindVector & { favored: boolean }> => {
  if (runways.length === 0) {
    return [];
  }

  const runwaysWithWindData = runways.map(runway => {
    const windVector = calculateWindVector(wind, runway.heading);
    return {
      runway,
      windAngle: windVector.angle,
      headwind: windVector.headwind,
      crosswind: windVector.crosswind
    };
  });

  const maxHeadwind = Math.max(...runwaysWithWindData.map(r => r.headwind));

  const result = runwaysWithWindData.map(({ runway, windAngle, headwind, crosswind }) => ({
    runway,
    windAngle,
    headwind: Math.round(headwind),
    crosswind: Math.round(crosswind),
    favored: headwind === maxHeadwind
  }));

  result.sort((a, b) => (b.favored ? 1 : 0) - (a.favored ? 1 : 0));

  return result;
}
