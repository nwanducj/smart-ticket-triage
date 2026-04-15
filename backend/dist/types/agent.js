"use strict";
/**
 * Agent Entity Type
 * Defines the shape of a support agent / admin user in the system.
 * Agents authenticate via JWT and are assigned tickets. The "role" field
 * controls authorization: what actions each agent is allowed to perform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_ROLES = void 0;
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
exports.AGENT_ROLES = ['agent', 'admin', 'readonly'];
//# sourceMappingURL=agent.js.map