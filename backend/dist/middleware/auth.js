"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
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
function authMiddleware(req, _res, next) {
    // Step 1: Extract the Authorization header.
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new errors_1.UnauthorizedError('Authentication required. Please provide a valid token.');
    }
    // Step 2: Validate the "Bearer <token>" format.
    // We split on space and check both parts to reject malformed headers
    // like "Bearer" (missing token) or "Basic abc123" (wrong scheme).
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new errors_1.UnauthorizedError('Invalid authorization format. Expected: Bearer <token>');
    }
    const token = parts[1];
    try {
        // Step 3: Verify the token signature and expiration.
        // jwt.verify() throws specific error types:
        // - TokenExpiredError: token's exp claim is in the past
        // - JsonWebTokenError: signature mismatch, malformed token
        // - NotBeforeError: token's nbf claim is in the future
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
        // Step 4: Attach the decoded payload to the request.
        // Downstream handlers access req.agent.id, req.agent.email, etc.
        req.agent = decoded;
        next();
    }
    catch (error) {
        // All JWT verification failures map to 401.
        // We don't distinguish between expired and invalid tokens in the
        // response to avoid giving attackers information about token validity.
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.UnauthorizedError('Token has expired. Please log in again.');
        }
        throw new errors_1.UnauthorizedError('Invalid authentication token.');
    }
}
//# sourceMappingURL=auth.js.map