"use strict";
/**
 * Ticket Entity Types & Enums
 * Defines the canonical shape of a Ticket and the allowed values for its
 * enumerated fields. We use "as const" objects + derived union types instead
 * of TypeScript enums for three reasons:
 * 1. They produce zero runtime JS (no IIFE), reducing bundle size.
 * 2. They are plain objects, so they work with JSON.parse and Zod out of the box.
 * 3. They are easier to iterate over (Object.values) for validation and UI rendering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKET_CATEGORIES = exports.TICKET_PRIORITIES = exports.TICKET_STATUSES = void 0;
// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
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
exports.TICKET_STATUSES = [
    'open',
    'in_progress',
    'waiting_on_customer',
    'resolved',
    'closed',
];
// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------
/**
 * Urgency levels assigned by the AI classifier (or manually overridden).
 *
 * "critical" — system down, data loss, security breach. SLA: 1 hour.
 * "high"     — major feature broken, many users affected. SLA: 4 hours.
 * "medium"   — partial feature issue, workaround exists. SLA: 24 hours.
 * "low"      — cosmetic issue, feature request, general question. SLA: 72 hours.
 */
exports.TICKET_PRIORITIES = [
    'critical',
    'high',
    'medium',
    'low',
];
// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
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
exports.TICKET_CATEGORIES = [
    'bug',
    'feature_request',
    'billing',
    'account',
    'technical_support',
    'general',
];
//# sourceMappingURL=ticket.js.map