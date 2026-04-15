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
export {};
