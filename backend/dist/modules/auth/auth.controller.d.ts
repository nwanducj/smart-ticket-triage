/**
 * Auth Controller
 *
 * Handles the HTTP layer for authentication endpoints. Each method:
 * 1. Extracts validated data from the request (already parsed by Zod middleware).
 * 2. Delegates to the auth service for business logic.
 * 3. Sends the appropriate HTTP response.
 *
 * Controllers are intentionally thin — they contain no business logic.
 * If you find yourself writing an if/else for a business rule here,
 * it belongs in the service layer instead.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * POST /auth/register
 *
 * Creates a new agent account and returns the agent profile + JWT.
 * The request body is already validated by the Zod middleware before
 * this handler runs, so we can safely cast req.body to RegisterInput.
 *
 * @returns 201 with { success, data: { agent, token } }
 */
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /auth/login
 *
 * Authenticates an agent and returns the agent profile + JWT.
 *
 * @returns 200 with { success, data: { agent, token } }
 */
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
