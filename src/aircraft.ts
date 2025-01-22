import { calculateGroundspeed, calculateWindCorrectionAngle, calculateWindVector, Wind } from "./utils";

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
  engineType?: 'piston' | 'turboprop' | 'jet';
  maxTakeoffWeight?: number; // in kilograms
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
  distance: number, // nautical miles
  trueTrack: number, // degrees
  wind: Wind
): AircraftPerformance | undefined {
  if (!aircraft.cruiseSpeed) {
    return undefined;
  }

  const windVector = calculateWindVector(wind, trueTrack);
  const wca = calculateWindCorrectionAngle(wind, trueTrack, aircraft.cruiseSpeed);
  const heading = trueTrack + wca; // TODO: Correct for magnetic variation
  const groundSpeed = calculateGroundspeed(wind, aircraft.cruiseSpeed, heading);
  const duration = (distance / groundSpeed) * 60;
  const fuelConsumption = aircraft.fuelConsumption ? aircraft.fuelConsumption * (duration / 60) : undefined;

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