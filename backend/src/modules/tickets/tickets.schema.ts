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

import { z } from 'zod';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES } from '../../types/ticket';

// ---------------------------------------------------------------------------
// Create Ticket Schema (Public — customer submission)
// ---------------------------------------------------------------------------

/**
 * Validates POST /tickets request body.
 *
 * Only the fields a customer provides: title, description, email.
 * Status, priority, category are set by the system, not the customer.
 */
export const createTicketSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title cannot be empty')
    .max(500, 'Title cannot exceed 500 characters')
    .trim(),

  description: z
    .string({ required_error: 'Description is required' })
    .min(3, 'Description cannot be empty')
    .max(5000, 'Description cannot exceed 5000 characters')
    .trim(),

  customerEmail: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
});

/** TypeScript type inferred from the create ticket schema. */
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

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
export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES as unknown as [string, ...string[]], {
    errorMap: () => ({
      message: `Status must be one of: ${TICKET_STATUSES.join(', ')}`,
    }),
  }),
});

/** TypeScript type inferred from the update ticket schema. */
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

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
export const listTicketsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .optional(),

  status: z
    .enum(TICKET_STATUSES as unknown as [string, ...string[]], {
      errorMap: () => ({
        message: `Status must be one of: ${TICKET_STATUSES.join(', ')}`,
      }),
    })
    .optional(),

  priority: z
    .enum(TICKET_PRIORITIES as unknown as [string, ...string[]], {
      errorMap: () => ({
        message: `Priority must be one of: ${TICKET_PRIORITIES.join(', ')}`,
      }),
    })
    .optional(),

  category: z
    .enum(TICKET_CATEGORIES as unknown as [string, ...string[]], {
      errorMap: () => ({
        message: `Category must be one of: ${TICKET_CATEGORIES.join(', ')}`,
      }),
    })
    .optional(),

  sort: z
    .enum(['createdAt', 'priority', 'updatedAt'], {
      errorMap: () => ({
        message: 'Sort must be one of: createdAt, priority, updatedAt',
      }),
    })
    .default('createdAt')
    .optional(),

  order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({
        message: 'Order must be one of: asc, desc',
      }),
    })
    .default('desc')
    .optional(),
});

/** TypeScript type inferred from the list query schema. */
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
