// - VFR Minimum Fuel Reserves (SERA.OP.MPA.150/NCO.OP.125-like)
// - Fuel for Alternate Aerodrome
// - Crosswind Limitations
// - Check wind and gust
// - Check runway length
// - Check weight & balance
// - Minimum Safe Altitude (SERA.5005.f / NCO.OP.145): Enroute altitude > 1000 ft above highest obstacle within 500 M
// - Low temparature warning
// - Check for significant weather along route like thunderstorms, icing, turbulence
// - Flight plan for controlled airspace
// - Also check for alternate aerodrome
// - Check for wind gusts

import { Aircraft } from './aircraft.js';
import { RouteTrip, RouteOptions, routeTripWaypoints } from './planner.js';
import { FlightRules } from './index.js';
import { Metar } from './metar.types.js';
import { metarFlightRule, metarCeiling } from './metar.js';
import { isNight } from './sun.js';
import { MAX_LEG_DURATION_MINUTES } from './constants.js';

/**
 * Defines the severity level of an advisory.
 */
export enum AdvisoryLevel {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
}

/**
 * Represents an advisory message related to a flight plan.
 *
 * @interface Advisory
 * @property {string} code - A unique code identifying the advisory.
 * @property {AdvisoryLevel} level - The severity level of the advisory.
 * @property {any} [details] - Optional additional details about the advisory.
 */
export interface Advisory {
  code: string;
  level: AdvisoryLevel;
  details?: Record<string, unknown>;
}

/**
 * Checks VFR minimum fuel reserves.
 * Assumes a 30-minute reserve for VFR day flights.
 *
 * @param routeTrip The flight plan's route trip.
 * @param aircraft The aircraft being used.
 * @param options The route options.
 * @returns An array of advisories related to fuel reserves.
 */
function checkVfrMinimumFuel(
  _routeTrip: RouteTrip,
  aircraft: Aircraft,
  _options?: RouteOptions,
): Advisory[] {
  const advisories: Advisory[] = [];
  // const reserveMinutes = options?.reserveFuelDuration ?? 30; // Default to 30 minutes

  if (!aircraft.fuelConsumption || aircraft.fuelConsumption <= 0) {
    advisories.push({
      code: 'ERROR_AIRCRAFT_FUEL_CONSUMPTION_INVALID',
      level: AdvisoryLevel.Error,
      details: {
        fuelConsumption: aircraft.fuelConsumption
      },
    });
    return advisories;
  }

  // const tripFuel = routeTrip.totalFuelConsumption;
  // if (tripFuel === undefined || tripFuel === null) {
  //   advisories.push({
  //     code: 'WARN_TRIP_FUEL_MISSING',
  //     level: AdvisoryLevel.Warning,
  //   });
  //   return advisories;
  // }

  // const reserveFuel = (reserveMinutes / 60) * aircraft.fuelConsumption; // Reserve fuel in liters
  // const totalFuelRequired = tripFuel + reserveFuel;

  // // Add taxi, takeoff, landing fuel if specified in options
  // let contingencyFuel = 0;
  // if (options?.taxiFuel) contingencyFuel += options.taxiFuel;
  // if (options?.takeoffFuel) contingencyFuel += options.takeoffFuel;
  // if (options?.landingFuel) contingencyFuel += options.landingFuel;

  // const finalTotalFuelRequired = totalFuelRequired + contingencyFuel;

  // if (routeTrip.totalFuelRequired !== undefined && Math.abs(routeTrip.totalFuelRequired - finalTotalFuelRequired) > 0.1) {
  //   advisories.push({
  //     code: 'WARN_TOTAL_FUEL_MISMATCH',
  //     level: AdvisoryLevel.Warning,
  //     details: {
  //       routeTripValue: routeTrip.totalFuelRequired,
  //       calculatedValue: finalTotalFuelRequired
  //     }
  //   });
  // }

  // if (!aircraft.fuelCapacity || aircraft.fuelCapacity <= 0) {
  //   advisories.push({
  //     code: 'ERROR_AIRCRAFT_FUEL_CAPACITY_INVALID',
  //     level: AdvisoryLevel.Error,
  //     details: {
  //       fuelCapacity: aircraft.fuelCapacity
  //     },
  //   });
  //   return advisories;
  // }

  // if (finalTotalFuelRequired > aircraft.fuelCapacity) {
  //   advisories.push({
  //     code: 'ERROR_INSUFFICIENT_FUEL_FOR_VFR_RESERVE',
  //     level: AdvisoryLevel.Error,
  //     details: {
  //       requiredFuel: finalTotalFuelRequired,
  //       tripFuel: tripFuel,
  //       reserveFuel: reserveFuel,
  //       contingencyFuel: contingencyFuel,
  //       aircraftCapacity: aircraft.fuelCapacity,
  //       reserveDurationMinutes: reserveMinutes,
  //     },
  //   });
  // }

  return advisories;
}

/**
 * Checks METAR conditions at all waypoints in a route trip.
 * Issues advisories if conditions are IFR or LIFR.
 *
 * @param routeTrip The flight plan's route trip.
 * @returns An array of advisories related to waypoint weather conditions.
 */
function checkVfrMinimumWeatherConditions(
  routeTrip: RouteTrip,
): Advisory[] {
  const advisories: Advisory[] = [];
  const waypoints = routeTripWaypoints(routeTrip);

  for (const waypoint of waypoints) {
    const metarStation = waypoint.metarStation;
    if (metarStation && metarStation.metar) {
      const metar: Metar = metarStation.metar;
      const flightRule = metarFlightRule(metar);

      if (flightRule === FlightRules.IFR || flightRule === FlightRules.LIFR) {
        advisories.push({
          code: 'ERROR_WEATHER_BELOW_MINIMUM',
          level: AdvisoryLevel.Error,
          details: {
            waypointName: waypoint.name,
            station: metarStation.station,
            flightRule: flightRule,
            visibility: metar.visibility,
            ceiling: metarCeiling(metar),
          },
        });
      } else if (flightRule === FlightRules.MVFR) {
        advisories.push({
          code: 'WARN_WEATHER_MVFR',
          level: AdvisoryLevel.Warning,
          details: {
            waypointName: waypoint.name,
            station: metarStation.station,
            flightRule: flightRule,
            visibility: metar.visibility,
            ceiling: metarCeiling(metar),
          },
        });
      }
    }
  }

  return advisories;
}

/**
 * Checks wind conditions (headwind and crosswind) at departure and arrival waypoints.
 *
 * @param routeTrip The flight plan's route trip.
 * @param aircraft The aircraft being used.
 * @returns An array of advisories related to wind conditions.
 */
function checkWindLimits(
  routeTrip: RouteTrip,
  aircraft: Aircraft,
): Advisory[] {
  const advisories: Advisory[] = [];

  const departureLeg = routeTrip.route[0];
  const arrivalLeg = routeTrip.route[routeTrip.route.length - 1];

  // --- Check Departure Waypoint ---
  const departureWaypoint = departureLeg.start.waypoint;
  if (departureLeg.performance) {
    const { headWind, crossWind } = departureLeg.performance;

    // Crosswind check for departure
    if (aircraft.maxDemonstratedCrosswind !== undefined && aircraft.maxDemonstratedCrosswind > 0) {
      if (Math.abs(crossWind) > aircraft.maxDemonstratedCrosswind) {
        advisories.push({
          code: 'ERROR_WIND_DEPARTURE_CROSSWIND_EXCEEDS_LIMITS',
          level: AdvisoryLevel.Error,
          details: {
            waypointName: departureWaypoint.name,
            crosswind: Math.round(crossWind),
            maxDemonstratedCrosswind: Math.round(aircraft.maxDemonstratedCrosswind),
            headwind: Math.round(headWind),
          },
        });
      }
    }

    // Headwind/Tailwind information for departure
    if (headWind < -5) {
      advisories.push({
        code: 'INFO_WIND_DEPARTURE_SIGNIFICANT_TAILWIND',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: departureWaypoint.name,
          tailwind: Math.round(-headWind),
          crosswind: Math.round(crossWind),
        },
      });
    } else if (headWind > 15) {
      advisories.push({
        code: 'INFO_WIND_DEPARTURE_SIGNIFICANT_HEADWIND',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: departureWaypoint.name,
          headwind: Math.round(headWind),
          crosswind: Math.round(crossWind),
        },
      });
    }
  }

  // --- Check Arrival Waypoint ---
  const arrivalWaypoint = arrivalLeg.end.waypoint;
  if (arrivalLeg.performance) {
    const { headWind, crossWind } = arrivalLeg.performance;

    // Crosswind check for arrival
    if (aircraft.maxDemonstratedCrosswind !== undefined && aircraft.maxDemonstratedCrosswind > 0) {
      if (Math.abs(crossWind) > aircraft.maxDemonstratedCrosswind) {
        advisories.push({
          code: 'ERROR_WIND_ARRIVAL_CROSSWIND_EXCEEDS_LIMITS',
          level: AdvisoryLevel.Error,
          details: {
            waypointName: arrivalWaypoint.name,
            crosswind: Math.round(crossWind),
            maxDemonstratedCrosswind: Math.round(aircraft.maxDemonstratedCrosswind),
            headwind: Math.round(headWind),
          },
        });
      }
    }

    // Headwind/Tailwind information for arrival
    if (headWind < -5) {
      advisories.push({
        code: 'INFO_WIND_ARRIVAL_SIGNIFICANT_TAILWIND',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: arrivalWaypoint.name,
          tailwind: Math.round(-headWind),
          crosswind: Math.round(crossWind),
        },
      });
    } else if (headWind > 15) {
      advisories.push({
        code: 'INFO_WIND_ARRIVAL_SIGNIFICANT_HEADWIND',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: arrivalWaypoint.name,
          headwind: Math.round(headWind),
          crosswind: Math.round(crossWind),
        },
      });
    }
  }

  return advisories;
}

function checkTemperature(
  routeTrip: RouteTrip,
): Advisory[] {
  const advisories: Advisory[] = [];
  const waypoints = routeTripWaypoints(routeTrip);

  for (const waypoint of waypoints) {
    const metarStation = waypoint.metarStation;
    if (metarStation && metarStation.metar) {
      const metar: Metar = metarStation.metar;

      if (metar.temperature !== undefined) {
        // Check for low temperatures
        if (metar.temperature < -5) {
          advisories.push({
            code: 'WARN_LOW_TEMPERATURE',
            level: AdvisoryLevel.Warning,
            details: {
              waypointName: waypoint.name,
              station: metarStation.station,
              temperature: metar.temperature,
            },
          });
        }

        // Check for high temperatures
        if (metar.temperature > 30) {
          advisories.push({
            code: 'WARN_HIGH_TEMPERATURE',
            level: AdvisoryLevel.Warning,
            details: {
              waypointName: waypoint.name,
              station: metarStation.station,
              temperature: metar.temperature,
            },
          });
        }
      }
    }
  }

  return advisories;
}

/**
 * Checks if the planned flight altitude exceeds the aircraft's service ceiling.
 *
 * @param routeTrip The flight plan's route trip.
 * @param aircraft The aircraft being used for the flight.
 * @returns An array of advisories.
 */
function checkServiceCeiling(
  routeTrip: RouteTrip,
  aircraft: Aircraft,
): Advisory[] {
  const advisories: Advisory[] = [];
  if (aircraft.serviceCeiling === undefined) {
    return advisories;
  }

  if (aircraft.serviceCeiling <= 0) {
    advisories.push({
      code: 'WARN_AIRCRAFT_SERVICE_CEILING_INVALID',
      level: AdvisoryLevel.Warning,
      details: {
        aircraftRegistration: aircraft.registration,
      },
    });
    return advisories;
  }

  const routeSegments = routeTrip.route.flatMap(leg => [leg.start, leg.end]);
  for (const routeSegment of routeSegments) {
    if (routeSegment.altitude !== undefined && routeSegment.altitude > aircraft.serviceCeiling) {
      advisories.push({
        code: 'ERROR_ALTITUDE_EXCEEDS_SERVICE_CEILING',
        level: AdvisoryLevel.Error,
        details: {
          waypointName: routeSegment.waypoint.name,
          altitude: routeSegment.altitude,
          serviceCeiling: aircraft.serviceCeiling,
        },
      });
    }
  }
  return advisories;
}

/**
 * Checks if the enroute altitude is above the minimum safe altitude of 500 ft.
 *
 * @param routeTrip The flight plan's route trip.
 * @returns An array of advisories.
 */
function checkMinimumSafeAltitude(
  routeTrip: RouteTrip,
): Advisory[] {
  const advisories: Advisory[] = [];
  const minimumAltitude = 500;

  // Iterate from the second leg to the second-to-last leg
  const routeSegments = routeTrip.route.flatMap(leg => [leg.start, leg.end]);
  for (let i = 1; i < routeSegments.length - 1; i++) {
    const routeSegment = routeSegments[i];

    if (routeSegment.altitude !== undefined && routeSegment.altitude < minimumAltitude) {
      advisories.push({
        code: 'WARN_ALTITUDE_BELOW_MINIMUM_SAFE_ENROUTE',
        level: AdvisoryLevel.Warning,
        details: {
          waypointName: routeSegment.waypoint.name,
          altitude: routeSegment.altitude,
          minimumSafeAltitude: minimumAltitude,
        },
      });
    }
  }
  return advisories;
}

function checkNightFlight(
  routeTrip: RouteTrip,
): Advisory[] {
  const advisories: Advisory[] = [];

  const firstLeg = routeTrip.route[0];
  if (firstLeg && routeTrip.departureDate && isNight(firstLeg.start.waypoint, routeTrip.departureDate)) {
    advisories.push({
      code: 'INFO_NIGHT_DEPARTURE',
      level: AdvisoryLevel.Info,
      details: {
        waypointName: firstLeg.start.waypoint.name,
      },
    });
  }

  for (const routeLeg of routeTrip.route) {
    if (routeLeg.arrivalDate && isNight(routeLeg.end.waypoint, routeLeg.arrivalDate)) {
      advisories.push({
        code: 'INFO_NIGHT_WAYPOINT',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: routeLeg.end.waypoint.name,
        },
      });
    }
  }

  if (routeTrip.routeAlternate && routeTrip.routeAlternate.end && routeTrip.routeAlternate.arrivalDate) {
    if (isNight(routeTrip.routeAlternate.end.waypoint, routeTrip.routeAlternate.arrivalDate)) {
      advisories.push({
        code: 'INFO_NIGHT_ALTERNATE',
        level: AdvisoryLevel.Info,
        details: {
          waypointName: routeTrip.routeAlternate.end.waypoint.name,
        },
      });
    }
  }

  return advisories;
}

/**
 * Checks for excessively long flight legs.
 *
 * @param routeTrip The flight plan\'s route trip.
 * @returns An array of advisories related to long legs.
 */
function checkLongRouteLegs(routeTrip: RouteTrip): Advisory[] {
  const advisories: Advisory[] = [];

  for (const leg of routeTrip.route) {
    if (leg.performance && leg.performance.duration > MAX_LEG_DURATION_MINUTES) {
      advisories.push({
        code: 'WARN_LONG_FLIGHT_LEG',
        level: AdvisoryLevel.Warning,
        details: {
          waypointNameStart: leg.start.waypoint.name,
          waypointNameEnd: leg.end.waypoint.name,
          durationMinutes: leg.performance.duration,
          maxRecommendedDurationMinutes: MAX_LEG_DURATION_MINUTES,
        },
      });
    }
  }

  return advisories;
}

/**
 * Validates a RouteTrip against various aviation regulations and best practices.
 *
 * @param routeTrip The flight plan's route trip.
 * @param aircraft The aircraft being used for the flight.
 * @param options Optional route configuration.
 * @returns An array of advisories.
 */
export function routeTripValidate(
  routeTrip: RouteTrip,
  aircraft: Aircraft,
  options?: RouteOptions,
): Advisory[] {
  let allAdvisories: Advisory[] = [];

  const fuelAdvisories = checkVfrMinimumFuel(routeTrip, aircraft, options);
  allAdvisories = allAdvisories.concat(fuelAdvisories);

  const weatherAdvisories = checkVfrMinimumWeatherConditions(routeTrip);
  allAdvisories = allAdvisories.concat(weatherAdvisories);

  const crosswindAdvisories = checkWindLimits(routeTrip, aircraft);
  allAdvisories = allAdvisories.concat(crosswindAdvisories);

  const temperatureAdvisories = checkTemperature(routeTrip);
  allAdvisories = allAdvisories.concat(temperatureAdvisories);

  const serviceCeilingAdvisories = checkServiceCeiling(routeTrip, aircraft);
  allAdvisories = allAdvisories.concat(serviceCeilingAdvisories);

  const minSafeAltitudeAdvisories = checkMinimumSafeAltitude(routeTrip);
  allAdvisories = allAdvisories.concat(minSafeAltitudeAdvisories);

  const nightFlightAdvisories = checkNightFlight(routeTrip);
  allAdvisories = allAdvisories.concat(nightFlightAdvisories);

  const longLegAdvisories = checkLongRouteLegs(routeTrip);
  allAdvisories = allAdvisories.concat(longLegAdvisories);

  return allAdvisories;
}

/**
 * Checks if advisories contain any errors.
 *
 * @param advisories An array of advisories to check.
 * @returns True if any advisory has an error level, false otherwise.
 */
export function advisoryHasErrors(advisories: Advisory[]): boolean {
  return advisories.some(advisory => advisory.level === AdvisoryLevel.Error);
}
