/**
 * Tickets Service (Business Logic Layer)
 *
 * Orchestrates ticket operations by coordinating between the repository
 * (data access), the LLM service (AI classification), and the pagination
 * helper. This layer contains all business rules and is the only place
 * where cross-cutting concerns (like triggering classification after
 * creation) are managed.
 *
 * The service never touches Express (req/res) or Mongoose directly —
 * it receives plain data and returns plain results.
 */

import * as ticketsRepository from './tickets.repository';
import { AgentModel } from '../../models';
import { classifyTicket } from '../../services/llm/llm.service';
import { buildPagination } from '../../utils/pagination';
import { NotFoundError, UnauthorizedError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { TicketStatus, TicketPriority, TicketCategory } from '../../types/ticket';
import { AgentJwtPayload } from '../../types/agent';
import { CreateTicketInput, UpdateTicketInput, ListTicketsQuery } from './tickets.schema';

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Create a new support ticket and trigger async AI classification.
 *
 * @param input - Validated ticket data from the customer.
 * @returns The created ticket (before classification — priority/category are null).
 *
 * Flow:
 * 1. Save the ticket to MongoDB immediately (status: open, priority: null).
 * 2. Fire-and-forget the LLM classification — do NOT await it.
 * 3. Return the ticket to the customer immediately (201 response).
 * 4. When the LLM responds (or fails), update the ticket in the background.
 *
 * Why async classification?
 * LLM calls take 2-10 seconds. Making the customer wait that long for a
 * confirmation would be a terrible UX. The ticket exists the moment they
 * submit it; classification enriches it in the background.
 */
export async function createTicket(input: CreateTicketInput) {
  // Step 1: Create the ticket immediately.
  const ticket = await ticketsRepository.createTicket({
    title: input.title,
    description: input.description,
    customerEmail: input.customerEmail,
  });

  logger.info('Ticket created', { ticketId: ticket.id, email: input.customerEmail });

  // Step 2: Fire-and-forget LLM classification.
  // We intentionally do NOT await this promise — the customer's response
  // should not be blocked by the LLM call. The .catch() ensures that any
  // errors are logged but don't crash the process or trigger unhandled
  // rejection warnings.
  classifyAndUpdateTicket(ticket.id, input.title, input.description).catch(
    (error) => {
      // This catch is the safety net. classifyTicket() has its own retry
      // and fallback logic, so reaching here means something truly unexpected
      // happened (e.g., MongoDB connection lost during the update).
      logger.error('Background classification failed unexpectedly', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  );

  return ticket;
}

/**
 * Fetch a paginated, filtered list of tickets for the agent dashboard.
 *
 * @param query - Validated query parameters (filters, pagination, sort).
 * @returns Paginated ticket list with metadata.
 */
export async function listTickets(query: ListTicketsQuery) {
  const { tickets, total } = await ticketsRepository.findTickets({
    status: query.status as TicketStatus | undefined,
    priority: query.priority as TicketPriority | undefined,
    category: query.category as TicketCategory | undefined,
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    order: query.order,
  });

  // Build pagination metadata for the response.
  const pagination = buildPagination(query.page, query.limit, total);

  return { tickets, pagination };
}

/**
 * Update a ticket's status.
 *
 * @param id - The ticket's ObjectId.
 * @param input - Validated update data (currently just status).
 * @returns The updated ticket.
 * @throws NotFoundError if the ticket doesn't exist.
 */
export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
  actor: AgentJwtPayload
) {
  // Look up the agent's current name so the audit event records it as a
  // snapshot. The JWT only carries id/email/role — we want the display name
  // in history, but deliberately snapshot it (not join at read time) so the
  // log reflects what was true when the action happened.
  const agent = await AgentModel.findById(actor.id).select('name email').lean().exec();
  if (!agent) {
    throw new UnauthorizedError('Your account could not be found.');
  }

  const ticket = await ticketsRepository.updateTicketStatus(
    id,
    input.status as TicketStatus,
    {
      agentId: actor.id,
      name: agent.name,
      email: agent.email,
    }
  );

  if (!ticket) {
    throw new NotFoundError(`Ticket with ID "${id}" not found.`);
  }

  logger.info('Ticket status updated', {
    ticketId: id,
    newStatus: input.status,
    agentId: actor.id,
    agentEmail: agent.email,
  });

  return ticket;
}

/**
 * Fetch the full audit log for a ticket.
 *
 * @throws NotFoundError when the ticket does not exist.
 */
export async function getTicketHistory(id: string) {
  const history = await ticketsRepository.findTicketHistory(id);
  if (history === null) {
    throw new NotFoundError(`Ticket with ID "${id}" not found.`);
  }
  return history;
}

/**
 * Get a single ticket by ID.
 *
 * @param id - The ticket's ObjectId.
 * @returns The ticket.
 * @throws NotFoundError if the ticket doesn't exist.
 */
export async function getTicketById(id: string) {
  const ticket = await ticketsRepository.findTicketById(id);

  if (!ticket) {
    throw new NotFoundError(`Ticket with ID "${id}" not found.`);
  }

  return ticket;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Classify a ticket via the LLM and update it with the results.
 *
 * This runs in the background after ticket creation. It calls the LLM
 * service (which handles retries and fallback internally) and writes
 * the classification back to the ticket.
 *
 * @param ticketId - The ticket to classify.
 * @param title - Ticket title (input for the LLM).
 * @param description - Ticket description (input for the LLM).
 */
async function classifyAndUpdateTicket(
  ticketId: string,
  title: string,
  description: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // classifyTicket() handles retries and fallback internally.
    // It always returns a result — either from the LLM or the fallback.
    const classification = await classifyTicket(title, description);

    // Write the classification back to the ticket.
    await ticketsRepository.updateTicketClassification(ticketId, {
      priority: classification.priority,
      category: classification.category,
      aiConfidence: classification.confidence,
      aiClassificationFailed: classification.usedFallback,
    });

    const duration = Date.now() - startTime;
    logger.info('Ticket classified', {
      ticketId,
      priority: classification.priority,
      category: classification.category,
      confidence: classification.confidence,
      usedFallback: classification.usedFallback,
      durationMs: duration,
    });
  } catch (error) {
    // If even the fallback fails (shouldn't happen, but defensive coding),
    // mark the ticket as classification-failed so agents know to review it.
    logger.error('Classification completely failed', {
      ticketId,
      error: error instanceof Error ? error.message : String(error),
    });

    await ticketsRepository.updateTicketClassification(ticketId, {
      priority: 'medium',
      category: 'general',
      aiConfidence: 0,
      aiClassificationFailed: true,
    });
  }
}
