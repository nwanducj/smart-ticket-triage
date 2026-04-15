/**
 * Custom Application Error Hierarchy
 * All operational errors thrown intentionally by our business logic extend
 * from AppError. This lets the global error handler distinguish "expected"
 * errors (bad input, missing resource) from truly unexpected crashes and
 * respond with the correct HTTP status code and a consistent JSON shape.
 */

// ---------------------------------------------------------------------------
// Base Error
// ---------------------------------------------------------------------------

/**
 * AppError is the root of our custom error hierarchy.
 *
 * Why a custom base class instead of plain Error?
 * 1. We attach an HTTP `statusCode` so the error handler can set the response
 *    status without a lookup table mapping error types to codes.
 * 2. We attach a machine-readable `code` string (e.g., "NOT_FOUND") that
 *    frontend clients can switch on — far more stable than parsing human-
 *    readable messages that might change with copy edits.
 * 3. Extending Error preserves the prototype chain, so `instanceof AppError`
 *    works correctly and stack traces point to the throw site, not this file.
 */
export class AppError extends Error {
  /** HTTP status code to return in the response (e.g., 400, 404, 500). */
  public readonly statusCode: number;

  /**
   * Machine-readable error code for programmatic handling on the client.
   * Convention: UPPER_SNAKE_CASE (e.g., "VALIDATION_ERROR", "NOT_FOUND").
   */
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;

    // Restore the correct prototype chain. TypeScript compiles `extends Error`
    // to ES5-style inheritance which breaks `instanceof` in some runtimes
    // unless we explicitly set the prototype. This is the recommended fix
    // from the TypeScript handbook for custom Error subclasses.
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace that excludes the Error constructor frames.
    // The second argument tells V8 to start the trace from the calling site.
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Specific Error Types
// ---------------------------------------------------------------------------

/**
 * 404 Not Found — the requested resource does not exist.
 *
 * Thrown when a database lookup by ID returns null or a route references an
 * entity that has been deleted. The error handler returns 404 so the client
 * knows to stop retrying.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

/**
 * 400 Bad Request — the request payload is syntactically valid JSON but
 * fails business-rule validation.
 *
 * Distinct from Zod schema validation (which the validate middleware handles).
 * Use this for semantic checks like "end date must be after start date" or
 * "cannot close a ticket that is already closed".
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * 401 Unauthorized — the request lacks valid authentication credentials.
 *
 * Thrown when a JWT is missing, expired, or has an invalid signature.
 * We intentionally keep the message vague ("Unauthorized") to avoid leaking
 * information about which part of the auth check failed.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * 409 Conflict — the request conflicts with the current state of the server.
 *
 * Most commonly triggered by duplicate-key violations: e.g., trying to
 * register an agent with an email that already exists. Returning 409
 * (instead of 400) tells the client the request was structurally fine
 * but collides with existing data.
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, message, 'CONFLICT');
  }
}

/**
 * 500 Internal Server Error — something went wrong that we did not anticipate.
 *
 * Use this sparingly. Most 500s should be unhandled exceptions caught by the
 * global error handler. This class exists for cases where we detect an
 * impossible state and want to fail loudly with a descriptive message
 * (e.g., "LLM returned an unparseable response").
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}
