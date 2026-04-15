/**
 * Ticket Mongoose Model
 *
 * Defines the MongoDB schema for support tickets. Each ticket is created by
 * a customer (no account needed) and triaged by the LLM on creation. Agents
 * update status via the dashboard.
 *
 * Key design decisions:
 * - priority and category default to null (unclassified until LLM or fallback runs)
 * - aiClassificationFailed flags tickets where the LLM was unavailable
 * - aiConfidence stores the LLM's self-reported confidence (0.00–1.00)
 * - assignedAgent is a reference for future agent assignment features
 * - Indexes are defined explicitly at the bottom for visibility and documentation
 */
import { Document, Types } from 'mongoose';
import { TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
/**
 * The raw Mongoose document shape for a Ticket.
 *
 * Extends Document for Mongoose methods. Priority and category are nullable
 * because a ticket exists in the database before the LLM has classified it —
 * the classification happens asynchronously after creation.
 */
export interface ITicketDocument extends Document {
    title: string;
    description: string;
    customerEmail: string;
    status: TicketStatus;
    priority: TicketPriority | null;
    category: TicketCategory | null;
    aiConfidence: number | null;
    aiClassificationFailed: boolean;
    assignedAgent: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * The compiled Mongoose model.
 *
 * Usage:
 *   import { TicketModel } from '../models/Ticket';
 *   const tickets = await TicketModel.find({ status: 'open' }).lean();
 */
export declare const TicketModel: import("mongoose").Model<ITicketDocument, {}, {}, {}, Document<unknown, {}, ITicketDocument, {}, {}> & ITicketDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
