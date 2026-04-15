/**
 * Tickets Controller
 *
 * Handles the HTTP layer for ticket endpoints. Each method extracts data
 * from the request, delegates to the tickets service, and sends the
 * appropriate HTTP response. Controllers are thin — no business logic here.
 */

import { Request, Response, NextFunction } from 'express';
import * as ticketsService from './tickets.service';
import { CreateTicketInput, UpdateTicketInput, ListTicketsQuery } from './tickets.schema';

// ---------------------------------------------------------------------------
// Controller Methods
// ---------------------------------------------------------------------------

/**
 * POST /tickets (Public)
 *
 * Creates a new support ticket. The request body is already validated
 * by the Zod middleware. LLM classification happens asynchronously —
 * the response is returned immediately with status 201.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as CreateTicketInput;
    const ticket = await ticketsService.createTicket(input);

    // 201 Created — the ticket exists in the database.
    // Priority and category will be null until the LLM classifies it.
    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tickets (Protected)
 *
 * Returns a paginated, filterable list of tickets for the agent dashboard.
 * Query params are validated by the Zod middleware.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.query has been parsed/validated by validateQuery middleware.
    const query = req.query as unknown as ListTicketsQuery;
    const { tickets, pagination } = await ticketsService.listTickets(query);

    res.status(200).json({
      success: true,
      data: tickets,
      pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /tickets/:id (Protected)
 *
 * Updates a ticket's status. The request body is validated by Zod.
 * Returns the updated ticket or 404 if not found.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const input = req.body as UpdateTicketInput;
    // req.agent is guaranteed by authMiddleware upstream.
    const ticket = await ticketsService.updateTicket(id, input, req.agent!);

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tickets/:id/history (Protected)
 *
 * Returns the full audit log for a ticket — every status change and
 * classification event, in chronological order.
 */
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const history = await ticketsService.getTicketHistory(id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tickets/:id (Protected)
 *
 * Returns a single ticket by ID. Returns 404 if not found.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const ticket = await ticketsService.getTicketById(id);

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}
