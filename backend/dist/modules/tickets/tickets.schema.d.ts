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
/**
 * Validates POST /tickets request body.
 *
 * Only the fields a customer provides: title, description, email.
 * Status, priority, category are set by the system, not the customer.
 */
export declare const createTicketSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    customerEmail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    customerEmail: string;
}, {
    description: string;
    title: string;
    customerEmail: string;
}>;
/** TypeScript type inferred from the create ticket schema. */
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
/**
 * Validates PATCH /tickets/:id request body.
 *
 * Currently only status can be updated by agents via the dashboard.
 * Priority and category could be added here in the future for manual
 * override of AI classifications.
 */
export declare const updateTicketSchema: z.ZodObject<{
    status: z.ZodEnum<[string, ...string[]]>;
}, "strip", z.ZodTypeAny, {
    status: string;
}, {
    status: string;
}>;
/** TypeScript type inferred from the update ticket schema. */
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
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
export declare const listTicketsQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    priority: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    category: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    sort: z.ZodOptional<z.ZodDefault<z.ZodEnum<["createdAt", "priority", "updatedAt"]>>>;
    order: z.ZodOptional<z.ZodDefault<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    sort?: "createdAt" | "updatedAt" | "priority" | undefined;
    status?: string | undefined;
    priority?: string | undefined;
    category?: string | undefined;
    page?: number | undefined;
    order?: "asc" | "desc" | undefined;
}, {
    limit?: number | undefined;
    sort?: "createdAt" | "updatedAt" | "priority" | undefined;
    status?: string | undefined;
    priority?: string | undefined;
    category?: string | undefined;
    page?: number | undefined;
    order?: "asc" | "desc" | undefined;
}>;
/** TypeScript type inferred from the list query schema. */
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
