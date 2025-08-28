import {
  Aircraft,
  isAircraftRegistration,
  aircraftNormalizeRegistration,
  aircraftMaxPayload,
  aircraftRange,
  aircraftEndurance,
} from './aircraft.js';

describe('Aircraft functions', () => {
  describe('isAircraftRegistration', () => {
    it('should validate valid aircraft registrations', () => {
      expect(isAircraftRegistration('N123AB')).toBe(true);
      expect(isAircraftRegistration('G-ABCD')).toBe(true);
      expect(isAircraftRegistration('D-EFGH')).toBe(true);
      expect(isAircraftRegistration('OE-ABC')).toBe(true);
      expect(isAircraftRegistration('VH-XYZ')).toBe(true);
      expect(isAircraftRegistration('C-GABC')).toBe(true);
      expect(isAircraftRegistration('F-ABCD')).toBe(true);
    });

    it('should validate registrations without hyphens', () => {
      expect(isAircraftRegistration('N123AB')).toBe(true);
      expect(isAircraftRegistration('GABCD')).toBe(true);
      expect(isAircraftRegistration('DEFGH')).toBe(true);
    });

    it('should handle lowercase input', () => {
      expect(isAircraftRegistration('n123ab')).toBe(true);
      expect(isAircraftRegistration('g-abcd')).toBe(true);
      expect(isAircraftRegistration('oe-abc')).toBe(true);
    });

    it('should reject invalid aircraft registrations', () => {
      expect(isAircraftRegistration('')).toBe(false);
      expect(isAircraftRegistration('123')).toBe(false);
      expect(isAircraftRegistration('ABC-')).toBe(false);
      expect(isAircraftRegistration('-ABC')).toBe(false);
      expect(isAircraftRegistration('AB--CD')).toBe(false);
      expect(isAircraftRegistration('N@123')).toBe(false);
      expect(isAircraftRegistration('N 123')).toBe(false);
      expect(isAircraftRegistration('N.123')).toBe(false);
    });

    it('should reject registrations with special characters', () => {
      expect(isAircraftRegistration('N123@AB')).toBe(false);
      expect(isAircraftRegistration('G#ABCD')).toBe(false);
      expect(isAircraftRegistration('D$EFGH')).toBe(false);
      expect(isAircraftRegistration('OE ABC')).toBe(false);
    });
  });

  describe('aircraftNormalizeRegistration', () => {
    it('should convert to uppercase', () => {
      expect(aircraftNormalizeRegistration('n123ab')).toBe('N123AB');
      expect(aircraftNormalizeRegistration('g-abcd')).toBe('GABCD');
      expect(aircraftNormalizeRegistration('oe-abc')).toBe('OEABC');
    });

    it('should remove hyphens', () => {
      expect(aircraftNormalizeRegistration('G-ABCD')).toBe('GABCD');
      expect(aircraftNormalizeRegistration('D-EFGH')).toBe('DEFGH');
      expect(aircraftNormalizeRegistration('OE-ABC')).toBe('OEABC');
    });

    it('should handle already normalized registrations', () => {
      expect(aircraftNormalizeRegistration('N123AB')).toBe('N123AB');
      expect(aircraftNormalizeRegistration('GABCD')).toBe('GABCD');
    });

    it('should handle multiple hyphens', () => {
      expect(aircraftNormalizeRegistration('G--A-B-C-D')).toBe('GABCD');
    });
  });

  describe('aircraftMaxPayload', () => {
    it('should calculate max payload correctly', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        maxTakeoffWeight: 1000,
        emptyWeight: 600,
      };
      expect(aircraftMaxPayload(aircraft)).toBe(400);
    });

    it('should return undefined when maxTakeoffWeight is missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        emptyWeight: 600,
      };
      expect(aircraftMaxPayload(aircraft)).toBeUndefined();
    });

    it('should return undefined when emptyWeight is missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        maxTakeoffWeight: 1000,
      };
      expect(aircraftMaxPayload(aircraft)).toBeUndefined();
    });

    it('should return undefined when both weights are missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
      };
      expect(aircraftMaxPayload(aircraft)).toBeUndefined();
    });

    it('should handle zero weights', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        maxTakeoffWeight: 1000,
        emptyWeight: 0,
      };
      expect(aircraftMaxPayload(aircraft)).toBe(1000);
    });

    it('should handle edge case where empty weight equals max takeoff weight', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        maxTakeoffWeight: 1000,
        emptyWeight: 1000,
      };
      expect(aircraftMaxPayload(aircraft)).toBe(0);
    });
  });

  describe('aircraftEndurance', () => {
    it('should calculate endurance correctly', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 50,
      };
      expect(aircraftEndurance(aircraft)).toBe(4);
    });

    it('should return undefined when fuel capacity is missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelConsumption: 50,
      };
      expect(aircraftEndurance(aircraft)).toBeUndefined();
    });

    it('should return undefined when fuel consumption is missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
      };
      expect(aircraftEndurance(aircraft)).toBeUndefined();
    });

    it('should return undefined when fuel consumption is zero', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 0,
      };
      expect(aircraftEndurance(aircraft)).toBeUndefined();
    });

    it('should return undefined when fuel consumption is negative', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: -10,
      };
      expect(aircraftEndurance(aircraft)).toBeUndefined();
    });

    it('should handle fractional results', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 150,
        fuelConsumption: 75,
      };
      expect(aircraftEndurance(aircraft)).toBe(2);
    });

    it('should handle decimal results', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 100,
        fuelConsumption: 30,
      };
      expect(aircraftEndurance(aircraft)).toBeCloseTo(3.333, 3);
    });
  });

  describe('aircraftRange', () => {
    it('should calculate range correctly', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 50,
        cruiseSpeed: 120,
      };
      // Endurance: 200/50 = 4 hours
      // Range: 4 * 120 = 480 nm
      expect(aircraftRange(aircraft)).toBe(480);
    });

    it('should return undefined when cruise speed is missing', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 50,
      };
      expect(aircraftRange(aircraft)).toBeUndefined();
    });

    it('should return undefined when endurance cannot be calculated', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        cruiseSpeed: 120,
      };
      expect(aircraftRange(aircraft)).toBeUndefined();
    });

    it('should return undefined when fuel consumption is zero', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 0,
        cruiseSpeed: 120,
      };
      expect(aircraftRange(aircraft)).toBeUndefined();
    });

    it('should handle decimal calculations', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 100,
        fuelConsumption: 30,
        cruiseSpeed: 150,
      };
      // Endurance: 100/30 ≈ 3.333 hours
      // Range: 3.333 * 150 = 500 nm
      expect(aircraftRange(aircraft)).toBeCloseTo(500, 0);
    });

    it('should handle zero cruise speed', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        fuelCapacity: 200,
        fuelConsumption: 50,
        cruiseSpeed: 0,
      };
      expect(aircraftRange(aircraft)).toBe(0);
    });
  });

  describe('Aircraft interface type validation', () => {
    it('should accept valid aircraft with minimal required properties', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
      };
      expect(aircraft.registration).toBe('N123AB');
    });

    it('should accept aircraft with all properties', () => {
      const aircraft: Aircraft = {
        registration: 'N123AB',
        manufacturer: 'Cessna',
        icaoType: 'C172',
        hexcode: 'A12345',
        colors: 'White/Blue',
        numberOfEngines: 1,
        avionics: ['Garmin G1000', 'Bendix King'],
        cruiseSpeed: 120,
        fuelCapacity: 200,
        fuelConsumption: 25,
        fuelType: 'Avgas',
        engineType: 'piston',
        maxTakeoffWeight: 1157,
        rentalPrice: 150,
        emptyWeight: 743,
        serviceCeiling: 14000,
        maxDemonstratedCrosswind: 15,
        takeoffDistance: 518,
        landingDistance: 497,
        wingspan: 11,
        propellerType: 'fixed-pitch',
        landingGearType: 'fixed tricycle',
      };

      expect(aircraft.registration).toBe('N123AB');
      expect(aircraft.manufacturer).toBe('Cessna');
      expect(aircraft.fuelType).toBe('Avgas');
      expect(aircraft.engineType).toBe('piston');
      expect(aircraft.propellerType).toBe('fixed-pitch');
      expect(aircraft.landingGearType).toBe('fixed tricycle');
    });

    it('should accept different fuel types', () => {
      const avgas: Aircraft = { registration: 'N123AB', fuelType: 'Avgas' };
      const jetA: Aircraft = { registration: 'N123AB', fuelType: 'Jet A' };
      const jetA1: Aircraft = { registration: 'N123AB', fuelType: 'Jet A1' };
      const jetB: Aircraft = { registration: 'N123AB', fuelType: 'Jet B' };
      const mogas: Aircraft = { registration: 'N123AB', fuelType: 'Mogas' };
      const diesel: Aircraft = { registration: 'N123AB', fuelType: 'Diesel' };

      expect(avgas.fuelType).toBe('Avgas');
      expect(jetA.fuelType).toBe('Jet A');
      expect(jetA1.fuelType).toBe('Jet A1');
      expect(jetB.fuelType).toBe('Jet B');
      expect(mogas.fuelType).toBe('Mogas');
      expect(diesel.fuelType).toBe('Diesel');
    });

    it('should accept different engine types', () => {
      const piston: Aircraft = { registration: 'N123AB', engineType: 'piston' };
      const turboprop: Aircraft = { registration: 'N123AB', engineType: 'turboprop' };
      const turbojet: Aircraft = { registration: 'N123AB', engineType: 'turbojet' };
      const turbofan: Aircraft = { registration: 'N123AB', engineType: 'turbofan' };
      const electric: Aircraft = { registration: 'N123AB', engineType: 'electric' };
      const turboshaft: Aircraft = { registration: 'N123AB', engineType: 'turboshaft' };

      expect(piston.engineType).toBe('piston');
      expect(turboprop.engineType).toBe('turboprop');
      expect(turbojet.engineType).toBe('turbojet');
      expect(turbofan.engineType).toBe('turbofan');
      expect(electric.engineType).toBe('electric');
      expect(turboshaft.engineType).toBe('turboshaft');
    });

    it('should accept different propeller types', () => {
      const fixedPitch: Aircraft = { registration: 'N123AB', propellerType: 'fixed-pitch' };
      const variablePitch: Aircraft = { registration: 'N123AB', propellerType: 'variable-pitch' };
      const constantSpeed: Aircraft = { registration: 'N123AB', propellerType: 'constant-speed' };

      expect(fixedPitch.propellerType).toBe('fixed-pitch');
      expect(variablePitch.propellerType).toBe('variable-pitch');
      expect(constantSpeed.propellerType).toBe('constant-speed');
    });

    it('should accept different landing gear types', () => {
      const fixedTricycle: Aircraft = { registration: 'N123AB', landingGearType: 'fixed tricycle' };
      const retractableTricycle: Aircraft = { registration: 'N123AB', landingGearType: 'retractable tricycle' };
      const fixedConventional: Aircraft = { registration: 'N123AB', landingGearType: 'fixed conventional' };
      const retractableConventional: Aircraft = { registration: 'N123AB', landingGearType: 'retractable conventional' };
      const skis: Aircraft = { registration: 'N123AB', landingGearType: 'skis' };
      const floats: Aircraft = { registration: 'N123AB', landingGearType: 'floats' };

      expect(fixedTricycle.landingGearType).toBe('fixed tricycle');
      expect(retractableTricycle.landingGearType).toBe('retractable tricycle');
      expect(fixedConventional.landingGearType).toBe('fixed conventional');
      expect(retractableConventional.landingGearType).toBe('retractable conventional');
      expect(skis.landingGearType).toBe('skis');
      expect(floats.landingGearType).toBe('floats');
    });
  });
});
