/**
 * Agent Mongoose Model
 *
 * Defines the MongoDB schema for support agents who authenticate via JWT
 * and manage tickets through the dashboard. Passwords are stored as bcrypt
 * hashes — never plaintext. The `role` field enables future RBAC expansion
 * (currently only 'agent' is actively used).
 *
 * Why Mongoose over the raw MongoDB driver?
 * Mongoose gives us schema validation at the data layer, type-safe queries,
 * middleware hooks (e.g., pre-save for hashing), and automatic index creation
 * — all things we would otherwise have to build and maintain manually.
 */
import { Document } from 'mongoose';
import { AgentRole } from '../types/agent';
/**
 * The raw Mongoose document shape for an Agent.
 *
 * This extends Document so we get Mongoose methods (.save(), .toJSON(), etc.)
 * on instances returned from queries. For API responses, the toJSON transform
 * below strips internal fields like passwordHash and __v.
 */
export interface IAgentDocument extends Document {
    email: string;
    passwordHash: string;
    name: string;
    role: AgentRole;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * The compiled Mongoose model.
 *
 * Usage:
 *   import { AgentModel } from '../models/Agent';
 *   const agent = await AgentModel.findOne({ email }).lean();
 */
export declare const AgentModel: import("mongoose").Model<IAgentDocument, {}, {}, {}, Document<unknown, {}, IAgentDocument, {}, {}> & IAgentDocument & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
