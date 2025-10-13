import { z } from 'zod';

/**
 * Checks if the given string is a valid aircraft registration.
 *
 * @param registration - The string to check
 * @returns True if the string is a valid aircraft registration, false otherwise
 */
export const isAircraftRegistration = (registration: string): boolean => {
  return /^(N[1-9][0-9A-HJ-NP-Z]{0,4}|[A-Z]{1,2}-?[A-Z0-9]{1,4})$/.test(registration.toUpperCase());
}

/**
 * Zod schema for validating Aircraft objects.
 * This is the single source of truth for aircraft data structure.
 * Uses the isAircraftRegistration function to validate the registration field.
 */
export const AircraftSchema = z.object({
  registration: z.string().refine(isAircraftRegistration, {
    message: "Invalid aircraft registration format"
  }),
  manufacturer: z.string().optional(),
  icaoType: z.string().optional(),
  hexcode: z.string().optional(),
  colors: z.string().optional(),
  numberOfEngines: z.number().optional(),
  avionics: z.array(z.string()).optional(),
  cruiseSpeed: z.number().optional(),
  fuelCapacity: z.number().optional(),
  fuelConsumption: z.number().optional(),
  fuelType: z.enum(['Avgas', 'Jet A', 'Jet A1', 'Jet B', 'Mogas', 'Diesel']).optional(),
  engineType: z.enum(['piston', 'turboprop', 'turbojet', 'turbofan', 'electric', 'turboshaft']).optional(),
  maxTakeoffWeight: z.number().optional(),
  rentalPrice: z.number().optional(),
  emptyWeight: z.number().optional(),
  serviceCeiling: z.number().optional(),
  maxDemonstratedCrosswind: z.number().optional(),
  takeoffDistance: z.number().optional(),
  landingDistance: z.number().optional(),
  wingspan: z.number().optional(),
  propellerType: z.enum(['fixed-pitch', 'variable-pitch', 'constant-speed']).optional(),
  landingGearType: z.enum(['fixed tricycle', 'retractable tricycle', 'fixed conventional', 'retractable conventional', 'skis', 'floats']).optional(),
});

/**
 * Represents an aircraft with its specifications and characteristics.
 * This type is inferred from the AircraftSchema to ensure type and validation stay in sync.
 *
 * @property {string} registration - The registration identifier of the aircraft.
 * @property {string} [manufacturer] - The manufacturer of the aircraft.
 * @property {string} [icaoType] - The ICAO type designator of the aircraft.
 * @property {string} [hexcode] - The hex code of the aircraft, typically used for ADS-B.
 * @property {string} [colors] - The color scheme of the aircraft.
 * @property {number} [numberOfEngines] - The number of engines the aircraft has.
 * @property {string[]} [avionics] - Array of avionics systems (e.g., 'Garmin G1000', 'Bendix King').
 * @property {number} [cruiseSpeed] - The cruising speed of the aircraft in knots.
 * @property {number} [fuelCapacity] - The fuel capacity of the aircraft in liters.
 * @property {number} [fuelConsumption] - The fuel consumption rate in liters per hour.
 * @property {'Avgas' | 'Jet A' | 'Jet A1' | 'Jet B' | 'Mogas' | 'Diesel'} [fuelType] - The type of fuel used by the aircraft.
 * @property {'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft'} [engineType] - The type of engine used in the aircraft.
 * @property {number} [maxTakeoffWeight] - The maximum takeoff weight of the aircraft in kilograms.
 * @property {number} [rentalPrice] - The rental price of the aircraft per hour in the local currency.
 * @property {number} [emptyWeight] - The weight of the aircraft without crew, passengers, or cargo in kilograms.
 * @property {number} [serviceCeiling] - The maximum altitude at which the aircraft can operate in feet.
 * @property {number} [maxDemonstratedCrosswind] - The maximum crosswind component the aircraft can handle in knots.
 * @property {number} [takeoffDistance] - The distance required for the aircraft to take off in meters.
 * @property {number} [landingDistance] - The distance required for the aircraft to land in meters.
 * @property {number} [wingspan] - The length of the aircraft's wings from tip to tip in meters.
 * @property {'fixed-pitch' | 'variable-pitch' | 'constant-speed'} [propellerType] - The type of propeller, if applicable.
 * @property {'fixed tricycle' | 'retractable tricycle' | 'fixed conventional' | 'retractable conventional' | 'skis' | 'floats'} [landingGearType] - The type of landing gear.
 */
export type Aircraft = z.infer<typeof AircraftSchema>;

/**
 * Normalizes the given aircraft registration to uppercase.
 *
 * @param registration - The aircraft registration to normalize
 * @returns The normalized aircraft registration
 */
export const aircraftNormalizeRegistration = (registration: string): string => {
  return registration.toUpperCase().replace(/-/g, '');
}

/**
 * Calculates the maximum payload of the aircraft based on its maximum takeoff weight and empty weight.
 *
 * @param aircraft - The aircraft object
 * @returns The maximum payload in kilograms, or undefined if the weights are not provided
 */
export const aircraftMaxPayload = (aircraft: Aircraft): number | undefined => {
  if (aircraft.maxTakeoffWeight !== undefined && aircraft.emptyWeight !== undefined) {
    return aircraft.maxTakeoffWeight - aircraft.emptyWeight;
  }
  return undefined;
}

/**
 * Calculates the range of the aircraft based on its fuel capacity, fuel consumption, and cruise speed.
 *
 * @param aircraft - The aircraft object
 * @returns The range in nautical miles, or undefined if the required properties are not provided
 */
export const aircraftRange = (aircraft: Aircraft): number | undefined => {
  const endurance = aircraftEndurance(aircraft);
  if (endurance !== undefined && aircraft.cruiseSpeed !== undefined) {
    return endurance * aircraft.cruiseSpeed;
  }
  return undefined;
}

/**
 * Calculates the endurance of the aircraft based on its fuel capacity and fuel consumption.
 *
 * @param aircraft - The aircraft object
 * @returns The endurance in hours, or undefined if the required properties are not provided or fuelConsumption is zero
 */
export const aircraftEndurance = (aircraft: Aircraft): number | undefined => {
  if (aircraft.fuelCapacity !== undefined && aircraft.fuelConsumption !== undefined && aircraft.fuelConsumption > 0) {
    return aircraft.fuelCapacity / aircraft.fuelConsumption;
  }
  return undefined;
}
