/**
 * Structured JSON Logger
 * Provides a minimal, zero-dependency logging utility that outputs
 * machine-parseable JSON lines. In production, log aggregators (Datadog,
 * ELK, CloudWatch) ingest JSON natively — no grok patterns needed.
 * We wrap console methods so the logger works everywhere without setup.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Supported log levels, ordered by severity.
 * We use a string literal union instead of an enum so callers never need
 * to import a separate symbol — plain strings work fine.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Optional key-value metadata attached to a log entry.
 * Using Record<string, unknown> keeps it flexible: callers can pass error
 * objects, request IDs, user IDs, timings, etc. without defining a rigid schema.
 */
type LogMeta = Record<string, unknown>;

/**
 * The shape of a single log entry written to stdout/stderr.
 * Every field is always present so downstream parsers can rely on a
 * consistent schema.
 */
interface LogEntry {
  /** ISO-8601 timestamp — essential for correlating events across services. */
  timestamp: string;
  /** Severity level — used for filtering and alerting in log aggregators. */
  level: LogLevel;
  /** Human-readable description of what happened. */
  message: string;
  /** Arbitrary structured data for context (request IDs, stack traces, etc.). */
  meta?: LogMeta;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Build a structured log entry and serialize it to a single JSON line.
 *
 * Why JSON.stringify instead of a pretty format?
 * - Log aggregators parse JSON natively; pretty-printed multi-line logs
 *   break line-based ingestion.
 * - Structured fields are searchable (e.g., `level:error AND meta.statusCode:500`).
 * - In local development, piping through `jq` or `pino-pretty` gives a
 *   human-friendly view on demand.
 */
function formatEntry(level: LogLevel, message: string, meta?: LogMeta): string {
  const entry: LogEntry = {
    // Date.toISOString() produces UTC — avoids timezone ambiguity in logs.
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  // Only include the meta key when there is data. This keeps noise out of
  // simple informational messages and reduces log volume.
  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }

  return JSON.stringify(entry);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
export const logger = {
  /**
   * Debug-level messages — only useful during active development.
   * In production, log aggregators should filter these out or set a
   * minimum-level policy. We still emit them so developers can enable
   * them when troubleshooting without redeploying.
   */
  debug(message: string, meta?: LogMeta): void {
    // Skip debug output in production to reduce log volume and cost.
    // Checking NODE_ENV here (rather than at startup) allows toggling
    // at runtime in environments that support hot-reloading env vars.
    if (process.env['NODE_ENV'] === 'production') return;
    console.log(formatEntry('debug', message, meta));
  },

  /**
   * Informational messages — normal operational events.
   * Examples: "Server started on port 4000", "Connected to MongoDB",
   * "Ticket classified in 320 ms".
   */
  info(message: string, meta?: LogMeta): void {
    console.log(formatEntry('info', message, meta));
  },

  /**
   * Warning messages — something unexpected that the system can recover from.
   * Examples: "LLM call timed out, retrying", "Rate limit approaching".
   */
  warn(message: string, meta?: LogMeta): void {
    console.error(formatEntry('warn', message, meta));
  },

  /**
   * Error messages — something failed and likely needs attention.
   * Examples: "Database connection lost", "Unhandled rejection".
   * Always include a stack trace in meta when available.
   */
  error(message: string, meta?: LogMeta): void {
    console.error(formatEntry('error', message, meta));
  },
};
