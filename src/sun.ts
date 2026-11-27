import { getTimes, type SunTimes } from 'suncalc';
import { Waypoint } from './waypoint.types.js';
import type { Position } from 'geojson';

/**
 * Calculates sun events for a given waypoint and date.
 *
 * @param location - The waypoint or geographic position (longitude, latitude)
 * @param date - The date for which to calculate sun events
 * @returns An object containing sun event times (an event that does not happen at this latitude on this day is `null`)
 */
export const calculateSunEvents = (location: Waypoint | Position, date: Date = new Date()): SunTimes => {
  const coordinates = 'coords' in location ? location.coords : location;
  const longitude = coordinates[0];
  const latitude = coordinates[1];

  return getTimes(date, latitude, longitude);
}

/**
 * Determines if a given time is during daylight at the specified location.
 *
 * @param location - The waypoint or geographic position to check for daylight
 * @param time - The time to check (defaults to current time)
 * @returns true if the specified time is during daylight (between sunrise and sunset)
 */
export const isDaylight = (location: Waypoint | Position, time: Date = new Date()): boolean => {
  const { sunrise, sunset, alwaysUp, alwaysDown } = calculateSunEvents(location, time);

  // Polar day or night: there is no sunrise or sunset (null) and suncalc sets a flag instead
  if (alwaysUp) return true;
  if (alwaysDown) return false;

  return sunrise !== null && sunset !== null && time >= sunrise && time <= sunset;
}

/**
 * Determines if a given time is during night at the specified location.
 * Night is defined as the period between the end of evening civil twilight and the beginning of morning civil twilight.
 *
 * @param location - The waypoint or geographic position to check for night conditions
 * @param time - The time to check (defaults to current time)
 * @returns true if the specified time is during night
 */
export const isNight = (location: Waypoint | Position, time: Date = new Date()): boolean => {
  const { dawn, dusk } = calculateSunEvents(location, time);

  // dawn or dusk is null when civil twilight never ends (or the sun never gets that high): not night
  return (dawn !== null && time <= dawn) || (dusk !== null && time >= dusk);
}
