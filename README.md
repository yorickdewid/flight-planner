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
import { createMetarFromString, metarFlightRule, FlightRules } from 'flight-planner';

// Parse METAR data
const metar = createMetarFromString('METAR EGLL 291020Z 24015KT 9999 SCT040 18/09 Q1022');
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
import { createMetarFromString, formatWind, isMetarExpired } from 'flight-planner/metar';

const metar = createMetarFromString(rawMetarString);
const windDescription = formatWind(metar.wind);
const isExpired = isMetarExpired(metar);
```

### Flight Planning

```typescript
import { createFlightPlanFromString, flightPlan } from 'flight-planner/planner';

const route = createFlightPlanFromString('EGLL DCT EHAM');
const plan = flightPlan(route, options);
```

### Unit Conversion

```typescript
import { convertSpeed, convertDistance, UnitOptions } from 'flight-planner/units';

const speedInKnots = convertSpeed(100, { speed: 'kt' }); // Convert from default m/s
const distanceInNM = convertDistance(1000, { distance: 'nmi' }); // Convert from default meters
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
