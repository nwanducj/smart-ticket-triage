/**
 * LLM Service Tests
 *
 * Tests the ticket classification pipeline: mock classifier, keyword-based
 * fallback, and response parsing. We don't test the real Anthropic API
 * here — that would be slow, non-deterministic, and cost money.
 *
 * Coverage:
 * - Mock classifier returns correct categories for known keywords
 * - Mock classifier can simulate failures
 * - Fallback classifier maps keywords to correct categories
 * - Fallback classifier defaults to general/medium for ambiguous tickets
 * - classifyTicket() uses mock in test environment
 * - classifyTicket() falls back on mock failure
 */

import { classifyTicket } from './llm.service';
import { fallbackClassify } from './llm.fallback';
import { mockClassify, mockConfig } from './llm.mock';

// ---------------------------------------------------------------------------
// Mock Classifier Tests
// ---------------------------------------------------------------------------

describe('Mock LLM Classifier', () => {
  // Reset mock config before each test to prevent test pollution.
  beforeEach(() => {
    mockConfig.shouldFail = false;
    mockConfig.delay = 10; // Fast for tests.
  });

  it('should classify billing tickets correctly', async () => {
    const result = await mockClassify(
      'Payment failed but I was charged twice',
      'My credit card was charged $49.99 twice but my plan was not upgraded.'
    );

    expect(result.category).toBe('billing');
    expect(result.usedFallback).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify bug tickets correctly', async () => {
    const result = await mockClassify(
      'App crashes when uploading files',
      'The app freezes and shows a white screen when I try to upload a PDF.'
    );

    expect(result.category).toBe('bug');
    expect(result.usedFallback).toBe(false);
  });

  it('should classify feature requests correctly', async () => {
    const result = await mockClassify(
      'Can you add dark mode?',
      'I use the dashboard late at night and would love a dark mode option.'
    );

    expect(result.category).toBe('feature_request');
    expect(result.priority).toBe('low');
  });

  it('should classify account tickets correctly', async () => {
    const result = await mockClassify(
      'Cannot login to my account',
      'I forgot my password and the reset email never arrives.'
    );

    expect(result.category).toBe('account');
  });

  it('should default to general for ambiguous tickets', async () => {
    const result = await mockClassify(
      'Hello',
      'I have a question about your company.'
    );

    expect(result.category).toBe('general');
    expect(result.priority).toBe('medium');
  });

  it('should throw when configured to fail', async () => {
    mockConfig.shouldFail = true;

    await expect(
      mockClassify('Test', 'Test description')
    ).rejects.toThrow('Mock LLM failure');
  });
});

// ---------------------------------------------------------------------------
// Fallback Classifier Tests
// ---------------------------------------------------------------------------

describe('Keyword Fallback Classifier', () => {
  it('should classify billing tickets by keywords', () => {
    const result = fallbackClassify(
      'Invoice issue',
      'I was charged twice on my subscription payment.'
    );

    expect(result.category).toBe('billing');
    expect(result.usedFallback).toBe(true);
    expect(result.confidence).toBe(0.5);
  });

  it('should classify bug tickets by keywords', () => {
    const result = fallbackClassify(
      'Application error',
      'The app crashes every time I click the submit button.'
    );

    expect(result.category).toBe('bug');
    expect(result.usedFallback).toBe(true);
  });

  it('should classify feature requests by keywords', () => {
    const result = fallbackClassify(
      'Enhancement suggestion',
      'It would be great if you could add an export feature.'
    );

    expect(result.category).toBe('feature_request');
    expect(result.usedFallback).toBe(true);
  });

  it('should detect critical priority keywords', () => {
    const result = fallbackClassify(
      'URGENT: System down',
      'The entire production system is experiencing an outage affecting all users.'
    );

    expect(result.priority).toBe('critical');
  });

  it('should detect high priority keywords', () => {
    const result = fallbackClassify(
      'Charged twice',
      'My credit card shows a double charge and I need this fixed ASAP.'
    );

    expect(result.priority).toBe('high');
  });

  it('should detect low priority keywords', () => {
    const result = fallbackClassify(
      'Minor cosmetic issue',
      'The button color is slightly off. No rush on fixing this.'
    );

    expect(result.priority).toBe('low');
  });

  it('should default to general/medium for ambiguous tickets', () => {
    const result = fallbackClassify(
      'Hello',
      'Just wanted to say thanks for the product.'
    );

    expect(result.category).toBe('general');
    expect(result.priority).toBe('medium');
    expect(result.usedFallback).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: classifyTicket (service-level)
// ---------------------------------------------------------------------------

describe('classifyTicket (service integration)', () => {
  beforeEach(() => {
    mockConfig.shouldFail = false;
    mockConfig.delay = 10;
  });

  it('should use mock classifier in test environment', async () => {
    const result = await classifyTicket(
      'Payment issue',
      'I was charged incorrectly on my billing invoice.'
    );

    expect(result.category).toBe('billing');
    expect(result.usedFallback).toBe(false);
  });

  it('should fall back to keyword classifier on mock failure', async () => {
    mockConfig.shouldFail = true;

    const result = await classifyTicket(
      'Bug report',
      'The application crashes when I try to upload files.'
    );

    // Should still return a result (from fallback), not throw.
    expect(result.category).toBe('bug');
    expect(result.usedFallback).toBe(true);
    expect(result.confidence).toBe(0.5);
  });

  it('should always return a valid result, never throw', async () => {
    mockConfig.shouldFail = true;

    // Even with mock failure, classifyTicket should return a result.
    const result = await classifyTicket('xyz', 'totally random text');

    expect(result).toBeDefined();
    expect(result.category).toBeDefined();
    expect(result.priority).toBeDefined();
    expect(typeof result.confidence).toBe('number');
  });
});
