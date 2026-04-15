/**
 * Jest Configuration for Smart Triage Frontend
 *
 * Uses ts-jest with jsdom environment for React component testing.
 * Path aliases match the Next.js tsconfig so imports resolve correctly.
 */

import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 15000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      // Skip type checking in tests for speed — tsc --noEmit covers this.
      diagnostics: false,
    }],
  },
}

export default config
