/**
 * Models Barrel Export
 *
 * Re-exports all Mongoose models from a single entry point so consumers
 * can write `import { AgentModel, TicketModel } from '../models'` instead
 * of importing from individual files. This keeps import statements short
 * and makes it easy to see all available models at a glance.
 */

export { AgentModel } from './Agent';
export type { IAgentDocument } from './Agent';

export { TicketModel } from './Ticket';
export type { ITicketDocument } from './Ticket';
