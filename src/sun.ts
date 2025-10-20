import suncalc, { GetTimesResult } from 'suncalc';
import { Waypoint } from './waypoint.types.js';
import type { Position } from 'geojson';

/**
 * Calculates sun events for a given waypoint and date.
 *
 * @param location - The waypoint or geographic position (longitude, latitude)
 * @param date - The date for which to calculate sun events
 * @returns An object containing sun event times
 */
export const calculateSunEvents = (location: Waypoint | Position, date: Date = new Date()): GetTimesResult => {
  const coordinates = 'coords' in location ? location.coords : location;
  const longitude = coordinates[0];
  const latitude = coordinates[1];

  return suncalc.getTimes(date, latitude, longitude);
}

/**
 * Determines if a given time is during daylight at the specified location.
 *
 * @param location - The waypoint or geographic position to check for daylight
 * @param time - The time to check (defaults to current time)
 * @returns true if the specified time is during daylight (between sunrise and sunset)
 */
export const isDaylight = (location: Waypoint | Position, time: Date = new Date()): boolean => {
  const events = calculateSunEvents(location, time);
  return time >= events.sunrise && time <= events.sunset;
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
  const events = calculateSunEvents(location, time);
  return time <= events.dawn || time >= events.dusk;
}
