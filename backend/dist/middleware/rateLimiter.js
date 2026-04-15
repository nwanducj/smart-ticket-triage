"use strict";
/**
 * Rate Limiter Middleware
 *
 * Protects the ticket submission endpoint from abuse. Without rate limiting,
 * a single client could flood the system with thousands of tickets, consuming
 * LLM API credits and degrading database performance for everyone.
 *
 * We use express-rate-limit with an in-memory store, which is sufficient for
 * a single-instance deployment. For multi-instance production deployments,
 * swap to a Redis-backed store (rate-limit-redis) so the counter is shared.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.ticketSubmissionLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// In test environment, bypass rate limiting entirely.
// Rate limiter state persists across tests within the same process,
// causing false 429 responses after a few test cases.
const isTest = process.env['NODE_ENV'] === 'test';
const noopMiddleware = (_req, _res, next) => next();
// ---------------------------------------------------------------------------
// Ticket Submission Rate Limiter
// ---------------------------------------------------------------------------
/**
 * Rate limiter for the POST /tickets endpoint.
 *
 * Configuration rationale:
 * - windowMs (15 minutes): long enough to prevent sustained abuse, short
 *   enough that a legitimately frustrated customer can try again soon.
 * - max (10 requests per window): a real customer submitting 10 tickets in
 *   15 minutes is highly unusual — likely a bot or duplicate submissions.
 * - standardHeaders: sends RateLimit-* headers (RateLimit-Limit,
 *   RateLimit-Remaining, RateLimit-Reset) so clients know their quota.
 * - legacyHeaders: disables the old X-RateLimit-* headers (deprecated).
 *
 * TODO(production): Replace the in-memory store with Redis for
 * multi-instance deployments where each process needs a shared counter.
 */
exports.ticketSubmissionLimiter = isTest ? noopMiddleware : (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 10, // 10 requests per window per IP
    // Custom error response matching our standard API error shape.
    // Without this, express-rate-limit returns a plain text body.
    message: {
        success: false,
        error: {
            message: 'Too many tickets submitted. Please wait before trying again.',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    // Send standard RateLimit-* headers so API consumers can implement
    // client-side throttling based on their remaining quota.
    standardHeaders: true,
    // Disable the deprecated X-RateLimit-* headers.
    legacyHeaders: false,
});
// ---------------------------------------------------------------------------
// Auth Rate Limiter
// ---------------------------------------------------------------------------
/**
 * Rate limiter for authentication endpoints (login/register).
 *
 * Tighter than the ticket limiter because failed login attempts are a
 * common vector for brute-force attacks. 5 attempts per 15 minutes is
 * generous for legitimate users but makes brute-forcing impractical.
 */
exports.authRateLimiter = isTest ? noopMiddleware : (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 5, // 5 attempts per window per IP
    message: {
        success: false,
        error: {
            message: 'Too many authentication attempts. Please wait before trying again.',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.js.map