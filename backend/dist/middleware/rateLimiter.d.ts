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
import { Request, Response, NextFunction } from 'express';
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
export declare const ticketSubmissionLimiter: (_req: Request, _res: Response, next: NextFunction) => void;
/**
 * Rate limiter for authentication endpoints (login/register).
 *
 * Tighter than the ticket limiter because failed login attempts are a
 * common vector for brute-force attacks. 5 attempts per 15 minutes is
 * generous for legitimate users but makes brute-forcing impractical.
 */
export declare const authRateLimiter: (_req: Request, _res: Response, next: NextFunction) => void;
