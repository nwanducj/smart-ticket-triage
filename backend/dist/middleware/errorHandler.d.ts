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
import { Request, Response, NextFunction } from 'express';
/**
 * Express error-handling middleware (4-argument signature is required).
 *
 * Express identifies error handlers by their 4-parameter signature:
 * (err, req, res, next). Even if we don't use `next`, it must be present
 * for Express to route errors here instead of to the default handler.
 */
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
