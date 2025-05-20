/**
 * Represents an aircraft with its specifications and characteristics.
 * 
 * @interface Aircraft
 * @property {string} [manufacturer] - The manufacturer of the aircraft.
 * @property {string} [icaoType] - The ICAO type designator of the aircraft.
 * @property {string} [registration] - The registration identifier of the aircraft.
 * @property {string} [hexcode] - The hex code of the aircraft, typically used for ADS-B. 
 * @property {string} [colors] - The color scheme of the aircraft.
 * @property {number} [numberOfEngines] - The number of engines the aircraft has.
 * @property {string[]} [avionics] - Array of avionics systems (e.g., 'Garmin G1000', 'Bendix King').
 * @property {number} [cruiseSpeed] - The cruising speed of the aircraft in knots.
 * @property {number} [range] - The maximum range of the aircraft in nautical miles.
 * @property {number} [fuelCapacity] - The fuel capacity of the aircraft in liters.
 * @property {number} [fuelConsumption] - The fuel consumption rate in liters per hour.
 * @property {number} [fuelType] - The type of fuel used by the aircraft (e.g., 'Avgas', 'Jet A', 'Mogas').
 * @property {'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft'} [engineType] - The type of engine used in the aircraft.
 * @property {number} [maxTakeoffWeight] - The maximum takeoff weight of the aircraft in kilograms.
 * @property {number} [rentalPrice] - The rental price of the aircraft per hour in the local currency.
 * @property {number} [emptyWeight] - The weight of the aircraft without crew, passengers, or cargo in kilograms.
 * @property {number} [maxPayload] - The maximum weight of passengers and cargo the aircraft can carry in kilograms.
 * @property {number} [serviceCeiling] - The maximum altitude at which the aircraft can operate in feet.
 * @property {number} [takeoffDistance] - The distance required for the aircraft to take off in meters.
 * @property {number} [landingDistance] - The distance required for the aircraft to land in meters.
 * @property {number} [wingspan] - The length of the aircraft's wings from tip to tip in meters.
 * @property {'fixed-pitch' | 'variable-pitch' | 'constant-speed'} [propellerType] - The type of propeller, if applicable.
 * @property {'fixed tricycle' | 'retractable tricycle' | 'fixed conventional' | 'retractable conventional' | 'skis' | 'floats'} [landingGearType] - The type of landing gear.
 */
export interface Aircraft {
  manufacturer?: string;
  icaoType?: string;
  registration?: string;
  hexcode?: string;
  colors?: string;
  numberOfEngines?: number;
  avionics?: string[];
  cruiseSpeed?: number;
  range?: number;
  fuelCapacity?: number;
  fuelConsumption?: number;
  fuelType?: 'Avgas' | 'Jet A' | 'Jet A1' | 'Jet B' | 'Mogas' | 'Diesel';
  engineType?: 'piston' | 'turboprop' | 'turbojet' | 'turbofan' | 'electric' | 'turboshaft';
  maxTakeoffWeight?: number;
  rentalPrice?: number;
  emptyWeight?: number;
  maxPayload?: number;
  serviceCeiling?: number;
  takeoffDistance?: number;
  landingDistance?: number;
  wingspan?: number;
  propellerType?: 'fixed-pitch' | 'variable-pitch' | 'constant-speed';
  landingGearType?: 'fixed tricycle' | 'retractable tricycle' | 'fixed conventional' | 'retractable conventional' | 'skis' | 'floats';
}
