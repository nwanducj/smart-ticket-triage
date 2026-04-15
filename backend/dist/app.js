"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const tickets_routes_1 = __importDefault(require("./modules/tickets/tickets.routes"));
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
function createApp() {
    const app = (0, express_1.default)();
    // --- Security Middleware ---
    // Helmet sets various HTTP security headers (X-Content-Type-Options,
    // X-Frame-Options, etc.) to protect against common web vulnerabilities.
    // It's a single line that covers a dozen security best practices.
    app.use((0, helmet_1.default)());
    // CORS allows the frontend (running on a different port) to make
    // requests to the backend. Without this, browsers block cross-origin
    // requests by default. In production, restrict `origin` to your domain.
    app.use((0, cors_1.default)({
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
        credentials: true,
    }));
    // --- Body Parsing ---
    // Parse JSON request bodies with a 1MB limit. The default Express limit
    // is 100KB, which is too small for tickets with long descriptions.
    // 1MB is generous but prevents abuse from enormous payloads.
    app.use(express_1.default.json({ limit: '1mb' }));
    // --- Health Check ---
    /**
     * GET /api/health
     *
     * Used by Docker health checks and load balancers to determine if this
     * instance is ready to receive traffic. Returns 200 when healthy, 503
     * when the database connection is down.
     */
    app.get('/api/health', (_req, res) => {
        const dbHealthy = (0, database_1.isDatabaseHealthy)();
        if (dbHealthy) {
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: 'connected',
            });
        }
        else {
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
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/tickets', tickets_routes_1.default);
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
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map