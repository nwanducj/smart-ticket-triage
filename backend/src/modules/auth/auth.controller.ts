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
import * as authService from './auth.service';
import { RegisterInput, LoginInput } from './auth.schema';

// ---------------------------------------------------------------------------
// Controller Methods
// ---------------------------------------------------------------------------

/**
 * POST /auth/register
 *
 * Creates a new agent account and returns the agent profile + JWT.
 * The request body is already validated by the Zod middleware before
 * this handler runs, so we can safely cast req.body to RegisterInput.
 *
 * @returns 201 with { success, data: { agent, token } }
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as RegisterInput;
    const result = await authService.registerAgent(input);

    // 201 Created — a new resource (agent) was successfully created.
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Pass errors to the global error handler.
    // The service throws ConflictError (409) for duplicate emails
    // and any unexpected errors bubble up as 500s.
    next(error);
  }
}

/**
 * POST /auth/login
 *
 * Authenticates an agent and returns the agent profile + JWT.
 *
 * @returns 200 with { success, data: { agent, token } }
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as LoginInput;
    const result = await authService.loginAgent(input);

    // 200 OK — authentication succeeded, returning existing resource.
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // The service throws UnauthorizedError (401) for bad credentials.
    next(error);
  }
}
