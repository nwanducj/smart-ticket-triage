/**
 * Database Connection Manager
 * Encapsulates all Mongoose connection logic: initial connect, event-based
 * monitoring, health checks, and graceful disconnection. Separating this from
 * the Express app lets us reuse the same logic in CLI scripts (seeds, migrations)
 * and swap the URI in tests (mongodb-memory-server).
 */
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
export declare function connectDatabase(uri: string): Promise<void>;
/**
 * Gracefully close the Mongoose connection.
 *
 * Called during SIGTERM / SIGINT shutdown. Mongoose drains in-flight operations
 * before closing the socket, preventing data corruption on active writes.
 */
export declare function disconnectDatabase(): Promise<void>;
/**
 * Returns true when the Mongoose connection is in the "connected" state.
 *
 * Used by the /api/health endpoint so load balancers and orchestrators can
 * determine whether this instance should receive traffic. Checking
 * readyState is synchronous and cheap — no network round-trip.
 *
 * readyState values: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
export declare function isDatabaseHealthy(): boolean;
