import { Wind } from "./metar.js";
import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector } from "./utils.js";

/**
 * Interface representing the performance characteristics of an aircraft.
 * 
 * @interface AircraftPerformance
 * @property {number} headWind - The component of wind directly opposing the aircraft's motion, measured in knots.
 * @property {number} crossWind - The component of wind perpendicular to the aircraft's motion, measured in knots.
 * @property {number} trueAirSpeed - The speed of the aircraft relative to the air mass it's flying through, measured in knots.
 * @property {number} windCorrectionAngle - The angle between the aircraft's heading and its track, measured in degrees.
 * @property {number} heading - The direction the aircraft is pointed, measured in degrees from true north.
 * @property {number} groundSpeed - The actual speed of the aircraft over the ground, measured in knots.
 * @property {number} duration - The time duration for a segment of flight, typically measured in minutes.
 * @property {number} [fuelConsumption] - Optional property representing the fuel consumption rate, typically measured in gallons or liters per hour.
 */
export interface AircraftPerformance {
  headWind: number;
  crossWind: number;
  trueAirSpeed: number;
  windCorrectionAngle: number;
  heading: number;
  groundSpeed: number;
  duration: number;
  fuelConsumption?: number;
}

/**
 * Represents an aircraft with its specifications and characteristics.
 * 
 * @interface Aircraft
 * @property {string} [manufacturer] - The manufacturer of the aircraft.
 * @property {string} [model] - The model of the aircraft.
 * @property {string} [registration] - The registration identifier of the aircraft.
 * @property {number} [numberOfEngines] - The number of engines the aircraft has.
 * @property {string[]} [avionics] - Array of avionics systems (e.g., 'Garmin G1000', 'Bendix King').
 * @property {number} [cruiseSpeed] - The cruising speed of the aircraft in knots.
 * @property {number} [range] - The maximum range of the aircraft in nautical miles.
 * @property {number} [fuelCapacity] - The fuel capacity of the aircraft in liters.
 * @property {number} [fuelConsumption] - The fuel consumption rate in liters per hour.
 * @property {'piston' | 'turboprop' | 'jet'} [engineType] - The type of engine used in the aircraft.
 * @property {number} [maxTakeoffWeight] - The maximum takeoff weight of the aircraft in kilograms.
 */
export interface Aircraft {
  manufacturer?: string;
  model?: string;
  registration?: string;
  numberOfEngines?: number;
  avionics?: string[]; // array of avionics systems (e.g., 'Garmin G1000', 'Bendix King')
  cruiseSpeed?: number; // in knots
  range?: number; // in nautical miles
  fuelCapacity?: number; // in liters
  fuelConsumption?: number; // in liters per hour
  engineType?: 'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft';
  maxTakeoffWeight?: number; // in kilograms
}

/**
 * Calculates the fuel consumption for a given aircraft and flight duration.
 * 
 * @param aircraft - The aircraft for which to calculate fuel consumption
 * @param duration - The flight duration in minutes
 * @returns The fuel consumption in liters, or undefined if the aircraft has no fuel consumption data
 */
export function calculateFuelConsumption(aircraft: Aircraft, duration: number): number | undefined {
  if (duration < 0) {
    throw new Error('Duration cannot be negative');
  }

  if (!aircraft?.fuelConsumption) {
    return undefined;
  }

  return aircraft.fuelConsumption * (duration / 60);
}

/**
 * Calculates the flight performance for the given aircraft, distance, true track, and wind.
 * 
 * @param aircraft - The aircraft object.
 * @param distance - The distance in nautical miles.
 * @param trueTrack - The true track in degrees.
 * @param wind - The wind object.
 * @returns The aircraft performance object.
 */
export default function calculateFlightPerformance(
  aircraft: Aircraft,
  distance: number,
  trueTrack: number,
  wind: Wind
): AircraftPerformance | undefined {
  if (!aircraft.cruiseSpeed) {
    return undefined;
  }

  const windVector = calculateWindVector(wind, trueTrack);
  const wca = calculateWindCorrectionAngle(wind, trueTrack, aircraft.cruiseSpeed);
  // const heading = (trueTrack + wca + 360) % 360; // TODO: Correct for magnetic variation
  const heading = trueTrack + wca; // TODO: Correct for magnetic variation
  const groundSpeed = calculateGroundspeed(wind, aircraft.cruiseSpeed, heading);
  const duration = (distance / groundSpeed) * 60;
  const fuelConsumption = calculateFuelConsumption(aircraft, duration);

  return {
    headWind: windVector.headwind,
    crossWind: windVector.crosswind,
    trueAirSpeed: aircraft.cruiseSpeed, // TODO: Correct for altitude, temperature
    windCorrectionAngle: wca,
    heading: heading,
    groundSpeed: groundSpeed,
    duration: duration,
    fuelConsumption: fuelConsumption
  };
}
