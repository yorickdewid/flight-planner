/**
 * Represents an aircraft with its specifications and characteristics.
 * 
 * @interface Aircraft
 * @property {string} [registration] - The registration identifier of the aircraft.
 * @property {string} [manufacturer] - The manufacturer of the aircraft.
 * @property {string} [icaoType] - The ICAO type designator of the aircraft.
 * @property {string} [hexcode] - The hex code of the aircraft, typically used for ADS-B. 
 * @property {string} [colors] - The color scheme of the aircraft.
 * @property {number} [numberOfEngines] - The number of engines the aircraft has.
 * @property {string[]} [avionics] - Array of avionics systems (e.g., 'Garmin G1000', 'Bendix King').
 * @property {number} [cruiseSpeed] - The cruising speed of the aircraft in knots.
 * @property {number} [fuelCapacity] - The fuel capacity of the aircraft in liters.
 * @property {number} [fuelConsumption] - The fuel consumption rate in liters per hour.
 * @property {number} [fuelType] - The type of fuel used by the aircraft (e.g., 'Avgas', 'Jet A', 'Mogas').
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
export interface Aircraft {
  registration: string;
  manufacturer?: string;
  icaoType?: string;
  hexcode?: string;
  colors?: string;
  numberOfEngines?: number;
  avionics?: string[];
  cruiseSpeed?: number;
  fuelCapacity?: number;
  fuelConsumption?: number;
  fuelType?: 'Avgas' | 'Jet A' | 'Jet A1' | 'Jet B' | 'Mogas' | 'Diesel';
  engineType?: 'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft';
  maxTakeoffWeight?: number;
  rentalPrice?: number;
  emptyWeight?: number;
  serviceCeiling?: number;
  maxDemonstratedCrosswind?: number;
  takeoffDistance?: number;
  landingDistance?: number;
  wingspan?: number;
  propellerType?: 'fixed-pitch' | 'variable-pitch' | 'constant-speed';
  landingGearType?: 'fixed tricycle' | 'retractable tricycle' | 'fixed conventional' | 'retractable conventional' | 'skis' | 'floats';
}

/**
 * Checks if the given string is a valid aircraft registration.
 * 
 * @param registration - The string to check
 * @returns True if the string is a valid aircraft registration, false otherwise
 */
export const isAircraftRegistration = (registration: string): boolean => {
  return /^[A-Z0-9]{1,3}-?[A-Z0-9]+$/.test(registration.toUpperCase());
}

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
  if (aircraft.maxTakeoffWeight && aircraft.emptyWeight) {
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
  if (endurance && aircraft.cruiseSpeed) {
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
  if (aircraft.fuelCapacity && aircraft.fuelConsumption && aircraft.fuelConsumption > 0) {
    return aircraft.fuelCapacity / aircraft.fuelConsumption;
  }
  return undefined;
}
