import { FlightRules, MetarData, Metar } from './metar.js';

describe('Metar', () => {
  describe('flightRule', () => {
    it('should return VFR for good weather conditions', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 10000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRule).toBe(FlightRules.VFR);
    });

    it('should return LIFR for very poor visibility', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 800, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.flightRule).toBe(FlightRules.LIFR);
    });

    it('should return LIFR for very low ceiling', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 300 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRule).toBe(FlightRules.LIFR);
    });
  });

  describe('flightRuleColor', () => {
    it('should return "green" for VFR', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 10000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 5000 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRuleColor).toBe('green');
    });

    it('should return "purple" for LIFR', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 800, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.flightRuleColor).toBe('purple');
    });

    it('should return "red" for IFR', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 4000, unit: 'm' },
        clouds: [{ quantity: 'OVC', height: 700 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRuleColor).toBe('red');
    });

    it('should return "blue" for MVFR', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'OVC', height: 2500 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRuleColor).toBe('blue');
    });
  });

  describe('colorCode', () => {
    it('should return "red" for very hazardous conditions', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 45 },
        visibility: { value: 1000, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('red');
    });

    it('should return "amber" for hazardous conditions', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 32 },
        visibility: { value: 1500, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('amber');
    });

    it('should return "yellow" for significant deterioration', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 22 },
        clouds: [{ quantity: 'BKN', height: 650 }]
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('yellow');
    });

    it('should return "blue" for minor deterioration', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 16 },
        clouds: [{ quantity: 'BKN', height: 1400 }]
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('blue');
    });

    it('should return "green" for normal operations', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 8000, unit: 'm' },
        clouds: [{ quantity: 'FEW', height: 3500 }]
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('green');
    });

    it('should handle wind gusts correctly', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 15, gust: 35 },
        visibility: { value: 8000, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('yellow');
    });

    it('should handle visibility in statute miles', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 0.75, unit: 'sm' } // Roughly 1200m
      };
      const metar = new Metar(metarData);
      expect(metar.colorCode).toBe('amber');
    });
  });

  describe('formatQNH', () => {
    it('should return "-" when no QNH is present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatQNH()).toBe('-');
    });

    it('should return formatted QNH when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        qnh: { value: 1013, unit: 'hPa' }
      };
      const metar = new Metar(metarData);
      expect(metar.formatQNH()).toBe('1013 hPa');
    });

    it('should return formatted QNH in inches when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        qnh: { value: 29.92, unit: 'inHg' }
      };
      const metar = new Metar(metarData);
      expect(metar.formatQNH()).toBe('29.92 inHg');
    });
  });

  describe('formatCeiling', () => {
    it('should return "No ceiling" when no clouds are present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatCeiling()).toBe('-');
    });

    it('should return formatted ceiling when clouds are present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      const metar = new Metar(metarData);
      expect(metar.formatCeiling()).toBe('3000 ft');
    });
  });

  describe('formatWind', () => {
    it('should return "Calm" when windDirection is not defined', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 0, speed: 0 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('Calm');
    });

    it('should return wind direction and speed when windDirection and windSpeed are defined', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('180° with 10kt');
    });

    it('should include gusting wind speed when windGust is defined', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10, gust: 20 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('180° with 10kt gusting 20kt');
    });

    it('should include variable wind direction when windDirection is an array', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 350, speed: 12, directionMin: 340, directionMax: 360 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('350° with 12kt variable between 340° and 360°');
    });
  });

  describe('formatVisibility', () => {
    it('should return "No visibility" when no visibility is present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatVisibility()).toBe('-');
    });

    it('should return formatted visibility when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        visibility: { value: 9999, unit: 'm' }
      };
      const metar = new Metar(metarData);
      expect(metar.formatVisibility()).toBe('10 km+');
    });

    it('should handle CAVOK condition correctly', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'EGLL 291020Z 24015KT CAVOK 18/09 Q1022',
        wind: { direction: 240, speed: 15 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatVisibility()).toBe('10 km+');
    });
  });

  describe('formatTemperature', () => {
    it('should return "No temperature" when no temperature is present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatTemperature()).toBe('-');
    });

    it('should return formatted temperature when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        temperature: 23
      };
      const metar = new Metar(metarData);
      expect(metar.formatTemperature()).toBe('23°C');
    });
  });

  describe('formatDewpoint', () => {
    it('should return "-" when no dew point is present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatDewpoint()).toBe('-');
    });

    it('should return formatted dew point when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        dewpoint: 15
      };
      const metar = new Metar(metarData);
      expect(metar.formatDewpoint()).toBe('15°C');
    });
  });

  describe('formatClouds', () => {
    it('should return "No clouds" when no clouds are present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
      };
      const metar = new Metar(metarData);
      expect(metar.formatClouds()).toBe('-');
    });

    it('should return formatted clouds when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [{ quantity: 'BKN', height: 3000 }]
      };
      const metar = new Metar(metarData);
      expect(metar.formatClouds()).toBe('Broken at 3000 ft');
    });

    it('should return formatted clouds with multiple layers', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        wind: { direction: 180, speed: 10 },
        clouds: [
          { quantity: 'BKN', height: 3000 },
          { quantity: 'OVC', height: 5000 }
        ]
      };
      const metar = new Metar(metarData);
      expect(metar.formatClouds()).toBe('Broken at 3000 ft, Overcast at 5000 ft');
    });

    it('should return formatted clouds with different quantities', () => {
      const metarData: MetarData = {
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
      const metar = new Metar(metarData);
      expect(metar.formatClouds()).toBe('Few at 1000 ft, Scattered at 2000 ft, Broken at 3000 ft');
    });
  });
});