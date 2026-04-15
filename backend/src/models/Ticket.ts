/**
 * Ticket Mongoose Model
 *
 * Defines the MongoDB schema for support tickets. Each ticket is created by
 * a customer (no account needed) and triaged by the LLM on creation. Agents
 * update status via the dashboard.
 *
 * Key design decisions:
 * - priority and category default to null (unclassified until LLM or fallback runs)
 * - aiClassificationFailed flags tickets where the LLM was unavailable
 * - aiConfidence stores the LLM's self-reported confidence (0.00–1.00)
 * - assignedAgent is a reference for future agent assignment features
 * - Indexes are defined explicitly at the bottom for visibility and documentation
 */

import { Schema, model, Document, Types } from 'mongoose';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../types/ticket';

// ---------------------------------------------------------------------------
// TypeScript Interface
// ---------------------------------------------------------------------------

/**
 * The raw Mongoose document shape for a Ticket.
 *
 * Extends Document for Mongoose methods. Priority and category are nullable
 * because a ticket exists in the database before the LLM has classified it —
 * the classification happens asynchronously after creation.
 */
/**
 * A single audit event captured on a ticket.
 *
 * We snapshot the agent's name/email at the time of the action instead of
 * just their id. Names change, agents leave — a historical log should
 * reflect what was true when the change happened, not a live lookup.
 * System actions (AI classification) use type='classified' and leave the
 * agent fields null.
 */
export interface ITicketEvent {
  type: 'status_change' | 'classified' | 'created';
  agentId: Types.ObjectId | null;
  agentName: string | null;
  agentEmail: string | null;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  note: string | null;
  at: Date;
}

/**
 * Compact "last touched by" record. Duplicated from the most recent
 * agent-driven history entry so list endpoints can show the responsible
 * agent in a table without fetching the whole history array.
 */
export interface ILastUpdatedBy {
  agentId: Types.ObjectId;
  name: string;
  email: string;
  at: Date;
}

export interface ITicketDocument extends Document {
  title: string;
  description: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority | null;
  category: TicketCategory | null;
  aiConfidence: number | null;
  aiClassificationFailed: boolean;
  assignedAgent: Types.ObjectId | null;
  /** Full chronological log of changes — appended only, never mutated. */
  history: ITicketEvent[];
  /** Snapshot of the most recent agent-driven change (null until first edit). */
  lastUpdatedBy: ILastUpdatedBy | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Subdoc schemas
// ---------------------------------------------------------------------------

const TicketEventSchema = new Schema<ITicketEvent>(
  {
    type: {
      type: String,
      enum: ['status_change', 'classified', 'created'],
      required: true,
    },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', default: null },
    agentName: { type: String, default: null },
    agentEmail: { type: String, default: null },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    note: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LastUpdatedBySchema = new Schema<ILastUpdatedBy>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------

const TicketSchema = new Schema<ITicketDocument>(
  {
    /**
     * Short summary of the issue, written by the customer.
     * Max 500 chars keeps titles scannable in the dashboard table view.
     */
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [500, 'Title cannot exceed 500 characters'],
    },

    /**
     * Detailed description of the problem or request.
     * Max 5000 chars provides ample room for reproduction steps, error
     * messages, and context without allowing unbounded storage consumption.
     * This field is what the LLM analyzes for classification.
     */
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    /**
     * Email of the customer who submitted the ticket.
     * Used for follow-up communication and to group tickets by customer.
     * `lowercase` + `trim` normalize inputs for consistent lookups.
     */
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
    },

    /**
     * Current lifecycle state of the ticket.
     * Flow: open → in_progress → resolved → closed
     * Defaults to 'open' — every new ticket starts unassigned and unworked.
     */
    status: {
      type: String,
      enum: {
        values: [...TICKET_STATUSES],
        message: 'Status must be one of: {VALUE}',
      },
      default: 'open',
    },

    /**
     * Urgency level, typically set by the AI classifier.
     * Defaults to null — the ticket exists before classification completes.
     * Agents see "Pending" in the UI for null priority, signaling that
     * classification is either in progress or failed.
     */
    priority: {
      type: String,
      enum: {
        values: [...TICKET_PRIORITIES],
        message: 'Priority must be one of: {VALUE}',
      },
      default: null,
    },

    /**
     * Topic category, typically set by the AI classifier.
     * Defaults to null — same reasoning as priority above.
     * Agents see "Uncategorized" in the UI for null category.
     */
    category: {
      type: String,
      enum: {
        values: [...TICKET_CATEGORIES],
        message: 'Category must be one of: {VALUE}',
      },
      default: null,
    },

    /**
     * LLM confidence score for its classification (0.00–1.00).
     * Null when classification hasn't run yet or when the fallback was used.
     * Agents can use this to gauge whether to trust or override the AI.
     * Values below 0.6 might warrant manual review.
     */
    aiConfidence: {
      type: Number,
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1'],
      default: null,
    },

    /**
     * Flag indicating the LLM was unavailable and the keyword-based
     * fallback classifier was used instead.
     * When true, agents see a warning badge in the UI indicating the
     * classification may be less accurate and should be reviewed.
     */
    aiClassificationFailed: {
      type: Boolean,
      default: false,
    },

    /**
     * Reference to the Agent assigned to this ticket.
     * Null when unassigned. Uses ObjectId ref for Mongoose population.
     * Future feature: agents can claim or be assigned tickets.
     */
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },

    /**
     * Chronological audit log of changes. New events are appended via $push;
     * entries are never mutated after being written. For a very long-lived,
     * high-volume ticket this array could grow large — at that point we'd
     * move it to a dedicated `ticket_events` collection with a foreign key.
     */
    history: {
      type: [TicketEventSchema],
      default: [],
    },

    /**
     * Denormalized snapshot of the last agent-driven change so dashboard
     * queries don't need to decode the full history just to show "handled
     * by" in a table cell.
     */
    lastUpdatedBy: {
      type: LastUpdatedBySchema,
      default: null,
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps.
    timestamps: true,

    // Customize JSON serialization for API responses.
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        // Normalize MongoDB's _id → id for API consistency.
        ret['id'] = ret['_id'];
        delete ret['_id'];
        // Remove Mongoose's internal version key.
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
// These indexes support the most common dashboard queries. They are defined
// here (not in a migration) because Mongoose auto-creates them on connection,
// which is ideal for this application's scale. For very large collections,
// you would create indexes via a migration script to avoid blocking writes.

/**
 * Compound index: status + createdAt (descending).
 * Supports the dashboard's default view: "show me all open tickets, newest first".
 * MongoDB can use the leading `status` field for filtering and the trailing
 * `createdAt` field for sorting without an in-memory sort.
 */
TicketSchema.index({ status: 1, createdAt: -1 });

/**
 * Compound index: status + priority.
 * Supports the common filter combination: "show me all open high-priority tickets".
 * Agents frequently use this to prioritize their work queue.
 */
TicketSchema.index({ status: 1, priority: 1 });

/**
 * Single-field index: priority.
 * Supports priority-only filtering across all statuses:
 * "show me everything that's high priority regardless of status".
 */
TicketSchema.index({ priority: 1 });

/**
 * Single-field index: createdAt (descending).
 * Supports sorting by creation date without any filters — used when the
 * dashboard shows all tickets sorted by newest first.
 */
TicketSchema.index({ createdAt: -1 });

/**
 * Single-field index: customerEmail.
 * Supports "show all tickets from this customer" lookups, useful for
 * agents investigating repeat issues from the same customer.
 */
TicketSchema.index({ customerEmail: 1 });

// ---------------------------------------------------------------------------
// Model Export
// ---------------------------------------------------------------------------

/**
 * The compiled Mongoose model.
 *
 * Usage:
 *   import { TicketModel } from '../models/Ticket';
 *   const tickets = await TicketModel.find({ status: 'open' }).lean();
 */
export const TicketModel = model<ITicketDocument>('Ticket', TicketSchema);
