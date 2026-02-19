import {
  metarFlightRule,
  metarFlightRuleColor,
  metarColorCode,
  metarCeiling,
  createMetarFromString,
  isMetarExpired,
} from './metar.js';
import { Metar, Wind } from './metar.types.js';
import { formatCloud, formatPressure, formatTemperature, formatVisibility, formatWind } from './format.js';
import { FlightRules } from './metar.types.js';

describe('Metar functions', () => {
  describe('metarFlightRule', () => {
    it('should return VFR for good weather conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 10000,
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      expect(metarFlightRule(metarData)).toBe(FlightRules.VFR);
    });

    it('should return LIFR for very poor visibility', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 800,
      };
      expect(metarFlightRule(metarData)).toBe(FlightRules.LIFR);
    });

    it('should return LIFR for very low ceiling', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 300 }]
      };
      expect(metarFlightRule(metarData)).toBe(FlightRules.LIFR);
    });
  });

  describe('metarFlightRuleColor', () => {
    it('should return "green" for VFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 10000,
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      expect(metarFlightRuleColor(metarData)).toBe('green');
    });

    it('should return "purple" for LIFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 800,
      };
      expect(metarFlightRuleColor(metarData)).toBe('purple');
    });

    it('should return "red" for IFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 4000,
        clouds: [{ quantity: 'OVC', height: 700 }]
      };
      expect(metarFlightRuleColor(metarData)).toBe('red');
    });

    it('should return "blue" for MVFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 2500 }]
      };
      expect(metarFlightRuleColor(metarData)).toBe('blue');
    });
  });

  describe('metarColorCode', () => {
    it('should return "red" for very hazardous conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 45 },
        visibility: 1000,
      };
      expect(metarColorCode(metarData)).toBe('red');
    });

    it('should return "amber" for hazardous conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 32 },
        visibility: 1500,
      };
      expect(metarColorCode(metarData)).toBe('amber');
    });

    it('should return "yellow" for significant deterioration', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 22 },
        clouds: [{ quantity: 'BKN', height: 650 }]
      };
      expect(metarColorCode(metarData)).toBe('yellow');
    });

    it('should return "blue" for minor deterioration', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 16 },
        clouds: [{ quantity: 'BKN', height: 1400 }]
      };
      expect(metarColorCode(metarData)).toBe('blue');
    });

    it('should return "green" for normal operations', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 8000,
        clouds: [{ quantity: 'FEW', height: 3500 }]
      };
      expect(metarColorCode(metarData)).toBe('green');
    });

    it('should handle wind gusts correctly', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 15, gust: 35 },
        visibility: 8000,
      };
      expect(metarColorCode(metarData)).toBe('yellow');
    });
  });

  describe('formatMetarQNH', () => {
    it('should return formatted QNH when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        qnh: 1013
      };
      expect(formatPressure(metarData.qnh!)).toBe('1013 hPa');
    });
  });

  describe('metarCeiling', () => {
    it('should return "undefined" when no clouds are present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      expect(metarCeiling(metarData)).toBeUndefined();
    });

    it('should return formatted ceiling when clouds are present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      expect(metarCeiling(metarData)).toBe(3000);
    });
  });

  describe('formatMetarWind', () => {
    it('should return "Calm" when windDirection is not defined', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 0, speed: 0 },
      };
      expect(formatWind(metarData.wind)).toBe('Calm');
    });

    it('should return wind direction and speed when windDirection and windSpeed are defined', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      expect(formatWind(metarData.wind)).toBe('180° with 10 kt');
    });

    it('should include gusting wind speed when windGust is defined', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10, gust: 20 },
      };
      expect(formatWind(metarData.wind)).toBe('180° with 10 kt gusting 20 kt');
    });

    it('should include variable wind direction when windDirection is an array', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 350, speed: 12, directionMin: 340, directionMax: 360 },
      };
      expect(formatWind(metarData.wind)).toBe('350° with 12 kt variable between 340° and 360°');
    });
  });

  describe('formatMetarVisibility', () => {
    it('should return formatted visibility when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: 9999,
      };
      expect(formatVisibility(metarData.visibility!)).toBe('10 km+');
    });

    // it('should handle CAVOK condition correctly', () => {
    //   const metarData: Metar = {
    //     station: 'TEST',
    //     observationTime: new Date(),
    //     raw: 'EGLL 291020Z 24015KT CAVOK 18/09 Q1022',
    //     wind: { direction: 240, speed: 15 },
    //   };
    //   expect(formatVisibility(metarData.visibility!)).toBe('10 km+');
    // });
  });

  describe('formatMetarTemperature', () => {
    it('should return formatted temperature when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        temperature: 23
      };
      expect(formatTemperature(metarData.temperature!)).toBe('23°C');
    });
  });

  describe('formatMetarDewpoint', () => {
    it('should return formatted dew point when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        dewpoint: 15
      };
      expect(formatTemperature(metarData.dewpoint!)).toBe('15°C');
    });
  });

  describe('formatMetarClouds', () => {
    it('should return formatted clouds when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      expect(formatCloud(metarData.clouds![0])).toBe('Broken at 3000 ft');
    });

    it('should return formatted clouds with multiple layers', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [
          { quantity: 'BKN', height: 3000 },
          { quantity: 'OVC', height: 5000 }
        ]
      };
      expect(formatCloud(metarData.clouds![0])).toBe('Broken at 3000 ft');
      expect(formatCloud(metarData.clouds![1])).toBe('Overcast at 5000 ft');
    });

    it('should return formatted clouds with different quantities', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [
          { quantity: 'FEW', height: 1000 },
          { quantity: 'SCT', height: 2000 },
          { quantity: 'BKN', height: 3000 }
        ]
      };
      expect(formatCloud(metarData.clouds![0])).toBe('Few at 1000 ft');
      expect(formatCloud(metarData.clouds![1])).toBe('Scattered at 2000 ft');
      expect(formatCloud(metarData.clouds![2])).toBe('Broken at 3000 ft');
    });
  });

  describe('createMetarFromString', () => {
    it('should parse a simple METAR string correctly', () => {
      const rawMetar = 'METAR EHAM 011025Z 24015KT 9999 SCT040 BKN080 18/12 Q1012 NOSIG';
      const metar = createMetarFromString(rawMetar);
      expect(metar.station).toBe('EHAM');
      expect(metar.observationTime.getUTCDate()).toBe(1);
      expect(metar.observationTime.getUTCHours()).toBe(10);
      expect(metar.observationTime.getUTCMinutes()).toBe(25);
      expect(metar.wind?.direction).toBe(240);
      expect(metar.wind?.speed).toBe(15);
      expect(metar.visibility).toBe(9999);
      expect(metar.clouds).toEqual([
        { quantity: 'SCT', height: 4000 },
        { quantity: 'BKN', height: 8000 },
      ]);
      expect(metar.temperature).toBe(18);
      expect(metar.dewpoint).toBe(12);
      expect(metar.qnh).toBe(1012);
      expect(metar.raw).toContain('METAR EHAM 011025Z 24015KT 9999 SCT040 BKN080 18/12 Q1012 NOSIG');
    });

    it('should handle wind in MPS and visibility in SM', () => {
      const rawMetar = 'METAR KLAX 011053Z 25008MPS 6SM FEW040 SCT060 OVC080 17/11 A2983 RMK AO2 SLP101';
      const metar = createMetarFromString(rawMetar);
      expect(metar.station).toBe('KLAX');
      expect(metar.wind?.speed).toBeCloseTo(15.55, 1); // 8 MPS to knots
      expect(metar.visibility).toBeCloseTo(9656.064, 1); // 6 SM to meters
      expect(metar.qnh).toBeCloseTo(1010.14, 1); // 29.83 inHg to hPa
    });

    // it('should handle wind in KM/H', () => {
    //   const rawMetar = 'METAR CYYZ 011000Z 30020G30KMH 8000 -SN BKN015 OVC030 M05/M08 Q0995';
    //   const metar = createMetarFromString(rawMetar);
    //   expect(metar.station).toBe('CYYZ');
    //   expect(metar.wind?.speed).toBeCloseTo(10.8, 1); // 20 KM/H to knots
    //   expect(metar.wind?.gust).toBeCloseTo(16.2, 1); // 30 KM/H to knots
    // });

    it('should handle CAVOK', () => {
      const rawMetar = 'METAR LFPG 011100Z 27010KT CAVOK 15/08 Q1018 NOSIG';
      const metar = createMetarFromString(rawMetar);
      expect(metar.station).toBe('LFPG');
      expect(metar.visibility).toBe(9999);
      expect(metar.clouds).toEqual([]);
    });

    it('should handle AUTO keyword', () => {
      const rawMetar = 'METAR EDDF 011050Z AUTO 23012KT 9999 FEW030 17/11 Q1009 NOSIG';
      const metar = createMetarFromString(rawMetar);
      expect(metar.station).toBe('EDDF');
      expect(metar.raw).toContain('AUTO');
    });

    it('should handle variable wind direction', () => {
      const rawMetar = 'METAR LOWW 011120Z VRB03KT 9999 SCT050 19/10 Q1015 NOSIG';
      const metar = createMetarFromString(rawMetar);
      expect(metar.wind?.direction).toBeUndefined(); // VRB means variable
      expect(metar.wind?.speed).toBe(3);
    });

    it('should handle wind variation', () => {
      const rawMetar = 'METAR EGLL 011020Z 24015KT 200V280 9999 SCT030 BKN050 18/12 Q1012 BECMG 27020G30KT';
      const metar = createMetarFromString(rawMetar);
      expect(metar.wind?.direction).toBe(240);
      expect(metar.wind?.speed).toBe(15);
      expect(metar.wind?.directionMin).toBe(200);
      expect(metar.wind?.directionMax).toBe(280);
    });
  });

  describe('isMetarExpired', () => {
    const baseTime = new Date('2025-06-01T10:00:00Z'); // June 1, 2025 10:00 UTC
    const dummyWind: Wind = { direction: 0, speed: 0 };

    it('should return false for a recent METAR using standard rules', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T09:30:00Z'), // 30 minutes ago
        raw: 'METAR TEST ...',
        wind: dummyWind,
      };
      // Mock current time to be baseTime
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData)).toBe(false);
      vi.useRealTimers();
    });

    it('should return true for an old METAR using standard rules', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T08:50:00Z'), // 70 minutes ago
        raw: 'METAR TEST ...',
        wind: dummyWind,
      };
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData)).toBe(true);
      vi.useRealTimers();
    });

    it('should return false for a recent SPECI report using standard rules', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T09:45:00Z'), // 15 minutes ago
        raw: 'SPECI TEST ...',
        wind: dummyWind,
      };
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData)).toBe(false);
      vi.useRealTimers();
    });

    it('should return true for an old SPECI report using standard rules', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T09:25:00Z'), // 35 minutes ago
        raw: 'SPECI TEST ...',
        wind: dummyWind,
      };
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData)).toBe(true);
      vi.useRealTimers();
    });

    it('should use custom expiration time if provided', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T09:50:00Z'), // 10 minutes ago
        raw: 'METAR TEST ...',
        wind: dummyWind,
      };
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData, { customMinutes: 5 })).toBe(true); // Expired after 5 mins
      expect(isMetarExpired(metarData, { customMinutes: 15 })).toBe(false); // Not expired after 15 mins
      vi.useRealTimers();
    });

    it('should default to 60 minutes if useStandardRules is false and no customMinutes', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T08:55:00Z'), // 65 minutes ago
        raw: 'METAR TEST ...',
        wind: dummyWind,
      };
      vi.useFakeTimers().setSystemTime(baseTime);
      expect(isMetarExpired(metarData, { useStandardRules: false })).toBe(true);

      const metarData2: Metar = {
        station: 'TEST',
        observationTime: new Date('2025-06-01T09:05:00Z'), // 55 minutes ago
        raw: 'METAR TEST ...',
        wind: dummyWind,
      };
      expect(isMetarExpired(metarData2, { useStandardRules: false })).toBe(false);
      vi.useRealTimers();
    });
  });
});
