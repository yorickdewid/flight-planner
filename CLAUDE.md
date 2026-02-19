# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript library for VFR flight planning and aviation weather data processing, published to npm as `flight-planner`. ESM-only package targeting Node.js >= 20.

## Commands

```bash
pnpm run build          # TypeScript compile + lint
pnpm run lint           # ESLint only
pnpm run lint:fix       # ESLint with auto-fix
pnpm test               # Run all tests
pnpm test -- metar      # Run a single test file by name
```

Tests use Vitest with globals enabled. Test files live alongside source in `src/` as `*.test.ts`.

## Architecture

All source is in `src/` as a flat structure (no subdirectories). The library is organized around these key modules:

- **`planner.ts`** — `PlannerService` with a chain-of-responsibility pattern for resolving route strings into waypoints. `ServiceBase<T>` is the abstract class users must implement to provide aerodrome/navaid data. Built-in resolvers: `ICAOResolver`, `CoordinateResolver` (WP(lat,lng) format), `NavaidResolver`. Factory: `createDefaultPlannerService()`.

- **`navigation.ts`** — Core flight calculation engine. `calculateNavLog()` takes route segments + aircraft performance and produces a `RouteTrip` with legs containing wind corrections, groundspeed, fuel burn, and timing. Helper functions for VFR cruising altitude (semicircular rule), closest waypoint/leg finding.

- **`advisor.ts`** — Route validation that produces `Advisory[]` with severity levels (Info/Warning/Error). Checks: VFR weather minimums, crosswind limits, temperature, service ceiling, minimum safe altitude, night flight, long legs.

- **`metar.ts`** — METAR string parsing (wraps `metar-taf-parser`), flight rules determination, expiration checks, color codes. All wind speeds normalized to knots, visibility to meters, pressure to hPa internally.

- **`waypoint.ts`** — Waypoint utilities including distance/heading calculations (via `@turf/turf`), runway wind vector analysis, QFE calculation, type guards via `isWaypointType()`.

- **`units.ts`** — Unit conversion wrappers around `convert-units` for aviation-specific measurements. Default units defined in `constants.ts`.

- **`aircraft.ts`** — `Aircraft` interface and utility functions (registration validation, range/endurance calculations).

- **`index.ts`** — Public API barrel export. The package also exposes sub-path exports: `flight-planner/aircraft`, `flight-planner/units`, `flight-planner/utils`, `flight-planner/format`, `flight-planner/planner`.

## Key Patterns

- **Coordinates are GeoJSON [longitude, latitude]** — not [lat, lng]. The `Waypoint.coords` field follows this convention.
- **Internal units**: wind in knots, visibility in meters, pressure in hPa, altitude in feet, distance in nautical miles.
- **`WaypointVariant` enum** discriminates waypoint types (Aerodrome, Waypoint, ReportingPoint) — use `isWaypointType()` for type narrowing.
- **`RouteSegment`** wraps a waypoint with optional altitude; segments are the input to `calculateNavLog()`.

## Lint Rules

ESLint enforces strict TypeScript rules:
- `explicit-function-return-type` and `explicit-module-boundary-types` are **required**
- `no-explicit-any` is an error
- `no-floating-promises` is an error
- Unused vars prefixed with `_` are allowed
