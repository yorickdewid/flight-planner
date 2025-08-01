// import { ReportingPoint, Aerodrome } from './airport.js';
import { isICAO, normalizeICAO, capitalizeWords, isIATA, normalizeIATA, generateBase32HashKey } from './utils.js';
import { describe, it, expect } from '@jest/globals';
// import { jest } from '@jest/globals';
// import { point } from '@turf/turf';
// import { AerodromeService } from './service.js';

describe('isICAO', () => {
  it('should return true for valid ICAO identifiers', () => {
    expect(isICAO('EHAM')).toBe(true);
    expect(isICAO('LFPG')).toBe(true);
    expect(isICAO('KJFK')).toBe(true);
    expect(isICAO('EHRD')).toBe(true);
    expect(isICAO('egll')).toBe(true);
  });

  it('should return false for invalid ICAO identifiers', () => {
    expect(isICAO('EHAM1')).toBe(false);
    expect(isICAO('ehams')).toBe(false);
    expect(isICAO('EH AM')).toBe(false);
    expect(isICAO('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isICAO('ZZZZ')).toBe(true);
  });
});

describe('normalizeICAO', () => {
  it('should convert lowercase ICAO codes to uppercase', () => {
    expect(normalizeICAO('eham')).toBe('EHAM');
    expect(normalizeICAO('lfpg')).toBe('LFPG');
    expect(normalizeICAO('kjfk')).toBe('KJFK');
  });

  it('should convert mixed case ICAO codes to uppercase', () => {
    expect(normalizeICAO('eHaM')).toBe('EHAM');
    expect(normalizeICAO('LfPg')).toBe('LFPG');
    expect(normalizeICAO('kJfK')).toBe('KJFK');
  });

  it('should leave uppercase ICAO codes unchanged', () => {
    expect(normalizeICAO('EHAM')).toBe('EHAM');
    expect(normalizeICAO('LFPG')).toBe('LFPG');
    expect(normalizeICAO('KJFK')).toBe('KJFK');
  });

  it('should handle empty strings', () => {
    expect(normalizeICAO('')).toBe('');
  });
});

describe('isIATA', () => {
  it('should return true for valid IATA identifiers', () => {
    expect(isIATA('AMS')).toBe(true);
    expect(isIATA('CDG')).toBe(true);
    expect(isIATA('JFK')).toBe(true);
    expect(isIATA('LHR')).toBe(true);
  });

  it('should return false for invalid IATA identifiers', () => {
    expect(isIATA('AM1')).toBe(false);
    expect(isIATA('AMS1')).toBe(false);
    expect(isIATA('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isIATA('ZZZ')).toBe(true);
  });
});

describe('normalizeIATA', () => {
  it('should convert lowercase IATA codes to uppercase', () => {
    expect(normalizeIATA('ams')).toBe('AMS');
    expect(normalizeIATA('cdg')).toBe('CDG');
    expect(normalizeIATA('jfk')).toBe('JFK');
  });

  it('should convert mixed case IATA codes to uppercase', () => {
    expect(normalizeIATA('aMs')).toBe('AMS');
    expect(normalizeIATA('cDg')).toBe('CDG');
    expect(normalizeIATA('jFk')).toBe('JFK');
  });

  it('should leave uppercase IATA codes unchanged', () => {
    expect(normalizeIATA('AMS')).toBe('AMS');
    expect(normalizeIATA('CDG')).toBe('CDG');
    expect(normalizeIATA('JFK')).toBe('JFK');
  });

  it('should handle empty strings', () => {
    expect(normalizeIATA('')).toBe('');
  });

  it('should handle invalid IATA codes', () => {
    expect(normalizeIATA('AM1')).toBe('AM1');
    expect(normalizeIATA('ams')).toBe('AMS');
    expect(normalizeIATA('AMS1')).toBe('AMS1');
    expect(normalizeIATA('')).toBe('');
  });
});

describe('capitalizeWords', () => {
  it('should capitalize the first letter of each word', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
    expect(capitalizeWords('amsterdam airport schiphol')).toBe('Amsterdam Airport Schiphol');
    expect(capitalizeWords('paris charles de gaulle')).toBe('Paris Charles De Gaulle');
  });

  it('should convert uppercase text to title case', () => {
    expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
    expect(capitalizeWords('AMSTERDAM AIRPORT')).toBe('Amsterdam Airport');
  });

  it('should handle mixed case input', () => {
    expect(capitalizeWords('hELLo woRLd')).toBe('Hello World');
    expect(capitalizeWords('aMSterDAM airPORT')).toBe('Amsterdam Airport');
  });

  it('should handle single word input', () => {
    expect(capitalizeWords('hello')).toBe('Hello');
    expect(capitalizeWords('AIRPORT')).toBe('Airport');
  });

  it('should handle empty string', () => {
    expect(capitalizeWords('')).toBe('');
  });

  it('should handle strings with extra spaces', () => {
    expect(capitalizeWords('  hello  world  ')).toBe('  Hello  World  ');
  });
});

describe('generateBase32HashKey', () => {
  it('should generate consistent hash for the same input', () => {
    const input = 'test string';
    const hash1 = generateBase32HashKey(input);
    const hash2 = generateBase32HashKey(input);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = generateBase32HashKey('input1');
    const hash2 = generateBase32HashKey('input2');
    expect(hash1).not.toBe(hash2);
  });

  it('should generate Base32 encoded strings', () => {
    const hash = generateBase32HashKey('test');
    // Base32 should only contain A-Z and 2-7
    expect(hash).toMatch(/^[A-Z2-7]+$/);
  });

  it('should handle empty string', () => {
    const hash = generateBase32HashKey('');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle special characters and unicode', () => {
    const hash1 = generateBase32HashKey('Hello, World! 🌍');
    const hash2 = generateBase32HashKey('test@example.com');
    const hash3 = generateBase32HashKey('路由字符串测试');

    expect(typeof hash1).toBe('string');
    expect(typeof hash2).toBe('string');
    expect(typeof hash3).toBe('string');
    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);
  });

  it('should generate hashes suitable for key-value store keys', () => {
    const inputs = [
      'EHAM-LFPG-2024-12-25',
      'flight-plan-123456',
      'weather-data-cache',
      'user-preferences-john-doe'
    ];

    const hashes = inputs.map(input => generateBase32HashKey(input));

    // All hashes should be unique
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(inputs.length);

    // All hashes should be valid Base32
    hashes.forEach(hash => {
      expect(hash).toMatch(/^[A-Z2-7]+$/);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  it('should be case sensitive', () => {
    const hash1 = generateBase32HashKey('Test');
    const hash2 = generateBase32HashKey('test');
    const hash3 = generateBase32HashKey('TEST');

    expect(hash1).not.toBe(hash2);
    expect(hash2).not.toBe(hash3);
    expect(hash1).not.toBe(hash3);
  });
});

// describe('parseRouteString', () => {
//   const mockFindByICAO = jest.fn<() => Promise<Aerodrome | undefined>>();

//   const mockAerodromeService: AerodromeService = {
//     findByICAO: mockFindByICAO,
//     aerodromes: new Map(),
//     set fetchFunction: jest.fn(),
//     // fetchFunction
//     nearestAerodrome: jest.fn(),
//   };

//   const mockReportingPoints = [
//     new ReportingPoint('TEST', point([13.4, 52.5]), false),
//   ];

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should parse ICAO codes correctly', async () => {
//     const mockAerodrome1 = new Aerodrome('Amsterdam Airport Schiphol', 'EHAM', point([4.7634, 52.3105]), [], {});
//     const mockAerodrome2 = new Aerodrome('Paris Charles de Gaulle Airport', 'LFPG', point([2.5479, 49.0097]), [], {});

//     mockFindByICAO
//       .mockResolvedValueOnce(mockAerodrome1)
//       .mockResolvedValueOnce(mockAerodrome2);

//     const result = await parseRouteString(mockAerodromeService, mockReportingPoints, 'AD(EHAM);AD(LFPG)');

//     expect(mockFindByICAO).toHaveBeenCalledTimes(2);
//     expect(result).toHaveLength(2);
//     expect(result[0].name).toBe('Amsterdam Airport Schiphol');
//     expect(result[1].name).toBe('Paris Charles de Gaulle Airport');
//   });

//   it('should parse reporting points correctly', async () => {
//     const result = await parseRouteString(mockAerodromeService, mockReportingPoints, 'RP(TEST)');

//     expect(result).toHaveLength(1);
//     expect(result[0].name).toBe('TEST');
//   });

//   it('should parse waypoints correctly', async () => {
//     const result = await parseRouteString(mockAerodromeService, mockReportingPoints, 'WP(52.5,13.4)');

//     expect(result).toHaveLength(1);
//     expect(result[0].name).toBe('<WP>');
//     expect(result[0].location.geometry.coordinates).toEqual([13.4, 52.5]);
//   });
// });