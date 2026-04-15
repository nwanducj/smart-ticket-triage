/**
 * Ticket Routes
 *
 * Defines Express routes for ticket CRUD operations.
 *
 * POST /tickets       — Public: customer submits a ticket (rate-limited).
 * GET  /tickets       — Protected: agents list tickets with filters.
 * GET  /tickets/:id   — Protected: agents view a single ticket.
 * POST /tickets/:id   — Protected: agents update ticket status.
 *                       (Was PATCH — switched to POST to sidestep CORS
 *                       preflight issues and match standard form semantics.)
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
 * POST /tickets/:id
 *
 * Pipeline: auth → validate body → update ticket status.
 *
 * We use POST (not PATCH) because PATCH is a non-"simple" CORS method that
 * forces a preflight OPTIONS, which has been flaky across environments.
 * POST is semantically acceptable here ("apply this mutation") and removes
 * an entire class of cross-origin failures.
 */
router.post(
  '/:id',
  authMiddleware,
  validate(updateTicketSchema),
  ticketsController.update
);

export default router;
