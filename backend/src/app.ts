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
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { isDatabaseHealthy } from './config/database';
import authRoutes from './modules/auth/auth.routes';
import ticketRoutes from './modules/tickets/tickets.routes';

// ---------------------------------------------------------------------------
// App Factory
// ---------------------------------------------------------------------------

/**
 * Create a fully configured Express application.
 *
 * Why a factory function instead of a module-level app?
 * - Tests can create fresh app instances with clean state.
 * - Future: different configs for different environments.
 */
export function createApp(): express.Application {
  const app = express();

  // --- Security Middleware ---

  // Helmet sets various HTTP security headers (X-Content-Type-Options,
  // X-Frame-Options, etc.) to protect against common web vulnerabilities.
  // It's a single line that covers a dozen security best practices.
  app.use(helmet());

  // CORS allows the frontend (running on a different port) to make requests
  // to the backend. We configure this EXPLICITLY — earlier we relied on the
  // cors package defaults, but browsers were failing the PATCH preflight
  // (non-simple method → OPTIONS preflight required) while Postman, which
  // doesn't honor CORS, worked fine. Spelling out `methods` and
  // `allowedHeaders` guarantees the preflight response advertises PATCH and
  // permits `Authorization` / `Content-Type`.
  const corsOptions: cors.CorsOptions = {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // 204 is the canonical preflight status. Some legacy browsers choke on
    // 204 responses with no body, but every browser we target is fine.
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));

  // Explicit preflight handler for every route. `app.use(cors())` DOES handle
  // OPTIONS when it sees an OPTIONS request — but only if the request reaches
  // it before being short-circuited elsewhere. Registering an explicit
  // `app.options('*', ...)` makes the behavior bulletproof and independent
  // of middleware order, which is the fix for the "PATCH fails in browser,
  // works in Postman" class of bug.
  app.options('*', cors(corsOptions));

  // --- Body Parsing ---

  // Parse JSON request bodies with a 1MB limit. The default Express limit
  // is 100KB, which is too small for tickets with long descriptions.
  // 1MB is generous but prevents abuse from enormous payloads.
  app.use(express.json({ limit: '1mb' }));

  // --- Health Check ---

  /**
   * GET /api/health
   *
   * Used by Docker health checks and load balancers to determine if this
   * instance is ready to receive traffic. Returns 200 when healthy, 503
   * when the database connection is down.
   */
  app.get('/api/health', (_req, res) => {
    const dbHealthy = isDatabaseHealthy();

    if (dbHealthy) {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
      });
    } else {
      res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
      });
    }
  });

  // --- API Routes ---

  // Mount route modules under /api prefix.
  // Each module handles its own sub-routing (e.g., /api/auth/login).
  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);

  // --- 404 Handler ---

  // Catch-all for unmatched routes. Must come after all route definitions
  // but before the error handler.
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'The requested endpoint does not exist.',
        code: 'NOT_FOUND',
      },
    });
  });

  // --- Global Error Handler ---

  // Must be the LAST middleware. Express identifies error handlers by their
  // 4-parameter signature (err, req, res, next). If this isn't last,
  // errors from later middleware won't be caught.
  app.use(errorHandler);

  return app;
}
