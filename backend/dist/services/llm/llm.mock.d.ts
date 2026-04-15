/**
 * Mock LLM Service
 *
 * Provides deterministic, predictable ticket classifications for testing
 * and demo purposes. Used when NODE_ENV=test or LLM_MOCK=true.
 *
 * Why a mock instead of just using the real API in tests?
 * 1. Tests must be deterministic — the same input must always produce
 *    the same output. LLMs are inherently non-deterministic.
 * 2. Tests must be fast — real API calls take 2-10 seconds per call.
 * 3. Tests must be free — API credits aren't unlimited.
 * 4. Tests must work offline — CI/CD might not have network access.
 *
 * The mock uses simple keyword detection (similar to the fallback) but
 * returns higher confidence scores and more detailed reasoning to mimic
 * realistic LLM output.
 */
import { ClassificationResult } from './llm.types';
/**
 * Controls mock behavior. Can be modified in tests to simulate failures.
 *
 * Usage in tests:
 *   mockConfig.shouldFail = true;  // simulate LLM failure
 *   mockConfig.delay = 500;        // simulate slow response
 */
export declare const mockConfig: {
    /** When true, the mock throws an error to test fallback behavior. */
    shouldFail: boolean;
    /** Simulated response delay in milliseconds (50-200ms is realistic). */
    delay: number;
};
/**
 * Mock LLM classification that returns deterministic results.
 *
 * @param title - The ticket's title.
 * @param description - The ticket's description.
 * @returns A ClassificationResult with realistic-looking data.
 * @throws Error when mockConfig.shouldFail is true (for testing fallback).
 *
 * Classification logic:
 * - Checks title and description for category keywords.
 * - Returns the first matching category (checked in a meaningful order).
 * - Defaults to general/medium if no keywords match.
 * - Simulates a configurable delay to mimic real API latency.
 */
export declare function mockClassify(title: string, description: string): Promise<ClassificationResult>;
