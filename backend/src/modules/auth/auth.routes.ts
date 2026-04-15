/**
 * Auth Routes
 *
 * Defines the Express routes for agent authentication. Each route is a
 * pipeline of middleware: rate limiter → validation → controller.
 *
 * POST /auth/register — Create a new agent account (open for demo).
 * POST /auth/login    — Authenticate and receive a JWT.
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { registerSchema, loginSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /auth/register
 *
 * Pipeline: rate limit → validate body → create agent.
 *
 * NOTE: In production, this endpoint would be restricted to admins or
 * disabled entirely, with agents provisioned via an admin panel or SSO.
 * For this demo, it's open so testers can create accounts freely.
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * POST /auth/login
 *
 * Pipeline: rate limit → validate body → authenticate.
 *
 * Rate limiting on login is critical — it makes brute-force password
 * attacks impractical by capping attempts per IP per time window.
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

export default router;
