import { degreesToRadians, isICAO, radiansToDegrees } from './utils';

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

describe('degreesToRadians', () => {
  it('should convert degrees to radians', () => {
    expect(degreesToRadians(0)).toBe(0);
    expect(degreesToRadians(90)).toBe(Math.PI / 2);
    expect(degreesToRadians(180)).toBe(Math.PI);
    expect(degreesToRadians(270)).toBe(3 * Math.PI / 2);
    expect(degreesToRadians(360)).toBe(2 * Math.PI);
  });
});

describe('radiansToDegrees', () => {
  it('should convert radians to degrees', () => {
    expect(radiansToDegrees(0)).toBe(0);
    expect(radiansToDegrees(Math.PI / 2)).toBe(90);
    expect(radiansToDegrees(Math.PI)).toBe(180);
    expect(radiansToDegrees(3 * Math.PI / 2)).toBe(270);
    expect(radiansToDegrees(2 * Math.PI)).toBe(360);
  });
});