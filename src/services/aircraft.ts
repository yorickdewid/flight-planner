import { Aircraft, aircraftNormalizeRegistration, isAircraftRegistration } from "../aircraft.js";

/**
 * Options for configuring the AircraftService.
 */
export interface AircraftServiceOptions {
  /**
   * A function to fetch aircraft by their registrations.
   * 
   * @param registration - An array of aircraft registrations.
   * @returns A promise that resolves to an array of Aircraft objects.
   */
  fetchByRegistration(registration: readonly string[]): Promise<Aircraft[]>;
}

/**
 * AircraftService class provides methods to manage and retrieve aircraft data.
 */
class AircraftService {

  /**
   * Creates a new instance of the AircraftService class.
   * 
   * @param options - Options for the AircraftService, including fetchByRegistration method.
   */
  constructor(private options: AircraftServiceOptions) {
    if (!options.fetchByRegistration) {
      throw new Error('AircraftService requires a fetchByRegistration method in options.');
    }
  }

  /**
   * Retrieves an aircraft by its registration.
   * 
   * @param registration - The registration of the aircraft to retrieve.
   * @returns A promise that resolves to the Aircraft object or undefined if not found.
   */
  async get(registration: string): Promise<Aircraft | undefined> {
    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    const results = await this.options.fetchByRegistration([normalizedRegistration]);
    if (results && results.length > 0) {
      return results[0];
    }
    return undefined;
  }
}

export default AircraftService;