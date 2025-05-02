import { FlightRules, MetarData, Metar } from './metar.js';

describe('Metar', () => {
  describe('flightRule', () => {
    it('should return VFR for good weather conditions', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
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
        clouds: [{ quantity: 'OVC', height: 300 }]
      };
      const metar = new Metar(metarData);
      expect(metar.flightRule).toBe(FlightRules.LIFR);
    });
  });

  describe('formatQNH', () => {
    it('should return "No QNH" when no QNH is present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
      };
      const metar = new Metar(metarData);
      expect(metar.formatQNH()).toBe('-');
    });
    it('should return formatted QNH when present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
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
      };
      const metar = new Metar(metarData);
      expect(metar.formatCeiling()).toBe('-');
    });

    it('should return formatted ceiling when clouds are present', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
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
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('Calm');
    });

    it('should return wind direction and speed when windDirection and windSpeed are defined', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        windDirection: 180,
        windSpeed: 10,
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('180° 10kt');
    });

    it('should include gusting wind speed when windGust is defined', () => {
      const metarData: MetarData = {
        station: 'TEST',
        observationTime: new Date(),
        raw: 'RAW DATA',
        windDirection: 180,
        windSpeed: 10,
        windGust: 20,
      };
      const metar = new Metar(metarData);
      expect(metar.formatWind()).toBe('180° 10kt gusting 20kt');
    });
  });
});