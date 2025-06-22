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

  /**
   * An optional function to create/add an aircraft to the service.
   * 
   * @param aircraft - The Aircraft object to create.
   * @returns A promise that resolves when the aircraft is created.
   */
  create?(aircraft: Aircraft): Promise<void>;

  /**
   * An optional function to update an aircraft in the service.
   * 
   * @param aircraft - The Aircraft object to update.
   * @returns A promise that resolves when the aircraft is updated.
   */
  update?(aircraft: Aircraft): Promise<void>;

  /**
   * An optional function to delete an aircraft from the service.
   * 
   * @param registration - The registration of the aircraft to delete.
   * @returns A promise that resolves when the aircraft is deleted.
   */
  delete?(registration: string): Promise<void>;
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
  async findByRegistration(registration: string): Promise<Aircraft | undefined> {
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

  /**
   * Creates a new aircraft in the service.
   * 
   * @param aircraft - The Aircraft object to create.
   * @returns A promise that resolves when the aircraft is created.
   * @throws Error if the service does not support creating aircraft or if the registration is invalid.
   */
  async create(aircraft: Aircraft): Promise<void> {
    if (!this.options.create) {
      throw new Error('AircraftService does not support creating aircraft.');
    }

    if (!aircraft.registration || !isAircraftRegistration(aircraft.registration)) {
      throw new Error(`Invalid aircraft registration: ${aircraft.registration}`);
    }

    await this.options.create(aircraft);
  }

  /**
   * Retrieves all aircraft.
   * 
   * @returns A promise that resolves to an array of Aircraft objects.
   */
  async findAll(): Promise<Aircraft[]> {
    const registrations = await this.options.fetchByRegistration([]);
    return registrations;
  }

  /**
   * Updates an existing aircraft in the service.
   * 
   * @param aircraft - The Aircraft object to update.
   * @returns A promise that resolves when the aircraft is updated.
   * @throws Error if the service does not support updating aircraft or if the registration is invalid.
   */
  async update(aircraft: Aircraft): Promise<void> {
    if (!this.options.update) {
      throw new Error('AircraftService does not support updating aircraft.');
    }

    if (!aircraft.registration || !isAircraftRegistration(aircraft.registration)) {
      throw new Error(`Invalid aircraft registration: ${aircraft.registration}`);
    }

    await this.options.update(aircraft);
  }

  /**
   * Deletes an aircraft from the service.
   * 
   * @param registration - The registration of the aircraft to delete.
   * @returns A promise that resolves when the aircraft is deleted.
   * @throws Error if the service does not support deleting aircraft or if the registration is invalid.
   */
  async delete(registration: string): Promise<void> {
    if (!this.options.delete) {
      throw new Error('AircraftService does not support deleting aircraft.');
    }

    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    await this.options.delete(normalizedRegistration);
  }
}

export default AircraftService;