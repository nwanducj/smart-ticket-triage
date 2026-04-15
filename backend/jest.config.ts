/**
 * Jest Configuration for Smart Triage Backend
 *
 * Uses ts-jest so tests are written in TypeScript without a separate compile
 * step. The in-memory MongoDB server (see test/setup.ts) keeps tests
 * isolated and fast — no external database dependency.
 */

import type { Config } from 'jest';

const config: Config = {
  // ts-jest preset transforms .ts files using the TypeScript compiler,
  // giving us full type-checking in tests without a build step.
  preset: 'ts-jest',

  // Node environment — we're testing a backend, not a browser app.
  testEnvironment: 'node',

  // Restrict scanning to src/ to avoid picking up compiled JS in dist/.
  roots: ['<rootDir>/src'],

  // Match .test.ts files anywhere in the src/ tree.
  testMatch: ['**/*.test.ts'],

  // Runs after the test framework is installed but before any test suite.
  // Our setup.ts starts an in-memory MongoDB and connects Mongoose.
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Translate the @/* path alias from tsconfig.json so Jest can resolve it.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 30s timeout — generous but necessary for first-run MongoDB binary
  // download and slow CI machines.
  testTimeout: 30_000,

  // Coverage collection settings.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
  ],
};

export default config;
