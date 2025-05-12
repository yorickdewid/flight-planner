import {
  FlightRules,
  Metar,
  determineMetarFlightRule,
  getMetarFlightRuleColor,
  getMetarColorCode,
  formatMetarQNH,
  formatMetarCeiling,
  formatMetarClouds,
  formatWind,
  formatTemperature,
  formatVisibility,
} from './metar.js';

describe('Metar functions', () => {
  describe('determineMetarFlightRule', () => {
    it('should return VFR for good weather conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 10000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      expect(determineMetarFlightRule(metarData)).toBe(FlightRules.VFR);
    });

    it('should return LIFR for very poor visibility', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 800, unit: 'm' }
      };
      expect(determineMetarFlightRule(metarData)).toBe(FlightRules.LIFR);
    });

    it('should return LIFR for very low ceiling', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 300 }]
      };
      expect(determineMetarFlightRule(metarData)).toBe(FlightRules.LIFR);
    });
  });

  describe('getMetarFlightRuleColor', () => {
    it('should return "green" for VFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 10000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      expect(getMetarFlightRuleColor(metarData)).toBe('green');
    });

    it('should return "purple" for LIFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 800, unit: 'm' }
      };
      expect(getMetarFlightRuleColor(metarData)).toBe('purple');
    });

    it('should return "red" for IFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 4000, unit: 'm' },
        clouds: [{ quantity: 'OVC', height: 700 }]
      };
      expect(getMetarFlightRuleColor(metarData)).toBe('red');
    });

    it('should return "blue" for MVFR', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 2500 }]
      };
      expect(getMetarFlightRuleColor(metarData)).toBe('blue');
    });
  });

  describe('getMetarColorCode', () => {
    it('should return "red" for very hazardous conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 45 },
        visibility: { value: 1000, unit: 'm' }
      };
      expect(getMetarColorCode(metarData)).toBe('red');
    });

    it('should return "amber" for hazardous conditions', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 32 },
        visibility: { value: 1500, unit: 'm' }
      };
      expect(getMetarColorCode(metarData)).toBe('amber');
    });

    it('should return "yellow" for significant deterioration', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 22 },
        clouds: [{ quantity: 'BKN', height: 650 }]
      };
      expect(getMetarColorCode(metarData)).toBe('yellow');
    });

    it('should return "blue" for minor deterioration', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 16 },
        clouds: [{ quantity: 'BKN', height: 1400 }]
      };
      expect(getMetarColorCode(metarData)).toBe('blue');
    });

    it('should return "green" for normal operations', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 8000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 3500 }]
      };
      expect(getMetarColorCode(metarData)).toBe('green');
    });

    it('should handle wind gusts correctly', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 15, gust: 35 },
        visibility: { value: 8000, unit: 'm' }
      };
      expect(getMetarColorCode(metarData)).toBe('yellow');
    });

    it('should handle visibility in statute miles', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 0.75, unit: 'sm' } // Roughly 1200m
      };
      expect(getMetarColorCode(metarData)).toBe('amber');
    });
  });

  describe('formatMetarQNH', () => {
    it('should return "-" when no QNH is present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      expect(formatMetarQNH(metarData)).toBe('-');
    });

    it('should return formatted QNH when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        qnh: { value: 1013, unit: 'hPa' }
      };
      expect(formatMetarQNH(metarData)).toBe('1013 hPa');
    });

    it('should return formatted QNH in inches when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        qnh: { value: 29.92, unit: 'inHg' }
      };
      expect(formatMetarQNH(metarData)).toBe('29.92 inHg');
    });
  });

  describe('formatMetarCeiling', () => {
    it('should return "No ceiling" when no clouds are present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      expect(formatMetarCeiling(metarData)).toBe('-');
    });

    it('should return formatted ceiling when clouds are present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      expect(formatMetarCeiling(metarData)).toBe('3000 ft');
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
      expect(formatWind(metarData.wind)).toBe('180° with 10kt');
    });

    it('should include gusting wind speed when windGust is defined', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10, gust: 20 },
      };
      expect(formatWind(metarData.wind)).toBe('180° with 10kt gusting 20kt');
    });

    it('should include variable wind direction when windDirection is an array', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 350, speed: 12, directionMin: 340, directionMax: 360 },
      };
      expect(formatWind(metarData.wind)).toBe('350° with 12kt variable between 340° and 360°');
    });
  });

  describe('formatMetarVisibility', () => {
    it('should return formatted visibility when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 9999, unit: 'm' }
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
    it('should return "No clouds" when no clouds are present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      expect(formatMetarClouds(metarData)).toBe('-');
    });

    it('should return formatted clouds when present', () => {
      const metarData: Metar = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      expect(formatMetarClouds(metarData)).toBe('Broken at 3000 ft');
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
      expect(formatMetarClouds(metarData)).toBe('Broken at 3000 ft, Overcast at 5000 ft');
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
      expect(formatMetarClouds(metarData)).toBe('Few at 1000 ft, Scattered at 2000 ft, Broken at 3000 ft');
    });
  });
});