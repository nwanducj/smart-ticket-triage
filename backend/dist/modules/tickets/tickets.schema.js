"use strict";
/**
 * Ticket Zod Schemas
 *
 * Defines validation schemas for all ticket-related endpoints. These run
 * at the HTTP layer via the validate/validateQuery middleware, ensuring
 * requests are well-formed before they reach the service layer.
 *
 * Schema design mirrors the Mongoose model constraints but is intentionally
 * independent — Zod validates the HTTP request shape, Mongoose validates
 * the data before it hits the database. Defense in depth.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTicketsQuerySchema = exports.updateTicketSchema = exports.createTicketSchema = void 0;
const zod_1 = require("zod");
const ticket_1 = require("../../types/ticket");
// ---------------------------------------------------------------------------
// Create Ticket Schema (Public — customer submission)
// ---------------------------------------------------------------------------
/**
 * Validates POST /tickets request body.
 *
 * Only the fields a customer provides: title, description, email.
 * Status, priority, category are set by the system, not the customer.
 */
exports.createTicketSchema = zod_1.z.object({
    title: zod_1.z
        .string({ required_error: 'Title is required' })
        .min(1, 'Title cannot be empty')
        .max(500, 'Title cannot exceed 500 characters')
        .trim(),
    description: zod_1.z
        .string({ required_error: 'Description is required' })
        .min(1, 'Description cannot be empty')
        .max(5000, 'Description cannot exceed 5000 characters')
        .trim(),
    customerEmail: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
});
// ---------------------------------------------------------------------------
// Update Ticket Schema (Protected — agent status update)
// ---------------------------------------------------------------------------
/**
 * Validates PATCH /tickets/:id request body.
 *
 * Currently only status can be updated by agents via the dashboard.
 * Priority and category could be added here in the future for manual
 * override of AI classifications.
 */
exports.updateTicketSchema = zod_1.z.object({
    status: zod_1.z.enum(ticket_1.TICKET_STATUSES, {
        errorMap: () => ({
            message: `Status must be one of: ${ticket_1.TICKET_STATUSES.join(', ')}`,
        }),
    }),
});
// ---------------------------------------------------------------------------
// List Tickets Query Schema (Protected — dashboard filters)
// ---------------------------------------------------------------------------
/**
 * Validates GET /tickets query parameters.
 *
 * All fields are optional with sensible defaults. Using z.coerce for
 * numeric fields because query params arrive as strings from the URL.
 *
 * Why validate query params at all?
 * Without validation, an invalid status filter (e.g., ?status=banana)
 * would silently return zero results — confusing for the agent. By
 * validating, we return a clear error message.
 */
exports.listTicketsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce
        .number()
        .int()
        .positive()
        .default(1)
        .optional(),
    limit: zod_1.z.coerce
        .number()
        .int()
        .positive()
        .max(100, 'Limit cannot exceed 100')
        .default(20)
        .optional(),
    status: zod_1.z
        .enum(ticket_1.TICKET_STATUSES, {
        errorMap: () => ({
            message: `Status must be one of: ${ticket_1.TICKET_STATUSES.join(', ')}`,
        }),
    })
        .optional(),
    priority: zod_1.z
        .enum(ticket_1.TICKET_PRIORITIES, {
        errorMap: () => ({
            message: `Priority must be one of: ${ticket_1.TICKET_PRIORITIES.join(', ')}`,
        }),
    })
        .optional(),
    category: zod_1.z
        .enum(ticket_1.TICKET_CATEGORIES, {
        errorMap: () => ({
            message: `Category must be one of: ${ticket_1.TICKET_CATEGORIES.join(', ')}`,
        }),
    })
        .optional(),
    sort: zod_1.z
        .enum(['createdAt', 'priority', 'updatedAt'], {
        errorMap: () => ({
            message: 'Sort must be one of: createdAt, priority, updatedAt',
        }),
    })
        .default('createdAt')
        .optional(),
    order: zod_1.z
        .enum(['asc', 'desc'], {
        errorMap: () => ({
            message: 'Order must be one of: asc, desc',
        }),
    })
        .default('desc')
        .optional(),
});
//# sourceMappingURL=tickets.schema.js.map