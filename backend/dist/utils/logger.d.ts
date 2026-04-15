/**
 * Structured JSON Logger
 * Provides a minimal, zero-dependency logging utility that outputs
 * machine-parseable JSON lines. In production, log aggregators (Datadog,
 * ELK, CloudWatch) ingest JSON natively — no grok patterns needed.
 * We wrap console methods so the logger works everywhere without setup.
 */
/**
 * Optional key-value metadata attached to a log entry.
 * Using Record<string, unknown> keeps it flexible: callers can pass error
 * objects, request IDs, user IDs, timings, etc. without defining a rigid schema.
 */
type LogMeta = Record<string, unknown>;
/**
 * The exported logger object. Each method corresponds to a severity level.
 *
 * Why not use a library like Winston or Pino?
 * - This backend is intentionally lightweight. Adding a logging library pulls
 *   in dozens of transitive dependencies and configuration surface area.
 * - Our needs are simple: structured JSON to stdout. If we later need log
 *   rotation, multiple transports, or child loggers, migrating to Pino is
 *   straightforward because the call-site API (logger.info/warn/error/debug)
 *   is identical.
 *
 * Implementation detail: we use console.log for info/debug and console.error
 * for warn/error. Some deployment environments (AWS Lambda, Docker) split
 * stdout and stderr into different streams, and routing warnings/errors to
 * stderr ensures they surface in monitoring even if stdout is buffered.
 */
export declare const logger: {
    /**
     * Debug-level messages — only useful during active development.
     * In production, log aggregators should filter these out or set a
     * minimum-level policy. We still emit them so developers can enable
     * them when troubleshooting without redeploying.
     */
    debug(message: string, meta?: LogMeta): void;
    /**
     * Informational messages — normal operational events.
     * Examples: "Server started on port 4000", "Connected to MongoDB",
     * "Ticket classified in 320 ms".
     */
    info(message: string, meta?: LogMeta): void;
    /**
     * Warning messages — something unexpected that the system can recover from.
     * Examples: "LLM call timed out, retrying", "Rate limit approaching".
     */
    warn(message: string, meta?: LogMeta): void;
    /**
     * Error messages — something failed and likely needs attention.
     * Examples: "Database connection lost", "Unhandled rejection".
     * Always include a stack trace in meta when available.
     */
    error(message: string, meta?: LogMeta): void;
};
export {};
