/**
 * Agent Entity Type
 * Defines the shape of a support agent / admin user in the system.
 * Agents authenticate via JWT and are assigned tickets. The "role" field
 * controls authorization: what actions each agent is allowed to perform.
 */

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

/**
 * Agent roles controlling authorization levels.
 *
 * "agent"    — can view, be assigned to, and update tickets. The default role
 *              for every new agent. Covers the vast majority of support staff.
 * "admin"    — full access: manage agents, override AI classifications,
 *              reassign tickets, view analytics. Reserved for team leads.
 * "readonly" — can view tickets and dashboards but cannot modify anything.
 *              Useful for stakeholders, auditors, or QA observers.
 */
export const AGENT_ROLES = ['agent', 'admin', 'readonly'] as const;

/** Union type derived from the const array. */
export type AgentRole = (typeof AGENT_ROLES)[number];

// ---------------------------------------------------------------------------
// Agent Entity
// ---------------------------------------------------------------------------

/**
 * The Agent entity as it appears in API responses (after toJSON transform).
 *
 * Note: `passwordHash` is deliberately omitted. The Mongoose toJSON
 * transform strips it so it never leaks into API responses. If you need
 * the full document (e.g., for password verification during login), query
 * Mongoose directly and access the raw document.
 */
export interface Agent {
  /** Unique identifier (MongoDB ObjectId serialized as string). */
  id: string;

  /**
   * Agent's email address. Used as the login credential.
   * Stored as lowercase in the database to avoid case-sensitivity issues
   * (e.g., "Alice@Example.com" and "alice@example.com" are the same account).
   */
  email: string;

  /** Display name shown in the UI and ticket assignment views. */
  name: string;

  /** Authorization role. Determines what actions the agent can perform. */
  role: AgentRole;

  /** ISO-8601 timestamp of when the agent account was created. */
  createdAt: string;

  /** ISO-8601 timestamp of the last profile update. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// JWT Payload
// ---------------------------------------------------------------------------

/**
 * The data we embed inside every JWT issued at login.
 *
 * We keep the payload minimal — only the fields needed for authentication
 * and coarse authorization. Detailed permissions are looked up from the
 * database when needed, so revoking a role takes effect immediately
 * without waiting for the token to expire.
 */
export interface AgentJwtPayload {
  /** The agent's MongoDB ObjectId (as a string). */
  id: string;
  /** The agent's email — useful for logging without a DB lookup. */
  email: string;
  /** The agent's role at the time the token was issued. */
  role: AgentRole;
}
