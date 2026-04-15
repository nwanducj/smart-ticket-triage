"use strict";
/**
 * LLM Classification Service
 *
 * The core AI integration that classifies support tickets using Claude
 * (Anthropic API). This is the most critical backend component — it must
 * handle failures gracefully because the LLM is an external dependency
 * outside our control.
 *
 * Architecture:
 * 1. Check if mock mode is enabled → use mock classifier.
 * 2. Send ticket to Claude with a carefully crafted prompt.
 * 3. Parse the structured JSON response.
 * 4. Retry on transient failures (exponential backoff).
 * 5. Fall back to keyword classifier if all retries fail.
 * 6. Log every call for observability.
 *
 * The service always returns a ClassificationResult — it never throws.
 * The caller doesn't need to handle LLM failures; this service absorbs them.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTicket = classifyTicket;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
const ticket_1 = require("../../types/ticket");
const llm_prompts_1 = require("./llm.prompts");
const llm_fallback_1 = require("./llm.fallback");
const llm_mock_1 = require("./llm.mock");
// ---------------------------------------------------------------------------
// Anthropic Client (lazy initialization)
// ---------------------------------------------------------------------------
/**
 * Lazily initialized Anthropic client.
 *
 * We don't initialize at module load because:
 * 1. In test/mock mode, we never need the real client.
 * 2. The API key might not be available at import time.
 * 3. Lazy init means import-time errors don't crash the app.
 */
let anthropicClient = null;
function getClient() {
    if (!anthropicClient) {
        anthropicClient = new sdk_1.default({
            apiKey: config_1.config.ANTHROPIC_API_KEY,
        });
    }
    return anthropicClient;
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
async function classifyTicket(title, description) {
    // --- Mock mode ---
    // When LLM_MOCK is true (test env, demo mode, no API key), use the
    // deterministic mock classifier instead of making real API calls.
    if (config_1.config.LLM_MOCK || config_1.config.NODE_ENV === 'test') {
        logger_1.logger.debug('Using mock LLM classifier', { title });
        try {
            return await (0, llm_mock_1.mockClassify)(title, description);
        }
        catch (error) {
            // Mock can be configured to fail for testing fallback behavior.
            logger_1.logger.warn('Mock LLM failed, using keyword fallback', {
                error: error instanceof Error ? error.message : String(error),
            });
            return (0, llm_fallback_1.fallbackClassify)(title, description);
        }
    }
    // --- Real LLM classification with retry logic ---
    const maxRetries = config_1.config.LLM_MAX_RETRIES;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const startTime = Date.now();
            const result = await callClaude(title, description);
            const duration = Date.now() - startTime;
            logger_1.logger.info('LLM classification succeeded', {
                attempt,
                durationMs: duration,
                category: result.category,
                priority: result.priority,
                confidence: result.confidence,
            });
            return result;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.warn('LLM classification attempt failed', {
                attempt,
                maxRetries: maxRetries + 1,
                error: lastError.message,
            });
            // Don't retry on the last attempt — fall through to the fallback.
            if (attempt <= maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, ...
                // This gives transient issues (rate limits, network blips) time
                // to resolve without hammering the API.
                const backoffMs = Math.pow(2, attempt - 1) * 1000;
                logger_1.logger.debug('Retrying LLM call after backoff', { backoffMs });
                await sleep(backoffMs);
            }
        }
    }
    // --- All retries exhausted — use keyword fallback ---
    logger_1.logger.error('LLM classification failed after all retries, using fallback', {
        error: lastError?.message,
        title,
    });
    return (0, llm_fallback_1.fallbackClassify)(title, description);
}
// ---------------------------------------------------------------------------
// Claude API Call
// ---------------------------------------------------------------------------
/**
 * Make a single classification request to the Claude API.
 *
 * @param title - Ticket title.
 * @param description - Ticket description.
 * @returns Parsed and validated ClassificationResult.
 * @throws Error on API failure, timeout, or unparseable response.
 */
async function callClaude(title, description) {
    const client = getClient();
    // Call the Anthropic Messages API.
    // We use a low max_tokens since classification responses are short JSON.
    const message = await client.messages.create({
        model: config_1.config.LLM_MODEL,
        max_tokens: 256,
        system: llm_prompts_1.CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: (0, llm_prompts_1.buildUserPrompt)(title, description),
            },
        ],
    });
    // Extract the text content from the response.
    // The Messages API returns an array of content blocks; we expect
    // exactly one text block containing our JSON.
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
        throw new Error('LLM response did not contain a text block');
    }
    // Parse the JSON response from the LLM.
    const classification = parseClassificationResponse(textBlock.text);
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
 * The LLM is instructed to return strict JSON, but LLMs can be unreliable
 * with format compliance. We handle common issues:
 * - Strip markdown code fences if present (```json ... ```)
 * - Validate category against our enum (reject hallucinated values)
 * - Validate priority against our enum
 * - Clamp confidence to [0, 1] range
 *
 * @param raw - The raw text output from the LLM.
 * @returns A validated ClassificationResult (without usedFallback — caller sets it).
 * @throws Error if the response is not valid JSON or has invalid values.
 */
function parseClassificationResponse(raw) {
    // Strip markdown code fences if the LLM wrapped the JSON in them.
    // Despite explicit instructions, models sometimes add ```json ... ```.
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    // Parse JSON. If this throws, the caller's retry logic will catch it.
    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    }
    catch {
        throw new Error(`LLM returned invalid JSON: ${cleaned.substring(0, 200)}`);
    }
    // Validate category — must be one of our known values.
    const category = parsed.category?.toLowerCase();
    if (!ticket_1.TICKET_CATEGORIES.includes(category)) {
        throw new Error(`LLM returned invalid category: "${parsed.category}"`);
    }
    // Validate priority — must be one of our known values.
    const priority = parsed.priority?.toLowerCase();
    if (!ticket_1.TICKET_PRIORITIES.includes(priority)) {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=llm.service.js.map