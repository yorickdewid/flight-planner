import { FlightRules, formatWind, MetarData } from './metar.js';

describe('formatWind', () => {
  it('should return "Calm" when windDirection is not defined', () => {
    const metarData: MetarData = {
      station: 'TEST',
      observationTime: new Date(),
      flightRules: FlightRules.VFR,
      raw: 'RAW DATA',
    };
    expect(formatWind(metarData)).toBe('Calm');
  });

  it('should return wind direction and speed when windDirection and windSpeed are defined', () => {
    const metarData: MetarData = {
      station: 'TEST',
      observationTime: new Date(),
      flightRules: FlightRules.VFR,
      raw: 'RAW DATA',
      windDirection: 180,
      windSpeed: 10,
    };
    expect(formatWind(metarData)).toBe('180° 10kt');
  });

  it('should include gusting wind speed when windGust is defined', () => {
    const metarData: MetarData = {
      station: 'TEST',
      observationTime: new Date(),
      flightRules: FlightRules.VFR,
      raw: 'RAW DATA',
      windDirection: 180,
      windSpeed: 10,
      windGust: 20,
    };
    expect(formatWind(metarData)).toBe('180° 10kt gusting 20kt');
  });
});