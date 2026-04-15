/**
 * Tickets Controller
 *
 * Handles the HTTP layer for ticket endpoints. Each method extracts data
 * from the request, delegates to the tickets service, and sends the
 * appropriate HTTP response. Controllers are thin — no business logic here.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * POST /tickets (Public)
 *
 * Creates a new support ticket. The request body is already validated
 * by the Zod middleware. LLM classification happens asynchronously —
 * the response is returned immediately with status 201.
 */
export declare function create(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /tickets (Protected)
 *
 * Returns a paginated, filterable list of tickets for the agent dashboard.
 * Query params are validated by the Zod middleware.
 */
export declare function list(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * PATCH /tickets/:id (Protected)
 *
 * Updates a ticket's status. The request body is validated by Zod.
 * Returns the updated ticket or 404 if not found.
 */
export declare function update(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /tickets/:id (Protected)
 *
 * Returns a single ticket by ID. Returns 404 if not found.
 */
export declare function getById(req: Request, res: Response, next: NextFunction): Promise<void>;
