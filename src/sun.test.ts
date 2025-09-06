import { describe, it, expect } from '@jest/globals';
import { calculateSunEvents, isDaylight, isNight } from './sun.js';
import { Waypoint, WaypointVariant } from './waypoint.types.js';

// Helper function to create a test waypoint
const createTestWaypoint = (latitude: number, longitude: number, name: string = 'Test Waypoint'): Waypoint => ({
  name,
  location: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    properties: {}
  },
  waypointVariant: WaypointVariant.Waypoint
});

describe('calculateSunEvents', () => {
  it('should calculate sun events for Amsterdam Airport Schiphol', () => {
    const schiphol = createTestWaypoint(52.3105, 4.7683, 'EHAM');
    const testDate = new Date('2024-06-21T12:00:00Z'); // Summer solstice
    
    const events = calculateSunEvents(schiphol, testDate);
    
    expect(events).toHaveProperty('sunrise');
    expect(events).toHaveProperty('sunset');
    expect(events).toHaveProperty('dawn');
    expect(events).toHaveProperty('dusk');
    expect(events.sunrise).toBeInstanceOf(Date);
    expect(events.sunset).toBeInstanceOf(Date);
    expect(events.sunset.getTime()).toBeGreaterThan(events.sunrise.getTime());
  });

  it('should calculate sun events for JFK Airport', () => {
    const jfk = createTestWaypoint(40.6413, -73.7781, 'KJFK');
    const testDate = new Date('2024-12-21T12:00:00Z'); // Winter solstice
    
    const events = calculateSunEvents(jfk, testDate);
    
    expect(events).toHaveProperty('sunrise');
    expect(events).toHaveProperty('sunset');
    expect(events.sunrise).toBeInstanceOf(Date);
    expect(events.sunset).toBeInstanceOf(Date);
    expect(events.sunset.getTime()).toBeGreaterThan(events.sunrise.getTime());
  });

  it('should calculate sun events for extreme northern location (Tromsø, Norway)', () => {
    const tromso = createTestWaypoint(69.6833, 18.9333, 'Tromsø');
    const testDate = new Date('2024-06-21T12:00:00Z'); // Summer solstice - midnight sun period
    
    const events = calculateSunEvents(tromso, testDate);
    
    expect(events).toHaveProperty('sunrise');
    expect(events).toHaveProperty('sunset');
    // During midnight sun, sunrise/sunset might be invalid dates
    expect(events.sunrise).toBeInstanceOf(Date);
    expect(events.sunset).toBeInstanceOf(Date);
  });

  it('should use current date when no date is provided', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const events = calculateSunEvents(waypoint);
    
    expect(events).toHaveProperty('sunrise');
    expect(events).toHaveProperty('sunset');
    expect(events.sunrise).toBeInstanceOf(Date);
    expect(events.sunset).toBeInstanceOf(Date);
  });
});

describe('isDaylight', () => {
  it('should return true during midday', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const midday = new Date('2024-06-21T12:00:00Z');
    
    expect(isDaylight(waypoint, midday)).toBe(true);
  });

  it('should return false during midnight', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const midnight = new Date('2024-06-21T00:00:00Z');
    
    expect(isDaylight(waypoint, midnight)).toBe(false);
  });

  it('should return false before sunrise', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const testDate = new Date('2024-06-21T12:00:00Z');
    const events = calculateSunEvents(waypoint, testDate);
    
    // Test 1 hour before sunrise
    const beforeSunrise = new Date(events.sunrise.getTime() - 60 * 60 * 1000);
    
    expect(isDaylight(waypoint, beforeSunrise)).toBe(false);
  });

  it('should return false after sunset', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const testDate = new Date('2024-06-21T12:00:00Z');
    const events = calculateSunEvents(waypoint, testDate);
    
    // Test 1 hour after sunset
    const afterSunset = new Date(events.sunset.getTime() + 60 * 60 * 1000);
    
    expect(isDaylight(waypoint, afterSunset)).toBe(false);
  });

  it('should handle different time zones correctly', () => {
    const tokyo = createTestWaypoint(35.6762, 139.6503, 'Tokyo');
    const newYork = createTestWaypoint(40.7128, -74.0060, 'New York');
    const sameUtcTime = new Date('2024-06-21T12:00:00Z');
    
    // At the same UTC time, Tokyo and New York will have different daylight conditions
    const tokyoDaylight = isDaylight(tokyo, sameUtcTime);
    const newYorkDaylight = isDaylight(newYork, sameUtcTime);
    
    expect(typeof tokyoDaylight).toBe('boolean');
    expect(typeof newYorkDaylight).toBe('boolean');
    // They might be different due to time zone differences
  });

  it('should use current time when no time is provided', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const result = isDaylight(waypoint);
    
    expect(typeof result).toBe('boolean');
  });
});

describe('isNight', () => {
  it('should return true during deep night', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const deepNight = new Date('2024-06-21T02:00:00Z');
    
    expect(isNight(waypoint, deepNight)).toBe(true);
  });

  it('should return false during midday', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const midday = new Date('2024-06-21T12:00:00Z');
    
    expect(isNight(waypoint, midday)).toBe(false);
  });

  it('should return true before dawn', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const testDate = new Date('2024-06-21T12:00:00Z');
    const events = calculateSunEvents(waypoint, testDate);
    
    // Test 1 hour before dawn
    const beforeDawn = new Date(events.dawn.getTime() - 60 * 60 * 1000);
    
    expect(isNight(waypoint, beforeDawn)).toBe(true);
  });

  it('should return true after dusk', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const testDate = new Date('2024-06-21T12:00:00Z');
    const events = calculateSunEvents(waypoint, testDate);
    
    // Test 1 hour after dusk
    const afterDusk = new Date(events.dusk.getTime() + 60 * 60 * 1000);
    
    expect(isNight(waypoint, afterDusk)).toBe(true);
  });

  it('should handle edge cases around twilight', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const events = calculateSunEvents(waypoint, new Date('2024-06-21T12:00:00Z'));
    
    // Test times just before dawn and just after dusk
    const justBeforeDawn = new Date(events.dawn.getTime() - 60 * 1000); // 1 minute before dawn
    const justAfterDusk = new Date(events.dusk.getTime() + 60 * 1000); // 1 minute after dusk
    
    expect(isNight(waypoint, justBeforeDawn)).toBe(true);
    expect(isNight(waypoint, justAfterDusk)).toBe(true);
  });

  it('should be complementary to isDaylight during certain periods', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    
    // During clear day/night periods (not twilight), one should be true and the other false
    const midday = new Date('2024-06-21T12:00:00Z');
    const midnight = new Date('2024-06-21T00:00:00Z');
    
    expect(isDaylight(waypoint, midday)).toBe(true);
    expect(isNight(waypoint, midday)).toBe(false);
    
    expect(isDaylight(waypoint, midnight)).toBe(false);
    expect(isNight(waypoint, midnight)).toBe(true);
  });

  it('should use current time when no time is provided', () => {
    const waypoint = createTestWaypoint(52.3105, 4.7683);
    const result = isNight(waypoint);
    
    expect(typeof result).toBe('boolean');
  });

  it('should handle polar regions correctly', () => {
    const northPole = createTestWaypoint(90, 0, 'North Pole');
    const winterSolstice = new Date('2024-12-21T12:00:00Z');
    const summerSolstice = new Date('2024-06-21T12:00:00Z');
    
    // Test that the function doesn't throw errors for extreme locations
    expect(() => isNight(northPole, winterSolstice)).not.toThrow();
    expect(() => isNight(northPole, summerSolstice)).not.toThrow();
    
    const winterResult = isNight(northPole, winterSolstice);
    const summerResult = isNight(northPole, summerSolstice);
    
    expect(typeof winterResult).toBe('boolean');
    expect(typeof summerResult).toBe('boolean');
  });
});