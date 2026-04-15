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

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

/**
 * Start the in-memory MongoDB server and connect Mongoose.
 *
 * Runs once before all tests in a suite. The URI includes a random port
 * assigned by the OS, so multiple test suites can run in parallel without
 * port conflicts.
 */
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

/**
 * Clear all collections between tests.
 *
 * Using deleteMany({}) on each collection is faster than dropping and
 * recreating the database (which would require re-creating indexes).
 * This gives each test a clean slate without the overhead of a full reset.
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
});

/**
 * Disconnect Mongoose and stop the in-memory server.
 *
 * Runs once after all tests in a suite. Stopping the server releases
 * the allocated memory and port.
 */
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
