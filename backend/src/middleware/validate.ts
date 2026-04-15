/**
 * Zod Validation Middleware Factory
 *
 * Creates Express middleware that validates request bodies against a Zod
 * schema. This is the HTTP-layer validation gate — it runs before controllers
 * and rejects malformed requests with clear, structured error messages.
 *
 * Why both Zod (HTTP layer) and Mongoose (data layer) validation?
 * - Zod validates the *shape* of incoming requests before they reach
 *   business logic — catching missing fields, wrong types, format issues.
 * - Mongoose validates the *data* before it hits the database — catching
 *   enum mismatches, unique constraint violations, min/max bounds.
 * - Together they form a defense-in-depth strategy: Zod is the first wall,
 *   Mongoose is the last. Neither alone covers all cases.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Create a validation middleware for the given Zod schema.
 *
 * @param schema - A Zod schema that defines the expected request body shape.
 * @returns Express middleware that either passes control to the next handler
 *          (if validation succeeds) or returns a 400 response with formatted
 *          error details.
 *
 * Usage in routes:
 *   import { createTicketSchema } from './tickets.schema';
 *   router.post('/tickets', validate(createTicketSchema), controller.create);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Zod's .parse() throws ZodError on failure, returns the validated
      // (and potentially transformed) data on success. We overwrite req.body
      // with the parsed result so downstream handlers get clean, typed data
      // — any Zod transforms (e.g., .trim(), .toLowerCase()) are applied.
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      // Only ZodErrors come from .parse() — anything else is a bug in our
      // schema definition, which we let bubble up to the global error handler.
      if (error instanceof ZodError) {
        // Format Zod's error array into a flat, human-readable list.
        // Each issue has a `path` (which field) and `message` (what's wrong).
        // Example: [{ field: "email", message: "Invalid email format" }]
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: formattedErrors,
          },
        });
        return;
      }

      // Re-throw unexpected errors so the global error handler catches them.
      next(error);
    }
  };
}

/**
 * Create a validation middleware for query parameters.
 *
 * Similar to validate() but operates on req.query instead of req.body.
 * Used for GET endpoints where filters and pagination come via query string.
 *
 * @param schema - A Zod schema defining expected query parameters.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and overwrite req.query with validated/transformed values.
      // Zod's coerce transforms (e.g., z.coerce.number()) are particularly
      // useful here since query params always arrive as strings.
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
            details: formattedErrors,
          },
        });
        return;
      }

      next(error);
    }
  };
}
