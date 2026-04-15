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
import { TicketCategory, TicketPriority } from '../../types/ticket';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Controls mock behavior. Can be modified in tests to simulate failures.
 *
 * Usage in tests:
 *   mockConfig.shouldFail = true;  // simulate LLM failure
 *   mockConfig.delay = 500;        // simulate slow response
 */
export const mockConfig = {
  /** When true, the mock throws an error to test fallback behavior. */
  shouldFail: false,

  /** Simulated response delay in milliseconds (50-200ms is realistic). */
  delay: 100,
};

// ---------------------------------------------------------------------------
// Mock Classifier
// ---------------------------------------------------------------------------

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
export async function mockClassify(
  title: string,
  description: string
): Promise<ClassificationResult> {
  // Simulate network latency. This makes tests more realistic and catches
  // race conditions that only appear with async operations.
  await sleep(mockConfig.delay);

  // Simulate LLM failure for testing fallback behavior.
  if (mockConfig.shouldFail) {
    throw new Error('Mock LLM failure: simulated API error');
  }

  const text = `${title} ${description}`.toLowerCase();

  // Determine category based on keywords in priority order.
  // More specific categories are checked first to avoid the "general"
  // bucket catching everything.
  const { category, priority, reasoning } = classifyText(text);

  return {
    category,
    priority,
    confidence: 0.85, // Fixed high confidence for mock — realistic for clear tickets.
    reasoning,
    usedFallback: false, // Mock acts as the "real" LLM, not as fallback.
  };
}

// ---------------------------------------------------------------------------
// Classification Logic
// ---------------------------------------------------------------------------

interface MockClassification {
  category: TicketCategory;
  priority: TicketPriority;
  reasoning: string;
}

/**
 * Simple keyword-based classification for the mock.
 *
 * Returns the first category whose keywords appear in the text.
 * Priority is determined by urgency keywords.
 */
function classifyText(text: string): MockClassification {
  // Check billing keywords first — financial issues are often urgent.
  if (/billing|invoice|charge|payment|refund|subscription|price/.test(text)) {
    return {
      category: 'billing',
      priority: text.includes('urgent') || text.includes('charged twice') ? 'high' : 'medium',
      reasoning: 'Ticket contains billing-related keywords indicating a financial issue.',
    };
  }

  // Bug/error keywords — technical issues.
  if (/bug|error|crash|broken|not working|fails|failure|freeze/.test(text)) {
    return {
      category: 'bug',
      priority: text.includes('critical') || text.includes('data loss') ? 'critical' : 'medium',
      reasoning: 'Ticket describes a software defect or malfunction.',
    };
  }

  // Feature request keywords.
  if (/feature|request|suggestion|would love|please add|enhancement|dark mode/.test(text)) {
    return {
      category: 'feature_request',
      priority: 'low',
      reasoning: 'Ticket is requesting new functionality or improvements.',
    };
  }

  // Account/access keywords.
  if (/login|password|reset|locked|access|account|permission|sign in/.test(text)) {
    return {
      category: 'account',
      priority: text.includes('locked') || text.includes('cannot access') ? 'high' : 'medium',
      reasoning: 'Ticket relates to account access or authentication issues.',
    };
  }

  // Technical support / how-to keywords.
  if (/how to|help|setup|configure|tutorial|guide|documentation|install/.test(text)) {
    return {
      category: 'technical_support',
      priority: 'low',
      reasoning: 'Ticket is a how-to or setup question requiring guidance.',
    };
  }

  // Default: general inquiry at medium priority.
  return {
    category: 'general',
    priority: 'medium',
    reasoning: 'Ticket does not clearly match a specific category — classified as general inquiry.',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Promise-based sleep utility.
 * Using setTimeout wrapped in a Promise — the simplest way to simulate
 * async delay without pulling in a dependency.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
