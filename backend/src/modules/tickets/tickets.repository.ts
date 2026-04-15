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
import { TicketModel } from '../../models';
import { TicketStatus, TicketPriority, TicketCategory } from '../../types/ticket';
import { NotFoundError, ValidationError } from '../../utils/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  history?: unknown[];
  lastUpdatedBy?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/** The actor performing a status update — snapshotted into history. */
export interface ActorSnapshot {
  agentId: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Repository Functions
// ---------------------------------------------------------------------------

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
export async function createTicket(data: {
  title: string;
  description: string;
  customerEmail: string;
}) {
  const ticket = await TicketModel.create({
    title: data.title,
    description: data.description,
    customerEmail: data.customerEmail,
    // status defaults to 'open', priority/category default to null
    // — set by Mongoose schema defaults
  });

  return ticket.toJSON();
}

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
export async function findTickets(filters: TicketFilters) {
  // Build the MongoDB query filter dynamically.
  // Only include fields that are explicitly provided — undefined values
  // would cause Mongoose to add $eq: undefined conditions that match nothing.
  const query: Record<string, string> = {};

  if (filters.status) {
    query['status'] = filters.status;
  }
  if (filters.priority) {
    query['priority'] = filters.priority;
  }
  if (filters.category) {
    query['category'] = filters.category;
  }

  // Determine sort field and direction.
  // Default: newest first (createdAt descending) — the most natural view
  // for a support dashboard where recent tickets need attention first.
  const sortField = filters.sort || 'createdAt';
  const sortOrder = filters.order === 'asc' ? 1 : -1;

  // Calculate skip for pagination (0-indexed internally).
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  // Run the data query and count query in parallel.
  // Both use the same filter so the total count matches the actual results.
  // This is a common MongoDB pattern — parallel execution halves the latency.
  const [tickets, total] = await Promise.all([
    TicketModel.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean() // Plain objects — no Mongoose overhead
      .exec(),
    TicketModel.countDocuments(query).exec(),
  ]);

  // Transform _id → id for API consistency (lean() skips toJSON transforms).
  const normalized = tickets.map(normalizeTicket);

  return { tickets: normalized, total };
}

/**
 * Find a single ticket by its MongoDB ObjectId.
 *
 * @param id - The ticket's ObjectId as a string.
 * @returns The ticket document or null if not found.
 * @throws ValidationError if the id is not a valid ObjectId format.
 */
export async function findTicketById(id: string) {
  // Validate the ObjectId format before querying to avoid Mongoose CastError.
  // This gives us control over the error message instead of relying on the
  // global error handler to catch and translate CastError.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ticket ID: "${id}". Must be a valid 24-character hex string.`);
  }

  const ticket = await TicketModel.findById(id).lean().exec();
  return ticket ? normalizeTicket(ticket) : null;
}

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
export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  actor: ActorSnapshot
) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ticket ID: "${id}". Must be a valid 24-character hex string.`);
  }

  // Read the pre-update status so the audit event can record the transition.
  // Lean read is fine — we don't mutate the returned doc.
  const existing = await TicketModel.findById(id).select('status').lean().exec();
  if (!existing) return null;

  const now = new Date();
  const event = {
    type: 'status_change' as const,
    agentId: new mongoose.Types.ObjectId(actor.agentId),
    agentName: actor.name,
    agentEmail: actor.email,
    fromStatus: existing.status,
    toStatus: status,
    note: null,
    at: now,
  };

  // Atomic update: set the new status + "last updated by" snapshot, and
  // append the audit event in one round-trip. No read-modify-write race.
  const ticket = await TicketModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        lastUpdatedBy: {
          agentId: new mongoose.Types.ObjectId(actor.agentId),
          name: actor.name,
          email: actor.email,
          at: now,
        },
      },
      $push: { history: event },
    },
    { new: true, runValidators: true }
  )
    .lean()
    .exec();

  return ticket ? normalizeTicket(ticket) : null;
}

/**
 * Fetch only the history array for a ticket — lighter than loading the full
 * document when the UI just wants to show the audit log.
 */
export async function findTicketHistory(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ticket ID: "${id}". Must be a valid 24-character hex string.`);
  }

  const ticket = await TicketModel.findById(id).select('history').lean().exec();
  return ticket ? (ticket.history as unknown[]) : null;
}

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
export async function updateTicketClassification(
  id: string,
  update: ClassificationUpdate
) {
  const event = {
    type: 'classified' as const,
    agentId: null,
    agentName: null,
    agentEmail: null,
    fromStatus: null,
    toStatus: null,
    note: update.aiClassificationFailed
      ? `Auto-classified via keyword fallback → ${update.priority}/${update.category}`
      : `Auto-classified by AI (${Math.round(update.aiConfidence * 100)}%) → ${update.priority}/${update.category}`,
    at: new Date(),
  };

  const ticket = await TicketModel.findByIdAndUpdate(
    id,
    {
      $set: {
        priority: update.priority,
        category: update.category,
        aiConfidence: update.aiConfidence,
        aiClassificationFailed: update.aiClassificationFailed,
      },
      $push: { history: event },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .lean()
    .exec();

  return ticket ? normalizeTicket(ticket) : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a lean Mongoose document for API response.
 *
 * .lean() returns raw MongoDB documents with _id (ObjectId) and __v.
 * The toJSON transform defined on the schema doesn't run for lean queries,
 * so we manually normalize _id → id here.
 */
function normalizeTicket(doc: Record<string, unknown>) {
  const { _id, __v, ...rest } = doc;
  return { id: (_id as mongoose.Types.ObjectId).toString(), ...rest };
}
