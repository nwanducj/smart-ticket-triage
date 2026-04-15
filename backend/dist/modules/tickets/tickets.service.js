"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.listTickets = listTickets;
exports.updateTicket = updateTicket;
exports.getTicketById = getTicketById;
const ticketsRepository = __importStar(require("./tickets.repository"));
const llm_service_1 = require("../../services/llm/llm.service");
const pagination_1 = require("../../utils/pagination");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
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
async function createTicket(input) {
    // Step 1: Create the ticket immediately.
    const ticket = await ticketsRepository.createTicket({
        title: input.title,
        description: input.description,
        customerEmail: input.customerEmail,
    });
    logger_1.logger.info('Ticket created', { ticketId: ticket.id, email: input.customerEmail });
    // Step 2: Fire-and-forget LLM classification.
    // We intentionally do NOT await this promise — the customer's response
    // should not be blocked by the LLM call. The .catch() ensures that any
    // errors are logged but don't crash the process or trigger unhandled
    // rejection warnings.
    classifyAndUpdateTicket(ticket.id, input.title, input.description).catch((error) => {
        // This catch is the safety net. classifyTicket() has its own retry
        // and fallback logic, so reaching here means something truly unexpected
        // happened (e.g., MongoDB connection lost during the update).
        logger_1.logger.error('Background classification failed unexpectedly', {
            ticketId: ticket.id,
            error: error instanceof Error ? error.message : String(error),
        });
    });
    return ticket;
}
/**
 * Fetch a paginated, filtered list of tickets for the agent dashboard.
 *
 * @param query - Validated query parameters (filters, pagination, sort).
 * @returns Paginated ticket list with metadata.
 */
async function listTickets(query) {
    const { tickets, total } = await ticketsRepository.findTickets({
        status: query.status,
        priority: query.priority,
        category: query.category,
        page: query.page,
        limit: query.limit,
        sort: query.sort,
        order: query.order,
    });
    // Build pagination metadata for the response.
    const pagination = (0, pagination_1.buildPagination)(query.page, query.limit, total);
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
async function updateTicket(id, input) {
    const ticket = await ticketsRepository.updateTicketStatus(id, input.status);
    if (!ticket) {
        throw new errors_1.NotFoundError(`Ticket with ID "${id}" not found.`);
    }
    logger_1.logger.info('Ticket status updated', { ticketId: id, newStatus: input.status });
    return ticket;
}
/**
 * Get a single ticket by ID.
 *
 * @param id - The ticket's ObjectId.
 * @returns The ticket.
 * @throws NotFoundError if the ticket doesn't exist.
 */
async function getTicketById(id) {
    const ticket = await ticketsRepository.findTicketById(id);
    if (!ticket) {
        throw new errors_1.NotFoundError(`Ticket with ID "${id}" not found.`);
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
async function classifyAndUpdateTicket(ticketId, title, description) {
    const startTime = Date.now();
    try {
        // classifyTicket() handles retries and fallback internally.
        // It always returns a result — either from the LLM or the fallback.
        const classification = await (0, llm_service_1.classifyTicket)(title, description);
        // Write the classification back to the ticket.
        await ticketsRepository.updateTicketClassification(ticketId, {
            priority: classification.priority,
            category: classification.category,
            aiConfidence: classification.confidence,
            aiClassificationFailed: classification.usedFallback,
        });
        const duration = Date.now() - startTime;
        logger_1.logger.info('Ticket classified', {
            ticketId,
            priority: classification.priority,
            category: classification.category,
            confidence: classification.confidence,
            usedFallback: classification.usedFallback,
            durationMs: duration,
        });
    }
    catch (error) {
        // If even the fallback fails (shouldn't happen, but defensive coding),
        // mark the ticket as classification-failed so agents know to review it.
        logger_1.logger.error('Classification completely failed', {
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
//# sourceMappingURL=tickets.service.js.map