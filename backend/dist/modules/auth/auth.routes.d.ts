/**
 * Auth Routes
 *
 * Defines the Express routes for agent authentication. Each route is a
 * pipeline of middleware: rate limiter → validation → controller.
 *
 * POST /auth/register — Create a new agent account (open for demo).
 * POST /auth/login    — Authenticate and receive a JWT.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
