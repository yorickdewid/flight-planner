import suncalc, { GetTimesResult } from 'suncalc';
import { Waypoint } from './waypoint.types.js';

/**
 * Calculates sun events for a given waypoint and date.
 * 
 * @param waypoint - The waypoint for which to calculate sun events
 * @param date - The date for which to calculate sun events
 * @returns An object containing sun event times
 */
function calculateSunEvents(waypoint: Waypoint, date: Date = new Date()): GetTimesResult {
  const longitude = waypoint.location.geometry.coordinates[0];
  const latitude = waypoint.location.geometry.coordinates[1];

  return suncalc.getTimes(date, latitude, longitude);
}

/**
 * Determines if a given time is during daylight at the specified waypoint.
 * 
 * @param waypoint - The waypoint to check for daylight
 * @param time - The time to check (defaults to current time)
 * @returns true if the specified time is during daylight (between sunrise and sunset)
 */
export function isDaylight(waypoint: Waypoint, time: Date = new Date()): boolean {
  const events = calculateSunEvents(waypoint, time);
  return time >= events.sunrise && time <= events.sunset;
}

/**
 * Determines if a given time is during night at the specified waypoint.
 * Night is defined as the period between the end of evening civil twilight and the beginning of morning civil twilight.
 * 
 * @param waypoint - The waypoint to check for night conditions
 * @param time - The time to check (defaults to current time)
 * @returns true if the specified time is during night
 */
export function isNight(waypoint: Waypoint, time: Date = new Date()): boolean {
  const events = calculateSunEvents(waypoint, time);
  return time <= events.dawn || time >= events.dusk;
}