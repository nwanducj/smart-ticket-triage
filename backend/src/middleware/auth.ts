/**
 * JWT Authentication Middleware
 *
 * Protects routes that require a logged-in agent. Extracts the Bearer token
 * from the Authorization header, verifies it against our JWT secret, and
 * attaches the decoded agent payload to `req.agent` for downstream handlers.
 *
 * Returns 401 for missing, malformed, expired, or invalid tokens. The error
 * messages are intentionally vague ("Unauthorized") to avoid leaking
 * information about which specific check failed — a security best practice.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { AgentJwtPayload } from '../types/agent';

// ---------------------------------------------------------------------------
// Extend Express Request type
// ---------------------------------------------------------------------------

/**
 * Augment Express's Request interface to include the `agent` property.
 *
 * Why module augmentation instead of a custom interface?
 * This approach lets every downstream handler access `req.agent` without
 * casting or wrapper types. TypeScript's declaration merging ensures the
 * augmentation applies globally to all Express Request objects.
 */
declare global {
  namespace Express {
    interface Request {
      agent?: AgentJwtPayload;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Verify the JWT in the Authorization header and attach the agent payload.
 *
 * Expected header format: `Authorization: Bearer <token>`
 *
 * @throws UnauthorizedError if the token is missing, malformed, or invalid.
 *
 * Usage in routes:
 *   router.get('/tickets', authMiddleware, ticketController.list);
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Step 1: Extract the Authorization header.
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(
      new UnauthorizedError('Authentication required. Please provide a valid token.')
    );
  }

  // Step 2: Validate the "Bearer <token>" format.
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(
      new UnauthorizedError('Invalid authorization format. Expected: Bearer <token>')
    );
  }

  const token = parts[1]!;

  try {
    // Step 3: Verify the token signature and expiration.
    const decoded = jwt.verify(token, config.JWT_SECRET) as AgentJwtPayload;

    // Step 4: Attach the decoded payload to the request.
    req.agent = decoded;

    next();
  } catch (error) {
    // All JWT verification failures map to 401 — forwarded via next(err)
    // rather than throw, so the global error handler is guaranteed to run
    // and the CORS headers set upstream are preserved on the response.
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token has expired. Please log in again.'));
    }

    return next(new UnauthorizedError('Invalid authentication token.'));
  }
}
