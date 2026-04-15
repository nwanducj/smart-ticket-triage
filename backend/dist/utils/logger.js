"use strict";
/**
 * Structured JSON Logger
 * Provides a minimal, zero-dependency logging utility that outputs
 * machine-parseable JSON lines. In production, log aggregators (Datadog,
 * ELK, CloudWatch) ingest JSON natively — no grok patterns needed.
 * We wrap console methods so the logger works everywhere without setup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
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
function formatEntry(level, message, meta) {
    const entry = {
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
exports.logger = {
    /**
     * Debug-level messages — only useful during active development.
     * In production, log aggregators should filter these out or set a
     * minimum-level policy. We still emit them so developers can enable
     * them when troubleshooting without redeploying.
     */
    debug(message, meta) {
        // Skip debug output in production to reduce log volume and cost.
        // Checking NODE_ENV here (rather than at startup) allows toggling
        // at runtime in environments that support hot-reloading env vars.
        if (process.env['NODE_ENV'] === 'production')
            return;
        console.log(formatEntry('debug', message, meta));
    },
    /**
     * Informational messages — normal operational events.
     * Examples: "Server started on port 4000", "Connected to MongoDB",
     * "Ticket classified in 320 ms".
     */
    info(message, meta) {
        console.log(formatEntry('info', message, meta));
    },
    /**
     * Warning messages — something unexpected that the system can recover from.
     * Examples: "LLM call timed out, retrying", "Rate limit approaching".
     */
    warn(message, meta) {
        console.error(formatEntry('warn', message, meta));
    },
    /**
     * Error messages — something failed and likely needs attention.
     * Examples: "Database connection lost", "Unhandled rejection".
     * Always include a stack trace in meta when available.
     */
    error(message, meta) {
        console.error(formatEntry('error', message, meta));
    },
};
//# sourceMappingURL=logger.js.map