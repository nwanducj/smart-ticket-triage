"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketModel = void 0;
const mongoose_1 = require("mongoose");
const ticket_1 = require("../types/ticket");
// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------
const TicketSchema = new mongoose_1.Schema({
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
            values: [...ticket_1.TICKET_STATUSES],
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
            values: [...ticket_1.TICKET_PRIORITIES],
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
            values: [...ticket_1.TICKET_CATEGORIES],
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null,
    },
}, {
    // Automatically manage createdAt and updatedAt timestamps.
    timestamps: true,
    // Customize JSON serialization for API responses.
    toJSON: {
        transform: (_doc, ret) => {
            // Normalize MongoDB's _id → id for API consistency.
            ret['id'] = ret['_id'];
            delete ret['_id'];
            // Remove Mongoose's internal version key.
            delete ret['__v'];
            return ret;
        },
    },
});
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
exports.TicketModel = (0, mongoose_1.model)('Ticket', TicketSchema);
//# sourceMappingURL=Ticket.js.map