/**
 * Shared Frontend TypeScript Types
 *
 * Mirrors the backend entity types so the frontend has type safety when
 * consuming API responses. These types are manually maintained — in a
 * larger project, you'd generate them from an OpenAPI spec or shared
 * package to prevent drift.
 */

// ---------------------------------------------------------------------------
// Enums / Constants
// ---------------------------------------------------------------------------

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_on_customer',
  'resolved',
  'closed',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'bug',
  'feature_request',
  'billing',
  'account',
  'technical_support',
  'general',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** Snapshot of the agent who last took action on a ticket. */
export interface LastUpdatedBy {
  agentId: string;
  name: string;
  email: string;
  at: string;
}

/** One event in a ticket's audit log. */
export interface TicketHistoryEvent {
  type: 'status_change' | 'classified' | 'created';
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  note: string | null;
  at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority | null;
  category: TicketCategory | null;
  aiConfidence: number | null;
  aiClassificationFailed: boolean;
  assignedAgent: string | null;
  lastUpdatedBy: LastUpdatedBy | null;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API Response Shapes
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    skip: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface AuthResponse {
  agent: Agent;
  token: string;
}

// ---------------------------------------------------------------------------
// Query Parameters
// ---------------------------------------------------------------------------

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  sort?: 'createdAt' | 'priority' | 'updatedAt';
  order?: 'asc' | 'desc';
}
