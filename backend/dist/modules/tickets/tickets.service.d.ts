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
import { CreateTicketInput, UpdateTicketInput, ListTicketsQuery } from './tickets.schema';
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
export declare function createTicket(input: CreateTicketInput): Promise<import("mongoose").FlattenMaps<import("../../models").ITicketDocument> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
/**
 * Fetch a paginated, filtered list of tickets for the agent dashboard.
 *
 * @param query - Validated query parameters (filters, pagination, sort).
 * @returns Paginated ticket list with metadata.
 */
export declare function listTickets(query: ListTicketsQuery): Promise<{
    tickets: {
        id: string;
    }[];
    pagination: import("../../utils/pagination").PaginationResult;
}>;
/**
 * Update a ticket's status.
 *
 * @param id - The ticket's ObjectId.
 * @param input - Validated update data (currently just status).
 * @returns The updated ticket.
 * @throws NotFoundError if the ticket doesn't exist.
 */
export declare function updateTicket(id: string, input: UpdateTicketInput): Promise<{
    id: string;
}>;
/**
 * Get a single ticket by ID.
 *
 * @param id - The ticket's ObjectId.
 * @returns The ticket.
 * @throws NotFoundError if the ticket doesn't exist.
 */
export declare function getTicketById(id: string): Promise<{
    id: string;
}>;
