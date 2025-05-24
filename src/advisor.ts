// - VFR Minimum Fuel Reserves (SERA.OP.MPA.150/NCO.OP.125-like)
// - Fuel for Alternate Aerodrome
// - Crosswind Limitations
// - Check wind and gust
// - Check service ceiling
// - Check runway length
// - Check weight & balance
// - Minimum Safe Altitude (SERA.5005.f / NCO.OP.145): Enroute altitude > 500 ft
// - Minimum Safe Altitude (SERA.5005.f / NCO.OP.145): Enroute altitude > 1000 ft above highest obstacle within 500 M
// - Low temparature warning
// - Flight plan for controlled airspace

import { Aircraft } from './aircraft.js';
import { RouteTrip, RouteOptions } from './planner.js';
import { FlightPlanner, FlightRules } from './index.js';
import { metarFlightRule, metarCeiling, Metar } from './metar.js';

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
 * @property {string} message - A human-readable message describing the advisory.
 * @property {AdvisoryLevel} level - The severity level of the advisory.
 * @property {any} [details] - Optional additional details about the advisory.
 */
export interface Advisory {
  code: string;
  message: string;
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
  routeTrip: RouteTrip,
  aircraft: Aircraft,
  options?: RouteOptions,
): Advisory[] {
  const advisories: Advisory[] = [];
  const reserveMinutes = options?.reserveFuelDuration ?? 30; // Default to 30 minutes

  if (!aircraft.fuelConsumption || aircraft.fuelConsumption <= 0) {
    advisories.push({
      code: 'AIRCRAFT_FUEL_CONSUMPTION_INVALID',
      message: 'Aircraft fuel consumption rate is not defined or invalid.',
      level: AdvisoryLevel.Error,
      details: { fuelConsumption: aircraft.fuelConsumption },
    });
    return advisories;
  }

  const tripFuel = routeTrip.totalFuelConsumption;
  if (tripFuel === undefined || tripFuel === null) {
    advisories.push({
      code: 'TRIP_FUEL_MISSING',
      message: 'Total trip fuel consumption is not calculated in the RouteTrip.',
      level: AdvisoryLevel.Warning,
    });
    return advisories;
  }

  const reserveFuel = (reserveMinutes / 60) * aircraft.fuelConsumption; // Reserve fuel in liters
  const totalFuelRequired = tripFuel + reserveFuel;

  // Add taxi, takeoff, landing fuel if specified in options
  let contingencyFuel = 0;
  if (options?.taxiFuel) contingencyFuel += options.taxiFuel;
  if (options?.takeoffFuel) contingencyFuel += options.takeoffFuel;
  if (options?.landingFuel) contingencyFuel += options.landingFuel;

  const finalTotalFuelRequired = totalFuelRequired + contingencyFuel;

  if (routeTrip.totalFuelRequired !== undefined && Math.abs(routeTrip.totalFuelRequired - finalTotalFuelRequired) > 0.1) {
    advisories.push({
      code: 'TOTAL_FUEL_MISMATCH',
      message: `RouteTrip.totalFuelRequired (${routeTrip.totalFuelRequired?.toFixed(2)}L) does not match calculated required fuel including reserves and contingencies (${finalTotalFuelRequired.toFixed(2)}L). Using calculated value for checks.`,
      level: AdvisoryLevel.Warning,
      details: { routeTripValue: routeTrip.totalFuelRequired, calculatedValue: finalTotalFuelRequired }
    });
  }

  if (!aircraft.fuelCapacity || aircraft.fuelCapacity <= 0) {
    advisories.push({
      code: 'AIRCRAFT_FUEL_CAPACITY_INVALID',
      message: 'Aircraft fuel capacity is not defined or invalid.',
      level: AdvisoryLevel.Error,
      details: { fuelCapacity: aircraft.fuelCapacity },
    });
    return advisories;
  }

  if (finalTotalFuelRequired > aircraft.fuelCapacity) {
    advisories.push({
      code: 'INSUFFICIENT_FUEL_FOR_VFR_RESERVE',
      message: `Insufficient fuel for the trip plus VFR reserves. Required: ${finalTotalFuelRequired.toFixed(2)}L, Capacity: ${aircraft.fuelCapacity.toFixed(2)}L.`,
      level: AdvisoryLevel.Error,
      details: {
        requiredFuel: finalTotalFuelRequired,
        tripFuel: tripFuel,
        reserveFuel: reserveFuel,
        contingencyFuel: contingencyFuel,
        aircraftCapacity: aircraft.fuelCapacity,
        reserveDurationMinutes: reserveMinutes,
      },
    });
  }

  return advisories;
}

/**
 * Checks METAR conditions at all waypoints in a route trip.
 * Issues advisories if conditions are IFR or LIFR.
 *
 * @param routeTrip The flight plan's route trip.
 * @returns An array of advisories related to waypoint weather conditions.
 */
function checkWaypointMetarConditions(
  routeTrip: RouteTrip,
): Advisory[] {
  const advisories: Advisory[] = [];
  const waypoints = FlightPlanner.getRouteWaypoints(routeTrip);

  for (const waypoint of waypoints) {
    const metarStation = waypoint.metarStation;
    if (metarStation && metarStation.metar) {
      const metar: Metar = metarStation.metar;
      const flightRule = metarFlightRule(metar);

      if (flightRule === FlightRules.IFR || flightRule === FlightRules.LIFR) {
        advisories.push({
          code: 'WAYPOINT_WEATHER_BELOW_MVFR',
          message: `Weather conditions at waypoint '${waypoint.name}' (${metarStation.station}) are ${flightRule}, which is below MVFR.`,
          level: AdvisoryLevel.Error,
          details: {
            waypointName: waypoint.name,
            station: metarStation.station,
            flightRule: flightRule,
            visibility: metar.visibility,
            ceiling: metarCeiling(metar),
            rawMetar: metar.raw,
          },
        });
      }
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
export function validateRouteTrip(
  routeTrip: RouteTrip,
  aircraft: Aircraft,
  options?: RouteOptions,
): Advisory[] {
  let allAdvisories: Advisory[] = [];

  const fuelAdvisories = checkVfrMinimumFuel(routeTrip, aircraft, options);
  allAdvisories = allAdvisories.concat(fuelAdvisories);

  const metarAdvisories = checkWaypointMetarConditions(routeTrip);
  allAdvisories = allAdvisories.concat(metarAdvisories);

  // --- Future checks can be added below ---
  // e.g., Crosswind Limitations
  // const crosswindAdvisories = checkCrosswindLimits(routeTrip, aircraft);
  // allAdvisories = allAdvisories.concat(crosswindAdvisories);

  return allAdvisories;
}