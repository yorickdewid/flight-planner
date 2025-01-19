import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest', // Use ts-jest to process TypeScript files
  testEnvironment: 'node', // If you're testing Node.js code. Use 'jsdom' for browser-like environment.
  testMatch: ['<rootDir>/src/**/*.test.ts'], // Pattern to find test files
};

export default config;