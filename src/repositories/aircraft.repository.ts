import { Aircraft } from "../aircraft.js";

/**
 * Repository interface for aircraft data operations.
 * Provides a clean abstraction layer for data access operations.
 */
export interface AircraftRepository {
  /**
   * Finds an aircraft by its registration.
   * 
   * @param registration - The aircraft registration to search for.
   * @returns A promise that resolves to the Aircraft object or null if not found.
   */
  findByRegistration(registration: string): Promise<Aircraft | null>;

  /**
   * Finds multiple aircraft by their registrations.
   * 
   * @param registrations - An array of aircraft registrations to search for.
   * @returns A promise that resolves to an array of found Aircraft objects.
   */
  findByRegistrations(registrations: readonly string[]): Promise<Aircraft[]>;

  /**
   * Retrieves all aircraft from the repository.
   * 
   * @returns A promise that resolves to an array of all Aircraft objects.
   */
  findAll(): Promise<Aircraft[]>;

  /**
   * Creates a new aircraft in the repository.
   * 
   * @param aircraft - The Aircraft object to create.
   * @returns A promise that resolves to the created Aircraft object.
   */
  create(aircraft: Aircraft): Promise<Aircraft>;

  /**
   * Updates an existing aircraft in the repository.
   * 
   * @param aircraft - The Aircraft object to update.
   * @returns A promise that resolves to the updated Aircraft object.
   */
  update(aircraft: Aircraft): Promise<Aircraft>;

  /**
   * Deletes an aircraft from the repository.
   * 
   * @param registration - The registration of the aircraft to delete.
   * @returns A promise that resolves to true if the aircraft was deleted, false if not found.
   */
  delete(registration: string): Promise<boolean>;

  /**
   * Checks if an aircraft exists in the repository.
   * 
   * @param registration - The registration of the aircraft to check.
   * @returns A promise that resolves to true if the aircraft exists, false otherwise.
   */
  exists(registration: string): Promise<boolean>;
}
