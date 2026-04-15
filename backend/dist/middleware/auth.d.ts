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
import { AgentJwtPayload } from '../types/agent';
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
export declare function authMiddleware(req: Request, _res: Response, next: NextFunction): void;
