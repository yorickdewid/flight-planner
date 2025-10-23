# Flight Planner

A comprehensive TypeScript library for VFR flight planning and aviation weather data processing.

## Features

- **Flight Planning**: Route planning and waypoint management
- **Weather Data**: METAR parsing and weather station management
- **Aircraft Management**: Aircraft performance and characteristics
- **Navigation**: Waypoint utilities and aerodrome services
- **Unit Conversion**: Support for various aviation units
- **Type Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install flight-planner
```

## Quick Start

```typescript
import {
  createMetarFromString,
  metarFlightRule,
  FlightRules,
} from "flight-planner";

// Parse METAR data
const metar = createMetarFromString(
  "METAR EGLL 291020Z 24015KT 9999 SCT040 18/09 Q1022"
);
console.log(metar.station); // 'EGLL'
console.log(metar.wind?.speed); // 15

// Check flight rules
const flightRule = metarFlightRule(metar);
console.log(flightRule === FlightRules.VFR); // true or false
```

## Module Exports

This package provides several specialized exports for tree-shaking:

- `flight-planner` - Main entry point
- `flight-planner/aircraft` - Aircraft-related utilities
- `flight-planner/units` - Unit conversion functions
- `flight-planner/utils` - General utilities
- `flight-planner/format` - Formatting functions

## API Documentation

### Weather & METAR

```typescript
import {
  createMetarFromString,
  formatWind,
  isMetarExpired,
} from "flight-planner/metar";

const metar = createMetarFromString(rawMetarString);
const windDescription = formatWind(metar.wind);
const isExpired = isMetarExpired(metar);
```

### Flight Planning

The flight planner provides route parsing and navigation log calculation. You need to implement the `ServiceBase` interface to provide aerodrome data.

```typescript
import {
  ServiceBase,
  createDefaultPlannerService,
  WaypointType,
  waypointsToSegments,
  calculateNavLog,
  Aerodrome,
  ICAO,
} from "flight-planner";

// Implement the ServiceBase interface to provide aerodrome data
class MyAerodromeService extends ServiceBase<Aerodrome> {
  async findByICAO(icao: readonly ICAO[]): Promise<Aerodrome[]> {
    // Your implementation - fetch from database, API, etc.
    return await yourDatabase.getAerodromesByICAO(icao);
  }

  async findByLocation(
    location: GeoJSON.Position,
    radius: number
  ): Promise<Aerodrome[]> {
    // Your implementation - spatial query
    return await yourDatabase.getAerodromesNearLocation(location, radius);
  }
}

// Create planner service with default resolvers (ICAO and coordinates)
const aerodromeService = new MyAerodromeService();
const plannerService = createDefaultPlannerService(aerodromeService);

// Parse a route string
const waypoints = await plannerService.parseRouteString("EGLL EHAM");

// Convert waypoints to segments and calculate navigation log
const segments = waypointsToSegments(waypoints, 5500); // 5500 ft altitude
const navLog = calculateNavLog({
  segments,
  aircraft: myAircraft,
  reserveFuelDuration: 45,
});
```

#### Custom Waypoint Resolvers

You can extend the route parser with custom waypoint resolvers to support additional formats like IATA codes, VORs, NDBs, or IFR waypoints:

```typescript
import {
  WaypointResolver,
  WaypointType,
  ServiceBase,
  Aerodrome,
} from "flight-planner";

// Example: Custom IATA resolver
class IATAResolver implements WaypointResolver {
  constructor(private aerodromeService: ServiceBase<Aerodrome>) {}

  async resolve(part: string): Promise<WaypointType | null> {
    // Check if it's a 3-letter code (potential IATA)
    if (/^[A-Z]{3}$/.test(part)) {
      // Your custom logic to find by IATA code
      const airport = await this.aerodromeService.findByIATA(part);
      if (airport) {
        return airport;
      }
    }
    return null; // Not handled by this resolver
  }
}

// Example: VOR/NDB resolver
class NavaidResolver implements WaypointResolver {
  constructor(private navaidService: YourNavaidService) {}

  async resolve(part: string): Promise<WaypointType | null> {
    // Check for VOR or NDB pattern
    if (/^(VOR|NDB)/.test(part)) {
      const navaid = await this.navaidService.findByIdentifier(part);
      if (navaid) {
        return navaid;
      }
    }
    return null;
  }
}

// Create planner with custom resolvers
const aerodromeService = new MyAerodromeService();
const navaidService = new MyNavaidService();

const plannerService = createDefaultPlannerService(aerodromeService, [
  new IATAResolver(aerodromeService),
  new NavaidResolver(navaidService),
  // Add more custom resolvers as needed
]);

// Now you can use IATA codes and navaids in your route strings
const waypoints = await plannerService.parseRouteString(
  "JFK VOR123 LAX" // IATA codes and VOR
);

// Calculate navigation log with the waypoints
const segments = waypointsToSegments(waypoints, 3500);
const navLog = calculateNavLog({
  segments,
  aircraft: myAircraft,
});
```

### Unit Conversion

```typescript
import {
  convertSpeed,
  convertDistance,
  UnitOptions,
} from "flight-planner/units";

const speedInKnots = convertSpeed(100, { speed: "kt" }); // Convert from default m/s
const distanceInNM = convertDistance(1000, { distance: "nmi" }); // Convert from default meters
```

## Requirements

- Node.js >= 20.0.0
- TypeScript support recommended

## License

MIT ©

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## Support

- [GitHub Issues](https://github.com/yorickdewid/flight-planner/issues)
- [Documentation](https://github.com/yorickdewid/flight-planner#readme)
