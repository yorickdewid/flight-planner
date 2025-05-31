import suncalc from 'suncalc';
import { Waypoint } from './waypoint.types.js';

/**
 * Enum representing different sun events.
 * 
 * @enum {string}
 * @readonly
 */
export enum SunEventType {
  Sunrise = 'sunrise',
  Sunset = 'sunset',
  Dawn = 'dawn',          // Morning civil twilight starts
  Dusk = 'dusk',          // Evening civil twilight starts
  NauticalDawn = 'nauticalDawn',
  NauticalDusk = 'nauticalDusk',
  NightEnd = 'nightEnd',  // Dark enough for astronomical observations
  Night = 'night',        // Dark enough for astronomical observations
  GoldenHourEnd = 'goldenHourEnd',
  GoldenHour = 'goldenHour',
  SolarNoon = 'solarNoon',
  NaDir = 'nadir'
}

/**
 * Interface representing a sun event.
 * 
 * @interface SunEvent
 * @property {Date} time - The time when the event occurs
 * @property {SunEventType} event - The type of sun event
 * @property {Waypoint} location - The location where the event occurs
 */
export interface SunEvent {
  time: Date;
  event: SunEventType;
  location: Waypoint;
}

/**
 * Calculates sun events for a given waypoint and date.
 * 
 * @param waypoint - The waypoint for which to calculate sun events
 * @param date - The date for which to calculate sun events
 * @returns An object containing sun event times
 */
export function calculateSunEvents(waypoint: Waypoint, date: Date = new Date()): Record<SunEventType, SunEvent> {
  const longitude = waypoint.location.geometry.coordinates[0];
  const latitude = waypoint.location.geometry.coordinates[1];

  const sunTimes = suncalc.getTimes(date, latitude, longitude);

  const result: Record<string, SunEvent> = {};
  const validSunEventTypeValues = Object.values(SunEventType);

  for (const [key, value] of Object.entries(sunTimes)) {
    if (validSunEventTypeValues.includes(key as SunEventType)) {
      if (value instanceof Date && !isNaN(value.getTime())) {
        result[key] = {
          time: value,
          event: key as SunEventType,
          location: waypoint
        };
      }
    }
  }

  return result as Record<SunEventType, SunEvent>;
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
  return time >= events.sunrise.time && time <= events.sunset.time;
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
  return time <= events.dawn.time || time >= events.dusk.time;
}