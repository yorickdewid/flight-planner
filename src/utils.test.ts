import { ReportingPoint, Aerodrome } from './airport.js';
import { isICAO, parseRouteString } from './utils.js';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { point } from '@turf/turf';
import { AerodromeService } from './service.js';

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