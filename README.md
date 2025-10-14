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

```typescript
import {
  PlannerService,
  AerodromeService,
  WeatherService,
  WaypointResolver,
  WaypointType,
  calculateNavLog,
} from "flight-planner";

// Initialize services with your repositories
const aerodromeService = new AerodromeService(aerodromeRepository);
const weatherService = new WeatherService(weatherRepository);

// Create planner service with default resolvers (ICAO and coordinates)
const plannerService = new PlannerService(aerodromeService, weatherService);

// Parse a route string and attach weather data
const waypoints = await plannerService.parseRouteString("EGLL EHAM");
await plannerService.attachWeatherToWaypoints(waypoints);

// Or use the lower-level calculateNavLog function for direct calculations
const navLog = calculateNavLog({
  segments: [
    /* your segments */
  ],
  aircraft: myAircraft,
});
```

#### Custom Waypoint Resolvers

You can extend the route parser with custom waypoint resolvers to support additional formats like IATA codes, VORs, NDBs, or IFR waypoints:

```typescript
import { WaypointResolver, WaypointType } from "flight-planner";

// Example: Custom IATA resolver
class IATAResolver implements WaypointResolver {
  constructor(private aerodromeService: AerodromeService) {}

  async resolve(part: string): Promise<WaypointType | null> {
    // Check if it's a 3-letter code (potential IATA)
    if (/^[A-Z]{3}$/.test(part)) {
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
  constructor(private navaidService: NavaidService) {}

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
const plannerService = new PlannerService(aerodromeService, weatherService, [
  new IATAResolver(aerodromeService),
  new NavaidResolver(navaidService),
  // Add more custom resolvers as needed
]);

// Now you can use IATA codes and navaids in your route strings
const waypoints = await plannerService.parseRouteString(
  "JFK VOR123 LAX" // IATA codes and VOR
);
await plannerService.attachWeatherToWaypoints(waypoints);

// Calculate navigation log with the waypoints
const navLog = calculateNavLog({
  segments: waypoints.map((wp) => ({ waypoint: wp })),
  aircraft: myAircraft,
  altitude: 3500,
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
