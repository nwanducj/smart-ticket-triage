/**
 * Keyword-Based Fallback Classifier
 *
 * When the LLM API is unavailable (timeout, rate limit, outage), this
 * module provides a deterministic, zero-latency classification based on
 * keyword matching. It's intentionally simple — the goal is "better than
 * nothing" until an agent can manually review.
 *
 * How it works:
 * 1. Combine title + description into a single lowercase string.
 * 2. Check for keyword matches against each category's keyword list.
 * 3. The category with the most keyword matches wins.
 * 4. Priority is determined by urgency-related keywords.
 * 5. Always sets usedFallback=true so the UI shows a warning badge.
 *
 * Limitations:
 * - No understanding of context or negation ("NOT a billing issue" still
 *   matches "billing").
 * - Multi-word phrases aren't matched as units — each word is independent.
 * - Confidence is always 0.5 because keyword matching is inherently rough.
 */
import { ClassificationResult } from './llm.types';
/**
 * Classify a ticket using keyword matching.
 *
 * @param title - The ticket's title.
 * @param description - The ticket's description.
 * @returns A ClassificationResult with usedFallback=true.
 *
 * Algorithm:
 * 1. Combine and lowercase the text.
 * 2. Count keyword matches for each category.
 * 3. Pick the category with the most matches (ties → first in map order).
 * 4. Count priority keyword matches; default to 'medium'.
 * 5. Return the result with confidence=0.5 and usedFallback=true.
 */
export declare function fallbackClassify(title: string, description: string): ClassificationResult;
