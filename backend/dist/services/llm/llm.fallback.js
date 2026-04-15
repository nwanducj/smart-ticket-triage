"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackClassify = fallbackClassify;
// ---------------------------------------------------------------------------
// Keyword Maps
// ---------------------------------------------------------------------------
/**
 * Category keyword mapping.
 *
 * Each category has a list of keywords that commonly appear in tickets
 * of that type. Keywords are lowercase for case-insensitive matching.
 * The more specific keywords appear, the more confident we are.
 *
 * Rationale for keyword choices:
 * - billing: financial terms, payment providers, transaction language
 * - bug: error/failure language, technical symptoms
 * - feature_request: desire/wish language, improvement suggestions
 * - account: authentication/access terms
 * - technical_support: help/guidance language, setup terms
 * - general: intentionally empty — it's the fallback for the fallback
 */
const CATEGORY_KEYWORDS = {
    billing: [
        'billing', 'invoice', 'charge', 'payment', 'refund', 'subscription',
        'price', 'pricing', 'plan', 'upgrade', 'downgrade', 'credit card',
        'receipt', 'cost', 'fee', 'discount', 'coupon', 'trial', 'renewal',
        'cancel', 'cancellation',
    ],
    bug: [
        'bug', 'error', 'crash', 'broken', 'not working', 'fails', 'failure',
        'issue', 'problem', 'glitch', 'freeze', 'freezes', 'frozen', 'stuck',
        'white screen', 'blank page', '500', '404', 'exception', 'stack trace',
        'regression', 'unexpected', 'incorrect', 'wrong', 'data loss',
    ],
    feature_request: [
        'feature', 'request', 'suggestion', 'would be nice', 'would love',
        'wish', 'please add', 'could you add', 'it would be great',
        'enhancement', 'improvement', 'integrate', 'integration', 'support for',
        'dark mode', 'export', 'import', 'api', 'customiz',
    ],
    account: [
        'login', 'log in', 'password', 'reset', 'locked', 'lockout',
        'access', 'permission', 'role', 'account', 'profile', 'email change',
        'two-factor', '2fa', 'mfa', 'authentication', 'sign in', 'sign up',
        'register', 'deactivat', 'verify', 'verification',
    ],
    technical_support: [
        'how to', 'how do i', 'help', 'setup', 'configure', 'configuration',
        'tutorial', 'guide', 'documentation', 'docs', 'install', 'installation',
        'getting started', 'walkthrough', 'instructions', 'steps',
        'troubleshoot', 'diagnose',
    ],
    general: [],
    // General has no keywords — it's the default when nothing else matches.
};
/**
 * Priority keyword mapping.
 *
 * We look for urgency indicators to bump priority up from the default
 * "medium". Critical/high keywords indicate severe impact; low keywords
 * indicate minor issues.
 */
const PRIORITY_KEYWORDS = {
    critical: [
        'urgent', 'emergency', 'critical', 'outage', 'down', 'security breach',
        'data loss', 'all users', 'everyone', 'production down', 'cannot access',
        'system down', 'completely broken',
    ],
    high: [
        'important', 'asap', 'blocked', 'blocker', 'deadline', 'time-sensitive',
        'charged twice', 'double charge', 'unauthorized', 'major', 'severe',
        'many users', 'widespread',
    ],
    low: [
        'minor', 'cosmetic', 'nice to have', 'low priority', 'when you get a chance',
        'no rush', 'not urgent', 'suggestion', 'wish', 'someday',
    ],
};
// ---------------------------------------------------------------------------
// Fallback Classifier
// ---------------------------------------------------------------------------
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
function fallbackClassify(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    // --- Category classification ---
    let bestCategory = 'general';
    let bestCategoryScore = 0;
    const matchedKeywords = [];
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
                matchedKeywords.push(`${category}:${keyword}`);
            }
        }
        // Strict greater-than: in case of a tie with the current best,
        // we keep the earlier category (which is fine — no strong reason
        // to prefer one tie-breaking strategy over another).
        if (score > bestCategoryScore) {
            bestCategoryScore = score;
            bestCategory = category;
        }
    }
    // --- Priority classification ---
    const priority = determinePriority(text);
    return {
        category: bestCategory,
        priority,
        confidence: 0.5, // Fixed confidence for keyword-based classification.
        reasoning: matchedKeywords.length > 0
            ? `Keyword fallback matched: ${matchedKeywords.join(', ')}`
            : 'No keywords matched — defaulting to general/medium.',
        usedFallback: true,
    };
}
/**
 * Determine priority based on urgency-related keywords.
 *
 * Checks critical keywords first (highest severity), then high, then low.
 * If no urgency keywords match, defaults to 'medium' — a safe middle ground
 * that doesn't over-alarm agents or under-prioritize real issues.
 */
function determinePriority(text) {
    // Check critical first — any critical keyword overrides everything.
    for (const keyword of PRIORITY_KEYWORDS.critical) {
        if (text.includes(keyword))
            return 'critical';
    }
    // Then high-priority keywords.
    for (const keyword of PRIORITY_KEYWORDS.high) {
        if (text.includes(keyword))
            return 'high';
    }
    // Then low-priority keywords.
    for (const keyword of PRIORITY_KEYWORDS.low) {
        if (text.includes(keyword))
            return 'low';
    }
    // Default: medium — the safest assumption when we have no signal.
    return 'medium';
}
//# sourceMappingURL=llm.fallback.js.map