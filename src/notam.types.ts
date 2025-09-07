import { ICAO } from './index.js';

/**
 * Enumeration representing NOTAM classification types.
 *
 * @enum {string}
 * @readonly
 * @property {string} A - Airspace Restrictions
 * @property {string} C - Communications/Navigation Aids
 * @property {string} F - Facilities
 * @property {string} I - Instrument Approach Procedures
 * @property {string} M - Miscellaneous
 * @property {string} N - Navigation Warnings
 * @property {string} O - Obstacles
 * @property {string} R - Runways/Taxiways
 * @property {string} S - Services
 * @property {string} W - Warnings
 */
export enum NotamType {
  A = 'A', // Airspace Restrictions
  C = 'C', // Communications/Navigation Aids
  F = 'F', // Facilities
  I = 'I', // Instrument Approach Procedures
  M = 'M', // Miscellaneous
  N = 'N', // Navigation Warnings
  O = 'O', // Obstacles
  R = 'R', // Runways/Taxiways
  S = 'S', // Services
  W = 'W', // Warnings
}

/**
 * Enumeration representing NOTAM scope.
 *
 * @enum {string}
 * @readonly
 * @property {string} A - Aerodrome
 * @property {string} E - En-route
 * @property {string} W - Warning
 * @property {string} K - Checklist
 */
export enum NotamScope {
  A = 'A', // Aerodrome
  E = 'E', // En-route
  W = 'W', // Warning
  K = 'K', // Checklist
}

/**
 * Enumeration representing NOTAM priority levels.
 *
 * @enum {string}
 * @readonly
 * @property {string} URGENT - Urgent NOTAM
 * @property {string} NORMAL - Normal NOTAM
 * @property {string} FIR - Flight Information Region NOTAM
 */
export enum NotamPriority {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
  FIR = 'FIR',
}

/**
 * Represents geographical coordinates for NOTAM location.
 *
 * @interface NotamCoordinates
 * @property {number} latitude - Latitude in decimal degrees
 * @property {number} longitude - Longitude in decimal degrees
 * @property {number} [radius] - Radius of affected area in nautical miles (optional)
 */
export interface NotamCoordinates {
  latitude: number;
  longitude: number;
  radius?: number; // in nautical miles
}

/**
 * Represents the schedule information for a NOTAM.
 *
 * @interface NotamSchedule
 * @property {Date} effectiveFrom - When the NOTAM becomes effective
 * @property {Date} [effectiveUntil] - When the NOTAM expires (optional for permanent NOTAMs)
 * @property {string} [schedule] - Specific schedule pattern (e.g., "0600-2200 DAILY", "MON-FRI 0800-1700")
 * @property {boolean} [estimated] - Whether the times are estimated
 * @property {boolean} [permanent] - Whether this is a permanent NOTAM
 */
export interface NotamSchedule {
  effectiveFrom: Date;
  effectiveUntil?: Date;
  schedule?: string;
  estimated?: boolean;
  permanent?: boolean;
}

/**
 * Represents a NOTAM (Notice to Airmen) containing important aeronautical information.
 *
 * NOTAMs provide pilots and flight planners with information about aeronautical facilities,
 * services, procedures, or hazards that may affect flight operations.
 *
 * @interface Notam
 * @property {string} id - Unique NOTAM identifier (e.g., "A0123/24")
 * @property {ICAO} [icao] - ICAO code of the associated aerodrome or facility (optional)
 * @property {NotamType} type - Classification type of the NOTAM
 * @property {NotamScope} scope - Scope of the NOTAM (aerodrome, en-route, etc.)
 * @property {NotamPriority} priority - Priority level of the NOTAM
 * @property {string} subject - Brief subject line describing the NOTAM content
 * @property {string} text - Full text content of the NOTAM
 * @property {string} [condition] - Condition being reported (Item C in NOTAM format)
 * @property {NotamCoordinates} [coordinates] - Geographical location affected by the NOTAM
 * @property {number} [lowerLimit] - Lower altitude limit in feet (optional)
 * @property {number} [upperLimit] - Upper altitude limit in feet (optional)
 * @property {NotamSchedule} schedule - Effective dates and times
 * @property {Date} issued - When the NOTAM was issued
 * @property {string} [source] - Source of the NOTAM (e.g., "NOTAM Office", "ATC")
 * @property {string} raw - Original raw NOTAM text as received
 * @property {string} [series] - NOTAM series identifier (e.g., "A", "B", "C")
 * @property {number} [number] - NOTAM number within the series
 * @property {number} [year] - Year of issuance
 * @property {string} [replacement] - ID of NOTAM being replaced (if applicable)
 * @property {string[]} [cancels] - Array of NOTAM IDs being canceled by this NOTAM
 */
export interface Notam {
  readonly id: string;
  readonly icao?: ICAO;
  readonly type: NotamType;
  readonly scope: NotamScope;
  readonly priority: NotamPriority;
  readonly subject: string;
  readonly text: string;
  readonly condition?: string;
  readonly coordinates?: NotamCoordinates;
  readonly lowerLimit?: number; // in feet
  readonly upperLimit?: number; // in feet
  readonly schedule: NotamSchedule;
  readonly issued: Date;
  readonly source?: string;
  readonly raw: string;
  readonly series?: string;
  readonly number?: number;
  readonly year?: number;
  readonly replacement?: string;
  readonly cancels?: string[];
}

/**
 * Represents a collection of NOTAMs for a specific location or area.
 *
 * @interface NotamCollection
 * @property {ICAO} [icao] - ICAO code if NOTAMs are for a specific aerodrome
 * @property {string} [location] - Human-readable location name
 * @property {Notam[]} notams - Array of NOTAMs
 * @property {Date} retrievedAt - When the NOTAMs were retrieved
 * @property {string} [source] - Source system or provider of the NOTAMs
 */
export interface NotamCollection {
  readonly icao?: ICAO;
  readonly location?: string;
  readonly notams: Notam[];
  readonly retrievedAt: Date;
  readonly source?: string;
}

/**
 * Represents filtering options for NOTAM queries.
 *
 * @interface NotamFilter
 * @property {ICAO[]} [icaos] - Filter by specific ICAO codes
 * @property {NotamType[]} [types] - Filter by NOTAM types
 * @property {NotamScope[]} [scopes] - Filter by NOTAM scopes
 * @property {NotamPriority[]} [priorities] - Filter by priority levels
 * @property {Date} [effectiveFrom] - Only include NOTAMs effective from this date
 * @property {Date} [effectiveUntil] - Only include NOTAMs effective until this date
 * @property {boolean} [activeOnly] - Only include currently active NOTAMs
 * @property {NotamCoordinates} [withinArea] - Filter by geographical area
 * @property {number} [altitudeMin] - Minimum altitude filter in feet
 * @property {number} [altitudeMax] - Maximum altitude filter in feet
 */
export interface NotamFilter {
  icaos?: ICAO[];
  types?: NotamType[];
  scopes?: NotamScope[];
  priorities?: NotamPriority[];
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  activeOnly?: boolean;
  withinArea?: NotamCoordinates;
  altitudeMin?: number;
  altitudeMax?: number;
}
