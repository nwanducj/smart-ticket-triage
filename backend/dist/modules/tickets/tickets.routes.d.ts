/**
 * Ticket Routes
 *
 * Defines Express routes for ticket CRUD operations.
 *
 * POST /tickets       — Public: customer submits a ticket (rate-limited).
 * GET  /tickets       — Protected: agents list tickets with filters.
 * GET  /tickets/:id   — Protected: agents view a single ticket.
 * PATCH /tickets/:id  — Protected: agents update ticket status.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
