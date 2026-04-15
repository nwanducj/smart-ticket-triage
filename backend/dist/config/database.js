"use strict";
/**
 * Database Connection Manager
 * Encapsulates all Mongoose connection logic: initial connect, event-based
 * monitoring, health checks, and graceful disconnection. Separating this from
 * the Express app lets us reuse the same logic in CLI scripts (seeds, migrations)
 * and swap the URI in tests (mongodb-memory-server).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.isDatabaseHealthy = isDatabaseHealthy;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
/**
 * Open a Mongoose connection to the given MongoDB URI.
 *
 * Why we pass the URI explicitly instead of reading config here:
 * - Tests inject a memory-server URI that is only known at runtime.
 * - Seed scripts might target a different database.
 * - Keeps this module pure — no hidden dependency on the config singleton.
 *
 * Mongoose 7+ returns a promise that resolves once the initial handshake
 * succeeds. If the URI is unreachable, the promise rejects and we let the
 * caller decide how to handle it (crash in index.ts, retry in a script, etc.).
 */
async function connectDatabase(uri) {
    logger_1.logger.info('Connecting to MongoDB...', { uri: maskUri(uri) });
    // Register event listeners BEFORE calling connect() so we capture the
    // very first "connected" event that fires when the promise resolves.
    registerEventListeners();
    await mongoose_1.default.connect(uri, {
        // serverSelectionTimeoutMS controls how long the driver waits to find a
        // suitable server before giving up. 5 s is aggressive but appropriate for
        // local dev and container environments where Mongo should be nearby.
        // In production with Atlas, the default (30 s) is usually fine, but we
        // keep 5 s to fail fast during startup and surface misconfig quickly.
        serverSelectionTimeoutMS: 5_000,
    });
}
// ---------------------------------------------------------------------------
// Disconnection
// ---------------------------------------------------------------------------
/**
 * Gracefully close the Mongoose connection.
 *
 * Called during SIGTERM / SIGINT shutdown. Mongoose drains in-flight operations
 * before closing the socket, preventing data corruption on active writes.
 */
async function disconnectDatabase() {
    logger_1.logger.info('Disconnecting from MongoDB...');
    await mongoose_1.default.disconnect();
    logger_1.logger.info('MongoDB disconnected');
}
// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
/**
 * Returns true when the Mongoose connection is in the "connected" state.
 *
 * Used by the /api/health endpoint so load balancers and orchestrators can
 * determine whether this instance should receive traffic. Checking
 * readyState is synchronous and cheap — no network round-trip.
 *
 * readyState values: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
function isDatabaseHealthy() {
    return mongoose_1.default.connection.readyState === 1;
}
// ---------------------------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------------------------
/**
 * Attach one-time Mongoose connection event listeners for observability.
 *
 * Why event listeners instead of polling?
 * Mongoose's driver emits events on state changes automatically. Listening
 * to them gives us real-time visibility without the overhead or latency of
 * a periodic health-check loop.
 *
 * We do NOT attempt programmatic reconnects here — Mongoose's built-in
 * reconnect logic (enabled by default) handles transient network blips.
 * These listeners simply log so operators can see what happened in the logs.
 */
function registerEventListeners() {
    const conn = mongoose_1.default.connection;
    // Fires once the TCP connection is established and the handshake is complete.
    conn.on('connected', () => {
        logger_1.logger.info('MongoDB connected successfully');
    });
    // Fires on any connection-level error (auth failure, network drop, etc.).
    // Mongoose will attempt to reconnect automatically for transient errors,
    // so we log but do not crash.
    conn.on('error', (err) => {
        logger_1.logger.error('MongoDB connection error', {
            message: err.message,
            stack: err.stack,
        });
    });
    // Fires when the connection drops (intentionally or not). In the case of
    // an unintended drop, Mongoose's auto-reconnect will try to restore it.
    conn.on('disconnected', () => {
        logger_1.logger.warn('MongoDB disconnected');
    });
    // Fires when Mongoose successfully reconnects after an unexpected drop.
    // This confirms that the auto-reconnect logic is working and the outage
    // has resolved.
    conn.on('reconnected', () => {
        logger_1.logger.info('MongoDB reconnected');
    });
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Mask credentials in a MongoDB URI for safe logging.
 *
 * Connection strings often contain passwords (mongodb://user:pass@host/db).
 * We replace everything between :// and @ with asterisks so logs don't
 * leak secrets. If there are no credentials, the URI is returned as-is.
 */
function maskUri(uri) {
    try {
        return uri.replace(/:\/\/([^@]+)@/, '://*****@');
    }
    catch {
        // If the regex fails for some reason, return a generic placeholder
        // rather than risk logging the raw URI.
        return 'mongodb://***masked***';
    }
}
//# sourceMappingURL=database.js.map