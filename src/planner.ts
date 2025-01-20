import calculateFlightPerformance, { Aircraft, AircraftPerformance } from './aircraft';
import { Aerodrome, ReportingPoint, Waypoint } from './airport';
import { lineString, point } from '@turf/turf';
import { featureCollection } from '@turf/helpers';

export interface RouteLeg {
  start: Waypoint;
  end: Waypoint;
  distance: number;
  trueTrack: number;
  windDirection: number | undefined;
  windSpeed: number | undefined;
  performance?: AircraftPerformance;
}

export interface RouteTrip {
  route: RouteLeg[];
  totalDistance: number;
  totalDuration: number;
  totalFuelConsumption?: number;
}

export function routePlan(waypoints: (Aerodrome | ReportingPoint | Waypoint)[], aircraft?: Aircraft): RouteTrip {
  const legs = waypoints.slice(0, -1).map((startWaypoint, i) => {
    const endWaypoint = waypoints[i + 1];

    const distance = startWaypoint.getDistanceTo(endWaypoint);
    const trueTrack = startWaypoint.getHeadingTo(endWaypoint);

    let wind = { direction: 0, speed: 0 };

    if (startWaypoint.metarStation?.metarData.windDirection && startWaypoint.metarStation?.metarData.windSpeed) {
      wind = { direction: startWaypoint.metarStation.metarData.windDirection, speed: startWaypoint.metarStation.metarData.windSpeed };
    }
    return {
      start: startWaypoint,
      end: endWaypoint,
      distance: distance,
      trueTrack: trueTrack,
      windDirection: wind.direction,
      windSpeed: wind.speed,
      performance: aircraft ? calculateFlightPerformance(aircraft, distance, trueTrack, wind) : undefined,
    };
  });

  return {
    route: legs,
    totalDistance: legs.reduce((acc, leg) => acc + leg.distance, 0),
    totalDuration: legs.reduce((acc, leg) => acc + (leg.performance?.duration || 0), 0),
    totalFuelConsumption: legs.reduce((acc, leg) => acc + (leg.performance?.fuelConsumption || 0), 0),
  };
}

export function routePlanFeatureCollection(routeTrip: RouteTrip): GeoJSON.FeatureCollection {
  return featureCollection(routeTrip.route.map(leg => {
    return lineString([leg.start.location.geometry.coordinates, leg.end.location.geometry.coordinates], {
      start: leg.start.name,
      end: leg.end.name,
      distance: Math.round(leg.distance),
      trueTrack: Math.round(leg.trueTrack),
      // TODO: Add more properties
    });
  }));
}

export function waypointFeatureCollection(waypoints: (Aerodrome | ReportingPoint | Waypoint)[]): GeoJSON.FeatureCollection {
  return featureCollection(waypoints.map(waypoint => {
    return point(waypoint.location.geometry.coordinates, {
      name: waypoint.toString(),
    });
  }));
}

// TODO: Maybe leave this the caller code
// export function bbox(waypoints: (Aerodrome | ReportingPoint | Waypoint)[]): [number, number, number, number] {
//   return turf.bbox(waypointFeatureCollection(waypoints)).slice(0, 4) as [number, number, number, number];
// }
