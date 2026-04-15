/**
 * Tickets Repository (Data Access Layer)
 *
 * All Mongoose queries that touch the Ticket model live here — nowhere
 * else in the codebase should query Ticket directly. This separation lets
 * us swap the database engine without touching business logic in the service
 * layer. It also makes query logic testable in isolation.
 *
 * Why Mongoose with .lean()?
 * Mongoose documents carry hydration overhead (change tracking, save methods,
 * virtual getters, etc.). For read-heavy operations like listing tickets,
 * .lean() returns plain JS objects — roughly 3-5x faster for large result
 * sets. We only skip .lean() when we need the full Mongoose document
 * (e.g., for pre-save hooks or instance methods).
 */
import mongoose from 'mongoose';
import { TicketStatus, TicketPriority, TicketCategory } from '../../types/ticket';
/** Filter options for listing tickets. All fields are optional. */
export interface TicketFilters {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
/** Fields that can be updated on a ticket via the LLM classification. */
export interface ClassificationUpdate {
    priority: TicketPriority;
    category: TicketCategory;
    aiConfidence: number;
    aiClassificationFailed: boolean;
}
/** The shape of a ticket returned from .lean() queries (plain JS object). */
export interface LeanTicket {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    customerEmail: string;
    status: TicketStatus;
    priority: TicketPriority | null;
    category: TicketCategory | null;
    aiConfidence: number | null;
    aiClassificationFailed: boolean;
    assignedAgent: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create a new ticket in the database.
 *
 * @param data - The ticket fields provided by the customer.
 * @returns The created ticket document (as JSON, with id normalization).
 *
 * We use TicketModel.create() which runs Mongoose validation and triggers
 * any pre-save middleware. The returned document goes through the toJSON
 * transform, so it has `id` instead of `_id`.
 */
export declare function createTicket(data: {
    title: string;
    description: string;
    customerEmail: string;
}): Promise<mongoose.FlattenMaps<import("../../models").ITicketDocument> & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
/**
 * Fetch a paginated list of tickets with optional filters.
 *
 * @param filters - Optional status, priority, category, pagination, and sort options.
 * @returns An object with the ticket array and total count for pagination.
 *
 * Implementation notes:
 * - We build the filter object dynamically, only including fields that the
 *   caller specifies. This avoids querying for undefined values.
 * - .lean() returns plain objects instead of Mongoose documents for performance.
 * - We run .find() and .countDocuments() with the same filter in parallel
 *   to avoid sequential round-trips to MongoDB.
 * - For very large collections (millions of tickets), consider cursor-based
 *   pagination instead of skip/limit, which degrades at high offsets.
 */
export declare function findTickets(filters: TicketFilters): Promise<{
    tickets: {
        id: string;
    }[];
    total: number;
}>;
/**
 * Find a single ticket by its MongoDB ObjectId.
 *
 * @param id - The ticket's ObjectId as a string.
 * @returns The ticket document or null if not found.
 * @throws ValidationError if the id is not a valid ObjectId format.
 */
export declare function findTicketById(id: string): Promise<{
    id: string;
} | null>;
/**
 * Update a ticket's status.
 *
 * @param id - The ticket's ObjectId as a string.
 * @param status - The new status value.
 * @returns The updated ticket or null if not found.
 * @throws ValidationError if the id is not a valid ObjectId format.
 *
 * Uses findByIdAndUpdate with { new: true } to atomically update and
 * return the updated document in one round-trip.
 */
export declare function updateTicketStatus(id: string, status: TicketStatus): Promise<{
    id: string;
} | null>;
/**
 * Update a ticket with AI classification results.
 *
 * @param id - The ticket's ObjectId as a string.
 * @param update - The classification data (priority, category, confidence, failed flag).
 * @returns The updated ticket or null if not found.
 *
 * Called asynchronously after ticket creation when the LLM responds.
 * Uses findByIdAndUpdate for an atomic update — no read-modify-write cycle.
 */
export declare function updateTicketClassification(id: string, update: ClassificationUpdate): Promise<{
    id: string;
} | null>;
