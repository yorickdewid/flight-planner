import { describe, it, expect } from 'vitest';
import { calculateNavLog } from './navigation.js';
import { createMetarFromString } from './metar.js';
import { WaypointVariant, Waypoint } from './waypoint.types.js';
import { MetarStation } from './metar.types.js';

const station = (icao: string, coords: GeoJSON.Position, raw: string): MetarStation => ({
  station: icao,
  metar: createMetarFromString(raw),
  coords,
});

const waypoint = (name: string, coords: GeoJSON.Position, metarStation?: MetarStation): Waypoint => ({
  name,
  coords,
  waypointVariant: WaypointVariant.Waypoint,
  metarStation,
});

const EHRD_COORDS: GeoJSON.Position = [4.4406, 51.9569];
const LFAT_COORDS: GeoJSON.Position = [1.6214, 50.5186];
const EBMM_COORDS: GeoJSON.Position = [5.7047, 50.9539];

const EHRD_METAR = 'METAR EHRD 181755Z AUTO 34010KT 9999 OVC048 18/12 Q1017 NOSIG';
const LFAT_METAR = 'METAR LFAT 181830Z AUTO 03011KT 9999 SCT037 19/11 Q1019 NOSIG';
const EBMM_METAR = 'METAR EBMM 181825Z AUTO 34008KT 9999 FEW040 18/11 Q1018 NOSIG';

const aircraft = { cruiseSpeed: 110, fuelConsumption: 25 };

describe('calculateNavLog incomplete leg reporting', () => {
  it('omits incompleteLegs when every leg has performance data', () => {
    const segments = [
      { waypoint: waypoint('EHRD', EHRD_COORDS, station('EHRD', EHRD_COORDS, EHRD_METAR)) },
      { waypoint: waypoint('LFAT', LFAT_COORDS, station('LFAT', LFAT_COORDS, LFAT_METAR)) },
      { waypoint: waypoint('EBMM', EBMM_COORDS, station('EBMM', EBMM_COORDS, EBMM_METAR)) },
      { waypoint: waypoint('EHRD', EHRD_COORDS, station('EHRD', EHRD_COORDS, EHRD_METAR)) },
    ];

    const log = calculateNavLog({ segments, aircraft });

    expect(log.incompleteLegs).toBeUndefined();
    expect(log.route.every(leg => leg.performance)).toBe(true);
    expect(log.totalDuration).toBeGreaterThan(0);
  });

  it('flags legs whose start waypoint has no wind data', () => {
    // LFAT has no METAR station: leg 1 (LFAT -> EBMM) uses start wind and
    // cannot compute performance. Leg 0 uses EHRD's wind, and leg 2 (last)
    // uses the END waypoint's wind (EHRD), so both stay complete.
    const segments = [
      { waypoint: waypoint('EHRD', EHRD_COORDS, station('EHRD', EHRD_COORDS, EHRD_METAR)) },
      { waypoint: waypoint('LFAT', LFAT_COORDS) },
      { waypoint: waypoint('EBMM', EBMM_COORDS) },
      { waypoint: waypoint('EHRD', EHRD_COORDS, station('EHRD', EHRD_COORDS, EHRD_METAR)) },
    ];

    const log = calculateNavLog({ segments, aircraft });

    expect(log.incompleteLegs).toEqual([1]);
    expect(log.route[1].performance).toBeUndefined();
    // Distance still counts every leg; duration/fuel exclude the flagged one.
    expect(log.totalDistance).toBeGreaterThan(300);
  });

  it('flags every leg when no waypoint has wind data', () => {
    const segments = [
      { waypoint: waypoint('EHRD', EHRD_COORDS) },
      { waypoint: waypoint('LFAT', LFAT_COORDS) },
      { waypoint: waypoint('EBMM', EBMM_COORDS) },
    ];

    const log = calculateNavLog({ segments, aircraft });

    expect(log.incompleteLegs).toEqual([0, 1]);
    expect(log.totalDuration).toBe(0);
  });
});
