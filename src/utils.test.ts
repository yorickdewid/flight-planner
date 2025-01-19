import { isICAO } from './utils';

describe('isICAO', () => {
  it('should return true for valid ICAO identifiers', () => {
    expect(isICAO('EHAM')).toBe(true); // Amsterdam Schiphol Airport
    expect(isICAO('LFPG')).toBe(true); // Paris Charles de Gaulle Airport
    expect(isICAO('KJFK')).toBe(true); // New York JFK Airport
    expect(isICAO('EHRD')).toBe(true); // Your home base, Rotterdam The Hague Airport 😉
  });

  it('should return false for invalid ICAO identifiers', () => {
    expect(isICAO('EHRA')).toBe(false); // Invalid - too short
    expect(isICAO('EHAM1')).toBe(false); // Invalid - contains a number
    expect(isICAO('eham')).toBe(false); // Invalid - lowercase letters
    expect(isICAO('EH AM')).toBe(false); // Invalid - contains a space
    expect(isICAO('')).toBe(false); // Invalid - empty string
    expect(isICAO(null)).toBe(false); // Invalid - null value
    expect(isICAO(undefined)).toBe(false); // Invalid - undefined value
  });

  it('should handle edge cases', () => {
    expect(isICAO('ZZZZ')).toBe(true); // Valid, but unusual
  });
});
