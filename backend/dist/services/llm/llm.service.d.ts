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
import { ClassificationResult } from './llm.types';
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
export declare function classifyTicket(title: string, description: string): Promise<ClassificationResult>;
