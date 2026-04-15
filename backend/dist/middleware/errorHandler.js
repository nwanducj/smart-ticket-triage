"use strict";
/**
 * Global Error Handler Middleware
 *
 * The last middleware in the Express chain — catches all errors thrown or
 * passed via next(err) from any route handler or middleware. Translates
 * errors into a consistent JSON response shape and logs the full details
 * server-side for debugging.
 *
 * Design principles:
 * 1. Never expose internal details (stack traces, DB errors) to the client.
 * 2. Always return { success: false, error: { message, code } }.
 * 3. Map known error types to appropriate HTTP status codes.
 * 4. Log everything — operators need the full picture to diagnose issues.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
// ---------------------------------------------------------------------------
// Error Handler
// ---------------------------------------------------------------------------
/**
 * Express error-handling middleware (4-argument signature is required).
 *
 * Express identifies error handlers by their 4-parameter signature:
 * (err, req, res, next). Even if we don't use `next`, it must be present
 * for Express to route errors here instead of to the default handler.
 */
function errorHandler(err, req, res, _next) {
    // --- Log the full error for operators ---
    // Always log the complete error with stack trace, regardless of what
    // we send to the client. This is essential for debugging production issues.
    logger_1.logger.error('Request error', {
        method: req.method,
        path: req.path,
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
    });
    // --- Handle our custom AppError hierarchy ---
    // These are "expected" operational errors (bad input, missing resource, etc.)
    // that carry their own status code and machine-readable error code.
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code,
            },
        });
        return;
    }
    // --- Handle Mongoose CastError ---
    // Thrown when an invalid value is passed where an ObjectId is expected.
    // Example: GET /tickets/not-a-valid-id triggers CastError on findById().
    // We return 400 because the client sent a malformed identifier.
    if (err instanceof mongoose_1.default.Error.CastError) {
        res.status(400).json({
            success: false,
            error: {
                message: `Invalid ${err.path}: "${err.value}". Expected a valid identifier.`,
                code: 'INVALID_ID',
            },
        });
        return;
    }
    // --- Handle Mongoose ValidationError ---
    // Thrown when a document fails schema validation (e.g., missing required
    // field, enum mismatch). We extract the first validation message to give
    // the client a useful hint about what went wrong.
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const messages = Object.values(err.errors).map((e) => e.message);
        res.status(400).json({
            success: false,
            error: {
                message: messages.join('. '),
                code: 'VALIDATION_ERROR',
            },
        });
        return;
    }
    // --- Handle MongoDB duplicate key error ---
    // MongoDB driver throws an error with code 11000 when a unique index
    // constraint is violated. Most commonly: registering an agent with an
    // email that already exists. We return 409 Conflict.
    if (isDuplicateKeyError(err)) {
        // Extract the field name from the error message for a helpful response.
        // MongoDB's message looks like: "E11000 duplicate key error collection: ... index: email_1 dup key: ..."
        const field = extractDuplicateField(err.message);
        res.status(409).json({
            success: false,
            error: {
                message: `A record with this ${field} already exists.`,
                code: 'CONFLICT',
            },
        });
        return;
    }
    // --- Fallback: unexpected errors ---
    // Anything that reaches this point is a genuine bug or an unhandled
    // third-party error. In production, we return a generic message to
    // avoid leaking internal details. In development, we include the
    // original message to speed up debugging.
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.status(500).json({
        success: false,
        error: {
            message: isProduction
                ? 'An unexpected error occurred. Please try again later.'
                : err.message || 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
    });
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Check if an error is a MongoDB duplicate key error (code 11000).
 *
 * MongoDB driver errors don't extend a specific class we can use with
 * instanceof — they're plain Error objects with a numeric `code` property.
 * We use a type guard to safely check for the code.
 */
function isDuplicateKeyError(err) {
    // The MongoDB driver attaches `code` to the error object.
    // TypeScript doesn't know about it, so we cast to access it.
    const mongoErr = err;
    return mongoErr.code === 11000;
}
/**
 * Extract the field name from a MongoDB duplicate key error message.
 *
 * Example message: "E11000 duplicate key error collection: smart_triage.agents
 * index: email_1 dup key: { email: \"test@test.com\" }"
 *
 * We look for the "index: <field>_1" pattern and extract the field name.
 * Falls back to "field" if the pattern doesn't match.
 */
function extractDuplicateField(message) {
    // Match "index: fieldName_1" pattern in the error message.
    const match = message.match(/index:\s+(\w+)_/);
    return match?.[1] ?? 'field';
}
//# sourceMappingURL=errorHandler.js.map