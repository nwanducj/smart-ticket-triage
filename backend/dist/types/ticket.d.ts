/**
 * Ticket Entity Types & Enums
 * Defines the canonical shape of a Ticket and the allowed values for its
 * enumerated fields. We use "as const" objects + derived union types instead
 * of TypeScript enums for three reasons:
 * 1. They produce zero runtime JS (no IIFE), reducing bundle size.
 * 2. They are plain objects, so they work with JSON.parse and Zod out of the box.
 * 3. They are easier to iterate over (Object.values) for validation and UI rendering.
 */
/**
 * All possible lifecycle states of a ticket.
 *
 * Flow: open -> in_progress -> resolved -> closed
 *               in_progress -> waiting_on_customer -> in_progress
 *
 * "open"                 — just created, not yet picked up by an agent.
 * "in_progress"          — an agent is actively working on it.
 * "waiting_on_customer"  — agent needs more info from the customer.
 * "resolved"             — agent believes the issue is fixed.
 * "closed"               — ticket is done; no further action expected.
 */
export declare const TICKET_STATUSES: readonly ["open", "in_progress", "waiting_on_customer", "resolved", "closed"];
/** Union type derived from the const array — e.g. 'open' | 'in_progress' | ... */
export type TicketStatus = (typeof TICKET_STATUSES)[number];
/**
 * Urgency levels assigned by the AI classifier (or manually overridden).
 *
 * "critical" — system down, data loss, security breach. SLA: 1 hour.
 * "high"     — major feature broken, many users affected. SLA: 4 hours.
 * "medium"   — partial feature issue, workaround exists. SLA: 24 hours.
 * "low"      — cosmetic issue, feature request, general question. SLA: 72 hours.
 */
export declare const TICKET_PRIORITIES: readonly ["critical", "high", "medium", "low"];
/** Union type derived from the const array. */
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
/**
 * Topic categories for routing tickets to the right team.
 *
 * The AI classifier picks one of these based on the ticket description.
 * Categories map directly to support team specializations:
 *
 * "bug"              — something is broken; route to engineering on-call.
 * "feature_request"  — customer wants new functionality; route to product.
 * "billing"          — payment, invoice, subscription issues; route to finance.
 * "account"          — login, permissions, profile changes; route to support.
 * "technical_support"— how-to questions, integration help; route to support.
 * "general"          — catch-all for anything that doesn't fit above.
 */
export declare const TICKET_CATEGORIES: readonly ["bug", "feature_request", "billing", "account", "technical_support", "general"];
/** Union type derived from the const array. */
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
/**
 * The full Ticket entity as it appears after being read from the database.
 *
 * This interface is used for type-checking in services and controllers.
 * The Mongoose model adds its own Document methods on top; this interface
 * represents the "plain data" shape.
 */
export interface Ticket {
    /** Unique identifier (MongoDB ObjectId serialized as a string). */
    id: string;
    /** Short summary of the issue, written by the customer. */
    title: string;
    /** Detailed description of the problem or request. */
    description: string;
    /** Email address of the customer who submitted the ticket. */
    customerEmail: string;
    /** Current lifecycle state. See TICKET_STATUSES for allowed values. */
    status: TicketStatus;
    /** Urgency level, typically set by the AI classifier. */
    priority: TicketPriority;
    /** Topic category, typically set by the AI classifier. */
    category: TicketCategory;
    /**
     * How confident the AI was in its classification (0.0 – 1.0).
     * Null when classification has not run yet or was skipped.
     * Agents can use this to decide whether to trust or override the AI.
     */
    aiConfidence: number | null;
    /**
     * True when the AI classification attempt failed (timeout, API error, etc.).
     * The ticket still exists but was not auto-triaged; an agent must classify
     * it manually. Default false.
     */
    aiClassificationFailed: boolean;
    /**
     * Reference to the Agent assigned to this ticket (ObjectId as string).
     * Null when the ticket is unassigned.
     */
    assignedAgent: string | null;
    /** ISO-8601 timestamp of when the ticket was created. */
    createdAt: string;
    /** ISO-8601 timestamp of the last update. */
    updatedAt: string;
}
