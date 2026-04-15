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

import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { createApp } from './app';
import { logger } from './utils/logger';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    // Step 1: Connect to MongoDB.
    // This must succeed before we start accepting HTTP requests —
    // otherwise the first request would hit a disconnected database.
    await connectDatabase(config.MONGODB_URI);

    // Step 2: Create the Express app.
    const app = createApp();

    // Step 3: Start the HTTP server.
    const server = app.listen(config.PORT, () => {
      logger.info(`Server started on port ${config.PORT}`, {
        env: config.NODE_ENV,
        llmMock: config.LLM_MOCK,
      });
    });

    // --- Graceful Shutdown ---
    // When the orchestrator (Docker, Kubernetes, systemd) sends SIGTERM,
    // we stop accepting new connections, wait for in-flight requests to
    // complete, then close the database connection and exit cleanly.
    // SIGINT handles Ctrl+C during development.

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Stop accepting new connections. The callback fires when all
      // existing connections have been closed.
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', {
            error: error instanceof Error ? error.message : String(error),
          });
          process.exit(1);
        }
      });

      // Safety net: force-exit after 10 seconds if graceful shutdown hangs.
      // This prevents zombie processes in container environments.
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    // If MongoDB connection or server startup fails, log and exit.
    // A non-zero exit code tells the orchestrator to restart us.
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run the bootstrap function.
main();
