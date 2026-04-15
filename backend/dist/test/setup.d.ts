/**
 * Test Setup — MongoDB Memory Server
 *
 * Configures an in-memory MongoDB instance for isolated, fast integration
 * tests. Each test suite gets a clean database with no external dependencies.
 *
 * Why mongodb-memory-server?
 * 1. Speed: in-memory DB is faster than a real MongoDB instance.
 * 2. Isolation: each test suite has its own database — no shared state.
 * 3. No dependencies: tests run without Docker or an installed MongoDB.
 * 4. CI-friendly: no port conflicts or external service requirements.
 *
 * Lifecycle:
 * - beforeAll: start the memory server, connect Mongoose.
 * - afterEach: clear all collections (clean slate for each test).
 * - afterAll: disconnect Mongoose, stop the memory server.
 */
export {};
