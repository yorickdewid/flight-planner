import suncalc from 'suncalc';
import { Waypoint } from './airport.js';

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

  for (const [key, value] of Object.entries(sunTimes)) {
    if (key in SunEventType) {
      result[key] = {
        time: value,
        event: key as SunEventType,
        location: waypoint
      };
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

/**
 * Calculates sun and moon positions for a given waypoint and time.
 * 
 * @param waypoint - The waypoint for which to calculate positions
 * @param time - The time for which to calculate positions
 * @returns An object containing sun and moon position data
 */
export function getSunAndMoonPositions(waypoint: Waypoint, time: Date = new Date()): {
  sun: { azimuth: number; altitude: number };
  moon: { azimuth: number; altitude: number; illumination: number; phase: number };
} {
  const longitude = waypoint.location.geometry.coordinates[0];
  const latitude = waypoint.location.geometry.coordinates[1];

  const sunPosition = suncalc.getPosition(time, latitude, longitude);
  const moonPosition = suncalc.getMoonPosition(time, latitude, longitude);
  const moonIllumination = suncalc.getMoonIllumination(time);

  return {
    sun: {
      azimuth: sunPosition.azimuth,
      altitude: sunPosition.altitude
    },
    moon: {
      azimuth: moonPosition.azimuth,
      altitude: moonPosition.altitude,
      illumination: moonIllumination.fraction,
      phase: moonIllumination.phase
    }
  };
}

/**
 * Determines if a flight between two waypoints involves night flying.
 * 
 * @param from - The departure waypoint
 * @param to - The destination waypoint
 * @param departureTime - The departure time
 * @param speed - The ground speed in knots
 * @returns true if any portion of the flight occurs during night time
 */
export function flightInvolvesNight(
  from: Waypoint,
  to: Waypoint,
  departureTime: Date,
  speed: number
): boolean {
  const distance = from.distanceTo(to);
  const flightTimeHours = distance / speed;
  const flightTimeMs = flightTimeHours * 60 * 60 * 1000;
  const arrivalTime = new Date(departureTime.getTime() + flightTimeMs);

  // Check departure point at departure time
  const departureNight = isNight(from, departureTime);

  // Check arrival point at arrival time
  const arrivalNight = isNight(to, arrivalTime);

  // If either departure or arrival is at night, the flight involves night time
  if (departureNight || arrivalNight) {
    return true;
  }

  // If the flight spans a long period, we should check points in between
  if (flightTimeHours > 1) {
    // Check midpoint at mid-flight time
    const midTime = new Date(departureTime.getTime() + flightTimeMs / 2);

    // Create a midpoint waypoint (very simplified - should be improved for longer routes)
    const fromLon = from.location.geometry.coordinates[0];
    const fromLat = from.location.geometry.coordinates[1];
    const toLon = to.location.geometry.coordinates[0];
    const toLat = to.location.geometry.coordinates[1];

    const midLon = (fromLon + toLon) / 2;
    const midLat = (fromLat + toLat) / 2;

    const midPoint = new Waypoint('MidPoint', {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [midLon, midLat]
      },
      properties: {}
    });

    return isNight(midPoint, midTime);
  }

  return false;
}

/**
 * Extends a RouteTrip with sun events at departure and destination.
 * 
 * @param trip - The route trip to extend
 * @param date - The date for the sun events calculation
 * @returns The extended route trip with sun events
 */
export function addSunEventsToRoute(trip: any, date: Date = new Date()): any {
  if (!trip.route || trip.route.length === 0) {
    return trip;
  }

  const departureWaypoint = trip.route[0].start;
  const destinationWaypoint = trip.route[trip.route.length - 1].end;

  const departureSunEvents = calculateSunEvents(departureWaypoint, date);
  const destinationSunEvents = calculateSunEvents(destinationWaypoint, date);

  return {
    ...trip,
    departureSunEvents,
    destinationSunEvents,
    departureIsDaylight: isDaylight(departureWaypoint, trip.departureDate),
    arrivalIsDaylight: trip.arrivalDate ? isDaylight(destinationWaypoint, trip.arrivalDate) : null,
    flightInvolvesNight: trip.departureDate && trip.arrivalDate ?
      flightInvolvesNight(departureWaypoint, destinationWaypoint, trip.departureDate, trip.route[0].performance?.groundSpeed || 100) :
      null
  };
}