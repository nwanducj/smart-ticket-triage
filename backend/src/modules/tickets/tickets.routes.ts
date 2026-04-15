/**
 * Ticket Routes
 *
 * Defines Express routes for ticket CRUD operations.
 *
 * POST  /tickets       — Public: customer submits a ticket (rate-limited).
 * GET   /tickets       — Protected: agents list tickets with filters.
 * GET   /tickets/:id   — Protected: agents view a single ticket.
 * PATCH /tickets/:id   — Protected: agents update ticket status. CORS
 *                        preflight is handled explicitly in app.ts so the
 *                        browser's OPTIONS probe succeeds.
 */

import { Router } from 'express';
import { validate, validateQuery } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import { ticketSubmissionLimiter } from '../../middleware/rateLimiter';
import {
  createTicketSchema,
  updateTicketSchema,
  listTicketsQuerySchema,
} from './tickets.schema';
import * as ticketsController from './tickets.controller';

const router = Router();

// ---------------------------------------------------------------------------
// Public Routes
// ---------------------------------------------------------------------------

/**
 * POST /tickets
 *
 * Pipeline: rate limit → validate body → create ticket.
 *
 * No auth required — customers submit tickets without an account.
 * Rate limiting prevents abuse and protects LLM API credits.
 */
router.post(
  '/',
  ticketSubmissionLimiter,
  validate(createTicketSchema),
  ticketsController.create
);

// ---------------------------------------------------------------------------
// Protected Routes (require JWT)
// ---------------------------------------------------------------------------

/**
 * GET /tickets
 *
 * Pipeline: auth → validate query params → list tickets.
 *
 * Returns paginated results with optional status/priority/category filters.
 */
router.get(
  '/',
  authMiddleware,
  validateQuery(listTicketsQuerySchema),
  ticketsController.list
);

/**
 * GET /tickets/:id
 *
 * Pipeline: auth → get single ticket.
 */
router.get(
  '/:id',
  authMiddleware,
  ticketsController.getById
);

/**
 * GET /tickets/:id/history
 *
 * Returns the audit log (status changes, classifications) for one ticket.
 */
router.get(
  '/:id/history',
  authMiddleware,
  ticketsController.getHistory
);

/**
 * PATCH /tickets/:id
 *
 * Pipeline: auth → validate body → update ticket status.
 *
 * PATCH is the semantically-correct verb for a partial update. It's a
 * non-"simple" CORS method so the browser sends an OPTIONS preflight —
 * app.ts registers an explicit `app.options('*', cors(...))` handler and
 * spells out `methods`/`allowedHeaders` so the preflight succeeds.
 */
router.patch(
  '/:id',
  authMiddleware,
  validate(updateTicketSchema),
  ticketsController.update
);

export default router;
