/**
 * LLM Service Types
 *
 * TypeScript types for the LLM classification request/response cycle.
 * These types define the contract between the LLM service, the fallback
 * classifier, and the tickets service that consumes their output.
 */
import { TicketPriority, TicketCategory } from '../../types/ticket';
/**
 * The unified result returned by both the LLM classifier and the
 * keyword-based fallback. The tickets service doesn't need to know
 * which classifier produced the result — it just reads these fields.
 */
export interface ClassificationResult {
    /** The assigned ticket category (e.g., 'billing', 'bug'). */
    category: TicketCategory;
    /** The assigned priority level (e.g., 'high', 'medium', 'low'). */
    priority: TicketPriority;
    /**
     * Confidence score from 0.0 to 1.0.
     * - LLM classifier: the model's self-reported confidence.
     * - Fallback classifier: always 0.5 (keyword matching is rough).
     */
    confidence: number;
    /**
     * Brief explanation of why this classification was chosen.
     * Used for logging and debugging — not shown to agents in the UI.
     * The LLM provides natural language reasoning; the fallback provides
     * a list of matched keywords.
     */
    reasoning: string;
    /**
     * True if the keyword-based fallback was used instead of the LLM.
     * Maps to the ticket's `aiClassificationFailed` field, which shows
     * a warning badge in the dashboard so agents know to double-check.
     */
    usedFallback: boolean;
}
/**
 * The JSON shape we instruct the LLM to return.
 *
 * The system prompt includes strict instructions to respond only with
 * this JSON format. We parse the LLM's text output and validate it
 * against this shape.
 */
export interface LLMRawResponse {
    category: string;
    priority: string;
    confidence: number;
    reasoning: string;
}
