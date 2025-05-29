import {
  metarFlightRule,
  metarFlightRuleColor,
  metarColorCode,
  metarCeiling,
} from './metar.js';
import { Metar } from './metar.types.js';
import { formatCloud, formatTemperature, formatVisibility, formatWind } from './format.js';
import { FlightRules } from './index.js';

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

  // describe('formatMetarQNH', () => {
  // it('should return formatted QNH when present', () => {
  //   const metarData: Metar = {
  //     station: 'TEST',
  //     observationTime: new Date(),
  //     raw: 'RAW DATA',
  //     wind: { direction: 180, speed: 10 },
  //     qnh: { value: 1013, unit: 'hPa' }
  //   };
  //   expect(formatPressure(metarData.qnh?.value!)).toBe('1013 hPa');
  // });

  // it('should return formatted QNH in inches when present', () => {
  //   const metarData: Metar = {
  //     station: 'TEST',
  //     observationTime: new Date(),
  //     raw: 'RAW DATA',
  //     wind: { direction: 180, speed: 10 },
  //     qnh: { value: 29.92, unit: 'inHg' }
  //   };
  //   expect(formatMetarQNH(metarData)).toBe('29.92 inHg');
  // });
  // });

  describe('metarCeiling', () => {
    // it('should return "No ceiling" when no clouds are present', () => {
    //   const metarData: Metar = {
    //     station: 'TEST',
    //     observationTime: new Date(),
    //     raw: 'RAW DATA',
    //     wind: { direction: 180, speed: 10 },
    //   };
    //   expect(formatMetarCeiling(metarData)).toBe('-');
    // });

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
});