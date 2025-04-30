import { isICAO } from './utils.js';

describe('isICAO', () => {
  it('should return true for valid ICAO identifiers', () => {
    expect(isICAO('EHAM')).toBe(true);
    expect(isICAO('LFPG')).toBe(true);
    expect(isICAO('KJFK')).toBe(true);
    expect(isICAO('EHRD')).toBe(true);
  });

  it('should return false for invalid ICAO identifiers', () => {
    expect(isICAO('EHAM1')).toBe(false);
    expect(isICAO('eham')).toBe(false);
    expect(isICAO('EH AM')).toBe(false);
    expect(isICAO('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isICAO('ZZZZ')).toBe(true);
  });
});
