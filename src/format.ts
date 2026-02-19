import { DefaultUnits } from "./constants.js";
import { Cloud, Wind } from "./metar.types.js";
import {
  convertAltitude,
  convertDistance,
  convertElevation,
  convertMass,
  convertPressure,
  convertSpeed,
  convertTemperature,
  convertVolume,
  UnitOptions
} from "./units.js";

/**
 * Formats speed to a string with the specified or default units.
 *
 * @param {number} speed - The speed value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted speed string.
 */
export const formatSpeed = (speed: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertSpeed(speed, units))} kt`;
}

/**
 * Formats distance to a string with the specified or default units.
 *
 * @param {number} distance - The distance value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted distance string.
 */
export const formatDistance = (distance: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertDistance(distance, units))} nm`;
}

/**
 * Formats altitude to a string with the specified or default units.
 * @param {number} altitude - The altitude value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted altitude string.
 */
export const formatAltitude = (altitude: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertAltitude(altitude, units))} ft`;
}

/**
 * Formats elevation to a string with the specified or default units.
 *
 * @param {number} elevation - The elevation value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted elevation string.
 */
export const formatElevation = (elevation: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertElevation(elevation, units))} ft`;
}

/**
 * Formats temperature to a string with the specified or default units.
 *
 * @param {number} temperature - The temperature value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted temperature string.
 */
export const formatTemperature = (temperature: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertTemperature(temperature, units))}°C`;
}

/**
 * Formats pressure to a string with the specified or default units.
 *
 * @param {number} pressure - The pressure value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted pressure string.
 */
export const formatPressure = (pressure: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertPressure(pressure, units)} hPa`;
}

/**
 * Formats mass to a string with the specified or default units.
 *
 * @param {number} mass - The mass value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted mass string.
 */
export const formatMass = (mass: number, units: UnitOptions = DefaultUnits): string => {
  return `${convertMass(mass, units)} kg`;
}

/**
 * Formats volume to a string with the specified or default units.
 *
 * @param {number} volume - The volume value.
 * @param {UnitOptions} [units=DefaultUnits] - The target unit options.
 * @returns {string} The formatted volume string.
 */
export const formatVolume = (volume: number, units: UnitOptions = DefaultUnits): string => {
  return `${Math.round(convertVolume(volume, units))} L`;
}

/**
 * Formats angle to a string with the specified or default units.
 *
 * @param {number} angle - The angle value.
 * @param {boolean} [magnetic=false] - Whether the angle is magnetic.
 * @returns {string} The formatted angle string.
 */
export const formatAngle = (angle: number, magnetic: boolean = false): string => {
  const roundedAngle = Math.round(angle).toString().padStart(3, '0');
  return magnetic ? `${roundedAngle}°M` : `${roundedAngle}°`;
}

/**
 * Formats date and time to a string in UTC format.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string in UTC format.
 */
export const formatUTCTimestamp = (date: Date): string => {
  return date.toUTCString().replace(/ GMT$/, ' UTC');
}

/**
 * Formats the time duration in a human-readable format.
 *
 * @param totalMinutes - The total duration in minutes.
 * @returns A string representing the formatted duration, e.g., "1h 30min" or "45 min".
 */
export const formatDuration = (totalMinutes: number): string => {
  const roundedMinutes = Math.round(totalMinutes);

  if (roundedMinutes === 0) {
    return "0 min";
  }

  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}min`;
  } else {
    return `${roundedMinutes} min`;
  }
}

/**
 * Formats the time elapsed since a given start date to a human-readable format.
 *
 * @param start - The start date.
 * @param end - The end date (default: current date).
 * @returns A string representing the elapsed time, e.g., "1h 30min ago" or "45 min ago".
 */
export const formatElapsedTime = (start: Date, end: Date = new Date()): string => {
  const elapsed = Math.abs(end.getTime() - start.getTime());
  const totalMinutes = Math.floor(elapsed / (1000 * 60));
  return formatDuration(totalMinutes) + ` ago`;
}

export function formatWind(wind: Wind, units: UnitOptions = DefaultUnits): string {
  if (wind.speed === 0) {
    return 'Calm';
  }

  if (wind.direction !== undefined) {
    let windString = `${formatAngle(wind.direction)} with ${formatSpeed(wind.speed, units)}`;
    if (wind.gust) {
      windString += ` gusting ${formatSpeed(wind.gust, units)}`;
    }

    if (wind.directionMin && wind.directionMax) {
      windString += ` variable between ${formatAngle(wind.directionMin)} and ${formatAngle(wind.directionMax)}`;
    }
    return windString;
  }

  let windString = `Variable at ${formatSpeed(wind.speed, units)}`;
  if (wind.gust) {
    windString += ` gusting ${formatSpeed(wind.gust, units)}`;
  }
  return windString;
}

export function formatVisibility(visibility: number): string {
  if (visibility >= 9999) {
    return '10 km+';
  }

  if (visibility < 1000) {
    return `${visibility} m`;
  }
  return `${(visibility / 1000).toFixed(1)} km`;
}

export function formatCloud(cloud: Cloud, units: UnitOptions = DefaultUnits): string {
  const cloudQuantityMap: Record<string, string> = {
    'SKC': 'Clear',
    'FEW': 'Few',
    'BKN': 'Broken',
    'SCT': 'Scattered',
    'OVC': 'Overcast',
    'NSC': 'No Significant Clouds',
  };

  if (cloud.height) {
    return `${cloudQuantityMap[cloud.quantity]} at ${formatAltitude(cloud.height, units)}`;
  }
  return cloudQuantityMap[cloud.quantity];
}

/**
 * Formats frequency to a string in MHz.
 *
 * @param {number} frequency - The frequency value in MHz.
 * @returns {string} The formatted frequency string.
 */
export const formatFrequency = (frequency: number): string => {
  const formattedFrequency = frequency.toFixed(3);
  return `${formattedFrequency} MHz`;
}
