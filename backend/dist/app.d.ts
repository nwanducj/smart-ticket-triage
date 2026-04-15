/**
 * Express Application Factory
 *
 * Creates and configures the Express app with all middleware, routes, and
 * error handlers. Separated from the server (index.ts) so tests can import
 * the app without starting a listening server — essential for Supertest.
 *
 * Middleware order matters in Express — they execute top-to-bottom:
 * 1. Security headers (helmet)
 * 2. CORS
 * 3. Body parsing
 * 4. Routes
 * 5. 404 handler
 * 6. Global error handler (must be last)
 */
import express from 'express';
/**
 * Create a fully configured Express application.
 *
 * Why a factory function instead of a module-level app?
 * - Tests can create fresh app instances with clean state.
 * - Future: different configs for different environments.
 */
export declare function createApp(): express.Application;
