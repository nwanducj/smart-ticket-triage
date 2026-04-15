/**
 * Server Entry Point
 *
 * Bootstraps the application: loads environment config, connects to MongoDB,
 * creates the Express app, and starts the HTTP server. Also sets up graceful
 * shutdown handlers for SIGTERM and SIGINT so in-flight requests complete
 * and the database connection is closed cleanly before the process exits.
 *
 * Why separate from app.ts?
 * app.ts creates a pure Express app with no side effects — perfect for
 * testing with Supertest. This file adds the side effects: DB connection,
 * port binding, signal handlers. Tests never import this file.
 */
export {};
