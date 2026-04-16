/**
 * LLM Classification Service
 *
 * The core AI integration that classifies support tickets. Talks to any
 * OpenAI-compatible `/chat/completions` endpoint — OpenAI, OpenRouter,
 * Groq, Together, local Ollama/vLLM, etc. We deliberately use the generic
 * Chat Completions API (not a provider-specific SDK) so the model and the
 * provider can both be swapped at runtime via env vars (LLM_MODEL,
 * LLM_BASE_URL, LLM_API_KEY) with no code changes, no rebuild, no redeploy.
 *
 * Architecture:
 * 1. Check if mock mode is enabled → use mock classifier.
 * 2. Send ticket to the completions endpoint with a carefully crafted prompt.
 * 3. Parse the structured JSON response.
 * 4. Retry on transient failures (exponential backoff).
 * 5. Fall back to keyword classifier if all retries fail.
 * 6. Log every call for observability.
 *
 * The service always returns a ClassificationResult — it never throws.
 * The caller doesn't need to handle LLM failures; this service absorbs them.
 */

import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TicketCategory, TicketPriority } from '../../types/ticket';
import { ClassificationResult, LLMRawResponse } from './llm.types';
import { CLASSIFICATION_SYSTEM_PROMPT, buildUserPrompt } from './llm.prompts';
import { fallbackClassify } from './llm.fallback';
import { mockClassify } from './llm.mock';

// ---------------------------------------------------------------------------
// Completions Client (lazy initialization)
// ---------------------------------------------------------------------------

/**
 * Lazily initialized OpenAI-compatible client.
 *
 * The `openai` package is the de-facto standard SDK for the Chat Completions
 * API contract. Because the contract is open, every major provider (and
 * most self-hosted inference servers) speaks it — pointing `baseURL` at
 * OpenRouter or a local Ollama instance "just works" with the same SDK.
 *
 * We don't initialize at module load because:
 * 1. In test/mock mode, we never need the real client.
 * 2. The API key might not be available at import time.
 * 3. Lazy init means import-time errors don't crash the app.
 */
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.LLM_API_KEY,
      baseURL: config.LLM_BASE_URL,
      timeout: config.LLM_TIMEOUT_MS,
      // The SDK has its own retry logic; we disable it because we implement
      // our own retry + fallback flow below and don't want double-retries.
      maxRetries: 0,
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Main Classification Function
// ---------------------------------------------------------------------------

/**
 * Classify a support ticket's category and priority.
 *
 * This is the primary entry point for the LLM service. It orchestrates
 * the full classification flow: mock check → LLM call → retry → fallback.
 *
 * @param title - The ticket's title.
 * @param description - The ticket's description.
 * @returns A ClassificationResult — always returns, never throws.
 */
export async function classifyTicket(
  title: string,
  description: string
): Promise<ClassificationResult> {
  // --- Mock mode ---
  // When LLM_MOCK is true (test env, demo mode, no API key), use the
  // deterministic mock classifier instead of making real API calls.
  if (config.LLM_MOCK || config.NODE_ENV === 'test') {
    logger.debug('Using mock LLM classifier', { title });
    try {
      return await mockClassify(title, description);
    } catch (error) {
      // Mock can be configured to fail for testing fallback behavior.
      logger.warn('Mock LLM failed, using keyword fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      return fallbackClassify(title, description);
    }
  }

  // --- Real LLM classification with retry logic ---
  const maxRetries = config.LLM_MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const startTime = Date.now();
      const result = await callCompletions(title, description);
      const duration = Date.now() - startTime;

      logger.info('LLM classification succeeded', {
        attempt,
        model: config.LLM_MODEL,
        durationMs: duration,
        category: result.category,
        priority: result.priority,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn('LLM classification attempt failed', {
        attempt,
        maxRetries: maxRetries + 1,
        model: config.LLM_MODEL,
        error: lastError.message,
      });

      // Don't retry on the last attempt — fall through to the fallback.
      if (attempt <= maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, ...
        // This gives transient issues (rate limits, network blips) time
        // to resolve without hammering the API.
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        logger.debug('Retrying LLM call after backoff', { backoffMs });
        await sleep(backoffMs);
      }
    }
  }

  // --- All retries exhausted — use keyword fallback ---
  logger.error('LLM classification failed after all retries, using fallback', {
    error: lastError?.message,
    title,
  });

  return fallbackClassify(title, description);
}

// ---------------------------------------------------------------------------
// Completions API Call
// ---------------------------------------------------------------------------

/**
 * Make a single classification request to the chat completions endpoint.
 *
 * Uses `response_format: { type: 'json_object' }` so compliant providers
 * enforce JSON output at the API level — eliminating the "LLM wrapped JSON
 * in prose" class of parse errors. Providers that don't support this flag
 * ignore it, and our downstream cleanup still handles markdown fences.
 *
 * @param title - Ticket title.
 * @param description - Ticket description.
 * @returns Parsed and validated ClassificationResult.
 * @throws Error on API failure, timeout, or unparseable response.
 */
async function callCompletions(
  title: string,
  description: string
): Promise<ClassificationResult> {
  const completion = await getClient().chat.completions.create({
    model: config.LLM_MODEL,
    // Low max_tokens — classification responses are short JSON.
    max_tokens: 256,
    // Low temperature — classification is a deterministic task; we want
    // the same ticket to produce the same category on every call.
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(title, description) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error('LLM response did not contain any content');
  }

  const classification = parseClassificationResponse(text);

  return {
    ...classification,
    usedFallback: false,
  };
}

// ---------------------------------------------------------------------------
// Response Parsing
// ---------------------------------------------------------------------------

/**
 * Parse and validate the LLM's JSON response.
 *
 * Even with response_format=json_object, we defensively handle:
 * - Markdown code fences (```json ... ```) — some providers still add them.
 * - Hallucinated category/priority values — reject anything not in our enum.
 * - Out-of-range confidence — clamp to [0, 1].
 *
 * @param raw - The raw text output from the LLM.
 * @returns A validated ClassificationResult (without usedFallback — caller sets it).
 * @throws Error if the response is not valid JSON or has invalid values.
 */
function parseClassificationResponse(
  raw: string
): Omit<ClassificationResult, 'usedFallback'> {
  // Strip markdown code fences if the LLM wrapped the JSON in them.
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: LLMRawResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${cleaned.substring(0, 200)}`);
  }

  // Validate category — must be one of our known values.
  const category = parsed.category?.toLowerCase() as TicketCategory;
  if (!TICKET_CATEGORIES.includes(category)) {
    throw new Error(`LLM returned invalid category: "${parsed.category}"`);
  }

  // Validate priority — must be one of our known values.
  const priority = parsed.priority?.toLowerCase() as TicketPriority;
  if (!TICKET_PRIORITIES.includes(priority)) {
    throw new Error(`LLM returned invalid priority: "${parsed.priority}"`);
  }

  // Validate and clamp confidence to [0, 1].
  let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    category,
    priority,
    confidence,
    reasoning: parsed.reasoning || 'No reasoning provided.',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Promise-based sleep for retry backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
