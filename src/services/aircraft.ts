import { Aircraft, aircraftNormalizeRegistration, isAircraftRegistration } from "../aircraft.js";
import { AircraftRepository } from "../repositories/aircraft.repository.js";

/**
 * AircraftService class provides methods to manage and retrieve aircraft data.
 * Acts as a service layer that handles business logic and validation.
 */
class AircraftService {
  /**
   * Creates a new instance of the AircraftService class.
   * 
   * @param repository - The aircraft repository for data operations.
   */
  constructor(private repository: AircraftRepository) {
    if (!repository) {
      throw new Error('AircraftService requires a repository instance.');
    }
  }

  /**
   * Retrieves an aircraft by its registration.
   * 
   * @param registration - The registration of the aircraft to retrieve.
   * @returns A promise that resolves to the Aircraft object.
   * @throws Error if the registration is invalid or aircraft is not found.
   */
  async findByRegistration(registration: string): Promise<Aircraft> {
    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    const aircraft = await this.repository.findByRegistration(normalizedRegistration);

    if (!aircraft) {
      throw new Error(`Aircraft with registration ${registration} not found.`);
    }

    return aircraft;
  }

  /**
   * Creates a new aircraft in the service.
   * 
   * @param aircraft - The Aircraft object to create.
   * @returns A promise that resolves to the created Aircraft object.
   * @throws Error if the registration is invalid.
   */
  async create(aircraft: Aircraft): Promise<Aircraft> {
    if (!aircraft.registration || !isAircraftRegistration(aircraft.registration)) {
      throw new Error(`Invalid aircraft registration: ${aircraft.registration}`);
    }

    const normalizedAircraft = {
      ...aircraft,
      registration: aircraftNormalizeRegistration(aircraft.registration)
    };

    return await this.repository.create(normalizedAircraft);
  }

  /**
   * Retrieves all aircraft.
   * 
   * @returns A promise that resolves to an array of Aircraft objects.
   */
  async findAll(): Promise<Aircraft[]> {
    return await this.repository.findAll();
  }

  /**
   * Updates an existing aircraft in the service.
   * 
   * @param aircraft - The Aircraft object to update.
   * @returns A promise that resolves to the updated Aircraft object.
   * @throws Error if the registration is invalid.
   */
  async update(aircraft: Aircraft): Promise<Aircraft> {
    if (!aircraft.registration || !isAircraftRegistration(aircraft.registration)) {
      throw new Error(`Invalid aircraft registration: ${aircraft.registration}`);
    }

    const normalizedAircraft = {
      ...aircraft,
      registration: aircraftNormalizeRegistration(aircraft.registration)
    };

    return await this.repository.update(normalizedAircraft);
  }

  /**
   * Deletes an aircraft from the service.
   * 
   * @param registration - The registration of the aircraft to delete.
   * @returns A promise that resolves to true if the aircraft was deleted, false if not found.
   * @throws Error if the registration is invalid.
   */
  async delete(registration: string): Promise<boolean> {
    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    return await this.repository.delete(normalizedRegistration);
  }

  /**
   * Checks if an aircraft exists in the service.
   * 
   * @param registration - The registration of the aircraft to check.
   * @returns A promise that resolves to true if the aircraft exists, false otherwise.
   * @throws Error if the registration is invalid.
   */
  async exists(registration: string): Promise<boolean> {
    if (!isAircraftRegistration(registration)) {
      throw new Error(`Invalid aircraft registration: ${registration}`);
    }

    const normalizedRegistration = aircraftNormalizeRegistration(registration);
    return await this.repository.exists(normalizedRegistration);
  }
}

export default AircraftService;