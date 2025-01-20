import { Feature, Point, GeoJsonProperties } from 'geojson';
import { calculateWindVector } from './utils';
import { MetarStation } from '.';
import { bearing, bearingToAzimuth, distance } from "@turf/turf";

export type WaypointLocation = Feature<Point, GeoJsonProperties>;

export class Waypoint {
  public name: string;
  public location: WaypointLocation;
  public metarStation?: MetarStation;

  /**
   * @param name The name of the waypoint
   * @param location The location of the waypoint
   * @returns An instance of the Waypoint class
   */
  constructor(name: string, location: WaypointLocation) {
    this.name = name;
    this.location = location;
  }

  public toString(): string {
    return `${this.name}`;
  }

  public getDistanceTo(waypoint: Waypoint): number {
    const distanceInKm = distance(this.location, waypoint.location);
    const distanceInNm = distanceInKm * 0.539957; // TODO: Move to constants
    return distanceInNm;
  }

  public getHeadingTo(waypoint: Waypoint): number {
    const bearingValue = bearing(this.location, waypoint.location);
    return bearingToAzimuth(bearingValue)
  }
}

export class ReportingPoint extends Waypoint {
  public required: boolean;

  /**
   * @param name The name of the reporting point
   * @param location The location of the reporting point
   * @param required Whether the reporting point is required
   * @returns An instance of the ReportingPoint class
   */
  constructor(name: string, location: WaypointLocation, required: boolean = false) {
    super(name, location);
    this.required = required;
  }
}

export interface Runway {
  designator: string;
  heading: number;
  length?: string;
  surface?: string;
  isActive?: boolean;
}

export enum FrequencyType {
  Approach = 0,
  Arrival = 2,
  Delivery = 5,
  Ground = 9,
  Radio = 10,
  Tower = 14,
  ATIS = 15,
  Other = 17,
}

export interface Frequency {
  type: string; // TODO: Use enum
  name: string;
  value: string;
}

export interface RunwayWindVector {
  runway: Runway;
  windAngle: number;
  headwind: number;
  crosswind: number;
}

export interface AerodromeOptions {
  IATA?: string;
  frequencies?: Frequency[];
}

export class Aerodrome extends Waypoint {
  public ICAO: string;
  public runways: Runway[];
  public frequencies: Frequency[];

  /**
   * @param name The name of the airport
   * @param ICAO The ICAO code of the airport
   * @param location The location of the airport
   * @param runways The runways of the airport
   * @param frequencies The frequencies of the airport
   * @returns An instance of the Airport class
   */
  constructor(name: string, ICAO: string, location: WaypointLocation, runways: Runway[], options?: AerodromeOptions) {
    super(name, location);
    this.ICAO = ICAO;
    this.runways = runways;
    this.frequencies = options?.frequencies || [];
  }

  /**
   * @returns A string representation of the airport
   */
  public toString(): string {
    return `${this.name} (${this.ICAO})`;
  }

  /**
   * Calculates the wind vectors for all runways of the airport.
   * 
   * @returns The wind vectors for the runways in descending order of headwind
   */
  public runwayWind(): RunwayWindVector[] {
    const windDirection = this.metarStation?.metarData.windDirection ?? 0;
    const windSpeed = this.metarStation?.metarData.windSpeed ?? 0;

    return this.runways.map(runway => {
      const windVector = calculateWindVector({ direction: windDirection, speed: windSpeed }, runway.heading);
      return {
        runway,
        windAngle: windVector.angle,
        headwind: windVector.headwind,
        crosswind: windVector.crosswind,
      };
    }).sort((a, b) => b.headwind - a.headwind);
  }
}
