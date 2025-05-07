#!/usr/bin/env node

import readline from 'readline';
import {
  AerodromeService,
  Aerodrome,
  MetarStation,
  planFlightRoute
} from '../src/index.js';
import { normalizeICAO } from '../src/utils.js';
import { createMetarFromRaw } from '../src/metar.js';
import { RepositoryBase, WeatherService } from '../src/service.js';

class MockAerodromeRepository implements RepositoryBase<Aerodrome> {
  private testAerodromes: Map<string, Aerodrome> = new Map();

  constructor() {
    const ehrd = new Aerodrome({
      ICAO: 'EHRD',
      name: 'Rotterdam The Hague Airport',
      elevation: -14,
      runways: [{
        designator: "06/24",
        heading: 60,
        length: "2200m",
        surface: "Asphalt"
      }],
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [4.440533, 51.956944]
        },
        properties: {}
      }
    });

    const eham = new Aerodrome({
      ICAO: 'EHAM',
      name: 'Amsterdam Airport Schiphol',
      elevation: -11,
      runways: [{
        designator: "18R/36L",
        heading: 180,
        length: "3800m",
        surface: "Asphalt"
      }],
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [4.764167, 52.308056]
        },
        properties: {}
      }
    });

    const ehle = new Aerodrome({
      ICAO: 'EHLE',
      name: 'Lelystad Airport',
      elevation: -13,
      runways: [{
        designator: "05/23",
        heading: 50,
        length: "2700m",
        surface: "Asphalt"
      }],
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [5.514722, 52.453333]
        },
        properties: {}
      }
    });

    this.testAerodromes.set(normalizeICAO(ehrd.ICAO), ehrd);
    this.testAerodromes.set(normalizeICAO(eham.ICAO), eham);
    this.testAerodromes.set(normalizeICAO(ehle.ICAO), ehle);
  }

  async fetchByICAO(icao: string[]): Promise<Aerodrome[]> {
    return icao.map(code => this.testAerodromes.get(normalizeICAO(code)))
      .filter(aerodrome => aerodrome !== undefined) as Aerodrome[];
  }

  async fetchByRadius(location: GeoJSON.Position, distance: number): Promise<Aerodrome[]> {
    console.log(`Fetching aerodromes within ${distance}km of ${location}`);
    return Array.from(this.testAerodromes.values());
  }
}

class MockWeatherRepository implements RepositoryBase<MetarStation> {
  private testMetarStations: Map<string, MetarStation> = new Map();

  constructor() {
    const ehrdMetar: MetarStation = {
      station: 'EHRD',
      coords: [4.437222, 51.956944],
      metar: createMetarFromRaw('EHRD 041025Z 21012KT 9999 FEW025 12/07 Q1013')
    };

    const ehamMetar: MetarStation = {
      station: 'EHAM',
      coords: [4.764167, 52.308333],
      metar: createMetarFromRaw('EHAM 041025Z 21010KT 9999 BKN030 11/06 Q1013')
    };

    this.testMetarStations.set(normalizeICAO(ehrdMetar.station), ehrdMetar);
    this.testMetarStations.set(normalizeICAO(ehamMetar.station), ehamMetar);
  }

  async fetchByICAO(icao: string[]): Promise<MetarStation[]> {
    return icao.map(code => this.testMetarStations.get(normalizeICAO(code)))
      .filter(station => station !== undefined) as MetarStation[];
  }

  async fetchByBbox(bbox: GeoJSON.BBox): Promise<MetarStation[]> {
    return Array.from(this.testMetarStations.values());
  }
}

const weatherService = new WeatherService({
  repository: new MockWeatherRepository()
});
const aerodromeService = new AerodromeService({
  repository: new MockAerodromeRepository(),
  weatherService
});

// Create a readline interface for interactive CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display menu and process user input
function displayMenu() {
  console.log('\n========== Flight Planner CLI ==========');
  console.log('f. Find aerodrome by ICAO');
  console.log('m. Find METAR station by ICAO');
  console.log('p. Plan a flight route');
  console.log('q. Exit');
  console.log('=======================================');

  rl.question('Select an option: ', async (answer) => {
    switch (answer) {
      case 'f':
        await findAerodromeByICAO();
        break;
      case 'm':
        await findMetarStationByICAO();
        break;
      case 'p':
        await planRoute();
        break;
      case 'q':
        rl.close();
        return;
      default:
        console.log('Invalid option. Please try again.');
        displayMenu();
    }
  });
}

async function findAerodromeByICAO() {
  rl.question('Enter ICAO code: ', async (icao) => {
    try {
      const aerodrome = await aerodromeService.get(icao);
      if (aerodrome) {
        console.log('\n=== Aerodrome ===');
        console.log(`ICAO: ${aerodrome.ICAO}`);
        console.log(`Name: ${aerodrome.name}`);
        const elevation = (aerodrome as any).options?.elevation;
        if (elevation !== undefined) {
          console.log(`Elevation: ${elevation} ft`);
        }

        if (aerodrome.metarStation) {
          console.log('\n=== METAR Information ===');
          console.log(`Temperature: ${aerodrome.metarStation.metar.formatTemperature()}`);
          console.log(`Wind: ${aerodrome.metarStation.metar.formatWind()}`);
          console.log(`QNH: ${aerodrome.metarStation.metar.formatQNH()}`);
          console.log(`Flight Rules: ${aerodrome.metarStation.metar.flightRule}`);
        }
      } else {
        console.log(`No aerodrome found with ICAO code: ${icao}`);
      }
    } catch (error) {
      console.error('Error finding aerodrome:', error);
    }
    displayMenu();
  });
}

async function findMetarStationByICAO() {
  rl.question('Enter ICAO code: ', async (icao) => {
    try {
      const metarStations = await weatherService.get(icao);
      if (metarStations && metarStations.length > 0) {
        const metarStation = metarStations[0];
        console.log('\n=== METAR Station ===');
        console.log(`ICAO: ${metarStation.station}`);
        console.log(`Temperature: ${metarStation.metar.formatTemperature()}`);
        console.log(`Wind: ${metarStation.metar.formatWind()}`);
        console.log(`QNH: ${metarStation.metar.formatQNH()}`);
        console.log(`Flight Rules: ${metarStation.metar.flightRule}`);
      } else {
        console.log(`No METAR station found with ICAO code: ${icao}`);
      }
    } catch (error) {
      console.error('Error finding METAR station:', error);
    }
    displayMenu();
  });
}

async function planRoute() {
  rl.question('Enter departure ICAO: ', (departure) => {
    rl.question('Enter destination ICAO: ', async (destination) => {
      try {
        const departureAerodrome = await aerodromeService.get(departure);
        const destinationAerodrome = await aerodromeService.get(destination);

        if (!departureAerodrome || !destinationAerodrome) {
          console.log('Could not find one or both aerodromes');
          displayMenu();
          return;
        }

        console.log('Planning route...');
        const route = planFlightRoute([departureAerodrome, destinationAerodrome], {
          aircraft: {
            manufacturer: 'Cessna',
            model: '172',
            registration: 'N12345',
            cruiseSpeed: 120,
            range: 500,
            fuelCapacity: 200,
            fuelConsumption: 10,
            engineType: 'piston',
            maxTakeoffWeight: 1600,
          },
          altitude: 1500,
        });

        console.log('\n=== Overview ===');
        console.log(`${departureAerodrome.ICAO} => ${destinationAerodrome.ICAO}`);
        console.log(`ETD: ${route.departureDate?.toUTCString()}`);
        console.log(`ETA: ${route.arrivalDate?.toUTCString()}`);
        console.log(`Distance: ${Math.round(route.totalDistance)} nm`);
        console.log(`Duration: ${Math.round(route.totalDuration)} min`);
        if (route.totalFuelRequired) {
          console.log(`Fuel required: ${Math.round(route.totalFuelRequired)} L`);
        }

        console.log('\nRoute Legs:');
        route.route.forEach((leg, index) => {
          const hwStr = leg.performance?.headWind ? `${Math.round(leg.performance?.headWind)} kt` : "N/A";
          const cwStr = leg.performance?.crossWind ? `${Math.round(leg.performance?.crossWind)} kt` : "N/A";
          const kias = leg.performance?.trueAirSpeed ? `${Math.round(leg.performance?.trueAirSpeed)} kt` : "N/A";
          const gs = leg.performance?.groundSpeed ? `${Math.round(leg.performance?.groundSpeed)} kt` : "N/A";
          console.log(` Leg ${index + 1}: ${Math.round(leg.course.distance)} nm, heading ${leg.performance?.heading?.toFixed(1) ?? "N/A"}°, headwind ${hwStr}, crosswind ${cwStr}, KIAS ${kias}, GS ${gs}`);
        });
      } catch (error) {
        console.error('Error planning route:', error);
      }
      displayMenu();
    });
  });
}

console.log('Welcome to the Flight Planner CLI Testing Tool!');
displayMenu();