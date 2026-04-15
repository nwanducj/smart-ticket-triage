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
import { ZodSchema } from 'zod';
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
export declare function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Create a validation middleware for query parameters.
 *
 * Similar to validate() but operates on req.query instead of req.body.
 * Used for GET endpoints where filters and pagination come via query string.
 *
 * @param schema - A Zod schema defining expected query parameters.
 */
export declare function validateQuery(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
