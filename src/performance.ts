import { Aircraft } from './aircraft.js';
import { ISA_STANDARD_TEMPERATURE_CELSIUS } from './index.js';

/**
 * Enum defining different flight phases used in performance calculations.
 * 
 * @enum {string}
 * @readonly
 */
export enum FlightPhase {
  Taxi = 'taxi',
  Takeoff = 'takeoff',
  Climb = 'climb',
  Cruise = 'cruise',
  Descent = 'descent',
  Approach = 'approach',
  Landing = 'landing'
}

/**
 * Interface representing performance parameters for a specific flight phase.
 * 
 * @interface PhasePerformance
 * @property {number} fuelFlow - Fuel flow rate in liters or gallons per hour
 * @property {number} speed - Speed in knots (TAS for climb/cruise/descent)
 * @property {number} duration - Typical duration of the phase in minutes
 * @property {number} rateOfClimbDescent - Rate of climb or descent in feet per minute (positive for climb, negative for descent)
 */
export interface PhasePerformance {
  fuelFlow: number;
  speed: number;
  duration: number;
  rateOfClimbDescent?: number;
}

/**
 * Interface representing detailed aircraft performance data.
 * 
 * @interface AircraftPerformanceProfile
 * @property {Record<FlightPhase, PhasePerformance>} phasePerformance - Performance data for each flight phase
 * @property {number} reserveFuel - Standard reserve fuel in liters or gallons
 * @property {number} reserveFuelTime - Standard reserve fuel time in minutes
 * @property {number} climbFuelAddition - Additional fuel percentage to add for climbs (e.g., 0.1 for 10%)
 * @property {number} contingencyFuel - Contingency fuel percentage (e.g., 0.05 for 5%)
 */
export interface AircraftPerformanceProfile {
  phasePerformance: Record<FlightPhase, PhasePerformance>;
  reserveFuel: number;
  reserveFuelTime: number;
  climbFuelAddition: number;
  contingencyFuel: number;
}

/**
 * Interface representing distance segments for various flight phases.
 * 
 * @interface DistanceSegments
 * @property {number} climbDistance - Distance covered during climb in nautical miles
 * @property {number} cruiseDistance - Distance covered during cruise in nautical miles
 * @property {number} descentDistance - Distance covered during descent in nautical miles
 * @property {number} totalDistance - Total distance in nautical miles
 */
export interface DistanceSegments {
  climbDistance: number;
  cruiseDistance: number;
  descentDistance: number;
  totalDistance: number;
}

/**
 * Interface representing time segments for various flight phases.
 * 
 * @interface TimeSegments
 * @property {number} taxiTime - Time spent taxiing in minutes
 * @property {number} takeoffTime - Time spent in takeoff phase in minutes
 * @property {number} climbTime - Time spent climbing in minutes
 * @property {number} cruiseTime - Time spent in cruise in minutes
 * @property {number} descentTime - Time spent in descent in minutes
 * @property {number} approachTime - Time spent in approach phase in minutes
 * @property {number} landingTime - Time spent in landing phase in minutes
 * @property {number} totalTime - Total flight time in minutes
 */
export interface TimeSegments {
  taxiTime: number;
  takeoffTime: number;
  climbTime: number;
  cruiseTime: number;
  descentTime: number;
  approachTime: number;
  landingTime: number;
  totalTime: number;
}

/**
 * Interface representing fuel consumption for various flight phases.
 * 
 * @interface FuelSegments
 * @property {number} taxiFuel - Fuel used during taxi in liters/gallons
 * @property {number} takeoffFuel - Fuel used during takeoff in liters/gallons
 * @property {number} climbFuel - Fuel used during climb in liters/gallons
 * @property {number} cruiseFuel - Fuel used during cruise in liters/gallons
 * @property {number} descentFuel - Fuel used during descent in liters/gallons
 * @property {number} approachFuel - Fuel used during approach in liters/gallons
 * @property {number} landingFuel - Fuel used during landing in liters/gallons
 * @property {number} contingencyFuel - Additional contingency fuel in liters/gallons
 * @property {number} reserveFuel - Reserve fuel in liters/gallons
 * @property {number} alternateFuel - Fuel to reach alternate airport in liters/gallons
 * @property {number} totalTripFuel - Total trip fuel excluding reserves in liters/gallons
 * @property {number} totalFuelRequired - Total fuel required including reserves in liters/gallons
 */
export interface FuelSegments {
  taxiFuel: number;
  takeoffFuel: number;
  climbFuel: number;
  cruiseFuel: number;
  descentFuel: number;
  approachFuel: number;
  landingFuel: number;
  contingencyFuel: number;
  reserveFuel: number;
  alternateFuel: number;
  totalTripFuel: number;
  totalFuelRequired: number;
}

/**
 * Interface representing a complete flight performance calculation result.
 * 
 * @interface FlightPerformance
 * @property {DistanceSegments} distance - Distance segments breakdown
 * @property {TimeSegments} time - Time segments breakdown
 * @property {FuelSegments} fuel - Fuel segments breakdown
 * @property {Date} departureTime - Planned departure time
 * @property {Date} arrivalTime - Estimated arrival time
 */
export interface FlightPerformance {
  distance: DistanceSegments;
  time: TimeSegments;
  fuel: FuelSegments;
  departureTime: Date;
  arrivalTime: Date;
}

/**
 * Calculates the standard rate of climb for an aircraft based on its type.
 * 
 * @param aircraft - The aircraft object containing type and performance data
 * @param pressureAltitude - Pressure altitude in feet
 * @param temperature - Temperature in Celsius
 * @returns The standard rate of climb in feet per minute
 */
export function calculateRateOfClimb(
  aircraft: Aircraft,
  pressureAltitude: number = 0,
  temperature: number = ISA_STANDARD_TEMPERATURE_CELSIUS
): number {
  if (!aircraft.engineType) {
    // Default value if engine type is unknown
    return 500;
  }

  // Base climb rates by engine type (approximate averages)
  const baseClimbRates: Record<string, number> = {
    'piston': 700,
    'turboprop': 1200,
    'turbojet': 1500,
    'turbofan': 2000,
    'electric': 600,
    'turboshaft': 1000
  };

  const baseRate = baseClimbRates[aircraft.engineType] || 700;

  // Reduce climb rate as altitude increases
  const altitudeFactor = Math.max(0.5, 1 - (pressureAltitude / 30000));

  // Adjust for temperature (higher temps = lower performance)
  const tempDiff = temperature - ISA_STANDARD_TEMPERATURE_CELSIUS;
  const tempFactor = Math.max(0.7, 1 - (tempDiff * 0.02));

  return baseRate * altitudeFactor * tempFactor;
}

/**
 * Calculates the standard rate of descent for an aircraft based on its type.
 * 
 * @param aircraft - The aircraft object containing type and performance data
 * @returns The standard rate of descent in feet per minute (returned as a negative number)
 */
export function calculateRateOfDescent(aircraft: Aircraft): number {
  if (!aircraft.engineType) {
    // Default value if engine type is unknown
    return -500;
  }

  // Base descent rates by engine type (approximate averages)
  const baseDescentRates: Record<string, number> = {
    'piston': -500,
    'turboprop': -800,
    'turbojet': -1000,
    'turbofan': -1000,
    'electric': -500,
    'turboshaft': -800
  };

  return baseDescentRates[aircraft.engineType] || -500;
}

/**
 * Creates a default performance profile for an aircraft based on its characteristics.
 * 
 * @param aircraft - The aircraft object to create a performance profile for
 * @returns A performance profile with estimated values based on aircraft type
 */
export function createDefaultPerformanceProfile(aircraft: Aircraft): AircraftPerformanceProfile {
  if (!aircraft.cruiseSpeed || !aircraft.fuelConsumption) {
    throw new Error('Aircraft must have cruiseSpeed and fuelConsumption defined');
  }

  // Create performance estimates based on aircraft type
  const cruiseSpeed = aircraft.cruiseSpeed;
  const baseFuelFlow = aircraft.fuelConsumption;

  // Estimate performance for each phase
  const phasePerformance: Record<FlightPhase, PhasePerformance> = {
    [FlightPhase.Taxi]: {
      fuelFlow: baseFuelFlow * 0.3,
      speed: 0,
      duration: 10
    },
    [FlightPhase.Takeoff]: {
      fuelFlow: baseFuelFlow * 1.2,
      speed: cruiseSpeed * 0.3,
      duration: 2
    },
    [FlightPhase.Climb]: {
      fuelFlow: baseFuelFlow * 1.1,
      speed: cruiseSpeed * 0.8,
      duration: 15,
      rateOfClimbDescent: calculateRateOfClimb(aircraft)
    },
    [FlightPhase.Cruise]: {
      fuelFlow: baseFuelFlow,
      speed: cruiseSpeed,
      duration: 60 // Will be overridden in calculations
    },
    [FlightPhase.Descent]: {
      fuelFlow: baseFuelFlow * 0.6,
      speed: cruiseSpeed * 0.9,
      duration: 15,
      rateOfClimbDescent: calculateRateOfDescent(aircraft)
    },
    [FlightPhase.Approach]: {
      fuelFlow: baseFuelFlow * 0.7,
      speed: cruiseSpeed * 0.5,
      duration: 5
    },
    [FlightPhase.Landing]: {
      fuelFlow: baseFuelFlow * 0.4,
      speed: cruiseSpeed * 0.25,
      duration: 3
    }
  };

  // Create a complete performance profile
  return {
    phasePerformance,
    reserveFuel: baseFuelFlow * 0.5, // 30 minutes worth of fuel
    reserveFuelTime: 30,
    climbFuelAddition: 0.1, // 10% extra for climb
    contingencyFuel: 0.05 // 5% contingency
  };
}

/**
 * Calculates distance covered during climb.
 * 
 * @param aircraft - The aircraft object
 * @param cruiseAltitude - Target cruise altitude in feet
 * @param profile - Performance profile for the aircraft
 * @returns Distance covered during climb in nautical miles
 */
export function calculateClimbDistance(
  aircraft: Aircraft,
  cruiseAltitude: number,
  profile: AircraftPerformanceProfile
): number {
  const climbPerf = profile.phasePerformance[FlightPhase.Climb];
  const rateOfClimb = climbPerf.rateOfClimbDescent || calculateRateOfClimb(aircraft);

  // Calculate time to climb to cruise altitude in hours
  const timeToClimbHours = cruiseAltitude / (rateOfClimb * 60);

  // Calculate distance covered during climb
  return timeToClimbHours * climbPerf.speed;
}

/**
 * Calculates distance covered during descent.
 * 
 * @param aircraft - The aircraft object
 * @param cruiseAltitude - Starting cruise altitude in feet
 * @param profile - Performance profile for the aircraft
 * @returns Distance covered during descent in nautical miles
 */
export function calculateDescentDistance(
  aircraft: Aircraft,
  cruiseAltitude: number,
  profile: AircraftPerformanceProfile
): number {
  const descentPerf = profile.phasePerformance[FlightPhase.Descent];
  const rateOfDescent = descentPerf.rateOfClimbDescent || calculateRateOfDescent(aircraft);

  // Convert rate of descent to positive value for calculation
  const absRateOfDescent = Math.abs(rateOfDescent);

  // Calculate time to descend from cruise altitude in hours
  const toDescentHours = cruiseAltitude / (absRateOfDescent * 60);

  // Calculate distance covered during descent
  return toDescentHours * descentPerf.speed;
}

/**
 * Calculates detailed performance for a route segment.
 * 
 * @param distance - Total distance in nautical miles
 * @param aircraft - The aircraft being used
 * @param cruiseAltitude - Cruise altitude in feet
 * @param options - Optional calculation parameters
 * @returns Detailed flight performance data
 */
export function calculateDetailedPerformance(
  distance: number,
  aircraft: Aircraft,
  cruiseAltitude: number = 3000,
  options: {
    departureTime?: Date;
    headwind?: number;
    temperature?: number;
    pressureAltitude?: number;
    alternateDistance?: number;
    performanceProfile?: AircraftPerformanceProfile;
  } = {}
): FlightPerformance {
  // Use provided performance profile or create a default one
  const profile = options.performanceProfile || createDefaultPerformanceProfile(aircraft);

  // Extract options with defaults
  const departureTime = options.departureTime || new Date();
  const headwind = options.headwind || 0;
  // const temperature = options.temperature || StandardTemperature;
  // const pressureAltitude = options.pressureAltitude || cruiseAltitude;
  const alternateDistance = options.alternateDistance || 0;

  // Calculate distance segments
  const climbDistance = calculateClimbDistance(aircraft, cruiseAltitude, profile);
  const descentDistance = calculateDescentDistance(aircraft, cruiseAltitude, profile);
  const cruiseDistance = Math.max(0, distance - climbDistance - descentDistance);

  // Calculate time segments (accounting for headwind)
  const windFactor = aircraft.cruiseSpeed ? (aircraft.cruiseSpeed - headwind) / aircraft.cruiseSpeed : 1;

  const taxiTime = profile.phasePerformance[FlightPhase.Taxi].duration;
  const takeoffTime = profile.phasePerformance[FlightPhase.Takeoff].duration;

  const climbSpeed = profile.phasePerformance[FlightPhase.Climb].speed * windFactor;
  const climbTime = (climbDistance / climbSpeed) * 60;

  const cruiseSpeed = profile.phasePerformance[FlightPhase.Cruise].speed * windFactor;
  const cruiseTime = (cruiseDistance / cruiseSpeed) * 60;

  const descentSpeed = profile.phasePerformance[FlightPhase.Descent].speed * windFactor;
  const descentTime = (descentDistance / descentSpeed) * 60;

  const approachTime = profile.phasePerformance[FlightPhase.Approach].duration;
  const landingTime = profile.phasePerformance[FlightPhase.Landing].duration;

  const totalFlightTime = climbTime + cruiseTime + descentTime + approachTime + landingTime;
  const totalTime = taxiTime + takeoffTime + totalFlightTime;

  // Calculate fuel segments
  const taxiFuel = (taxiTime / 60) * profile.phasePerformance[FlightPhase.Taxi].fuelFlow;
  const takeoffFuel = (takeoffTime / 60) * profile.phasePerformance[FlightPhase.Takeoff].fuelFlow;
  const climbFuel = (climbTime / 60) * profile.phasePerformance[FlightPhase.Climb].fuelFlow * (1 + profile.climbFuelAddition);
  const cruiseFuel = (cruiseTime / 60) * profile.phasePerformance[FlightPhase.Cruise].fuelFlow;
  const descentFuel = (descentTime / 60) * profile.phasePerformance[FlightPhase.Descent].fuelFlow;
  const approachFuel = (approachTime / 60) * profile.phasePerformance[FlightPhase.Approach].fuelFlow;
  const landingFuel = (landingTime / 60) * profile.phasePerformance[FlightPhase.Landing].fuelFlow;

  const tripFuel = taxiFuel + takeoffFuel + climbFuel + cruiseFuel + descentFuel + approachFuel + landingFuel;
  const contingencyFuel = tripFuel * profile.contingencyFuel;

  // Calculate alternate and reserve fuel
  const alternateFuel = alternateDistance > 0 && aircraft.fuelConsumption ?
    (alternateDistance / cruiseSpeed) * aircraft.fuelConsumption : 0;

  const reserveFuel = profile.reserveFuel;
  const totalFuelRequired = tripFuel + contingencyFuel + alternateFuel + reserveFuel;

  // Calculate arrival time
  const arrivalTime = new Date(departureTime.getTime() + totalTime * 60 * 1000);

  return {
    distance: {
      climbDistance,
      cruiseDistance,
      descentDistance,
      totalDistance: distance
    },
    time: {
      taxiTime,
      takeoffTime,
      climbTime,
      cruiseTime,
      descentTime,
      approachTime,
      landingTime,
      totalTime
    },
    fuel: {
      taxiFuel,
      takeoffFuel,
      climbFuel,
      cruiseFuel,
      descentFuel,
      approachFuel,
      landingFuel,
      contingencyFuel,
      reserveFuel,
      alternateFuel,
      totalTripFuel: tripFuel + contingencyFuel,
      totalFuelRequired
    },
    departureTime,
    arrivalTime
  };
}