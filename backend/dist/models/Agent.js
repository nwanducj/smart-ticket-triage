"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentModel = void 0;
const mongoose_1 = require("mongoose");
const agent_1 = require("../types/agent");
// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------
const AgentSchema = new mongoose_1.Schema({
    /**
     * Agent's email — used as the login credential.
     * `lowercase` and `trim` normalize inputs so "Alice@Example.com " and
     * "alice@example.com" resolve to the same account, preventing duplicate
     * registrations and login confusion.
     */
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    /**
     * bcrypt hash of the agent's password.
     * We store the hash — never the plaintext — so that even a full database
     * breach does not directly expose credentials. bcrypt includes the salt
     * in the hash string, so we don't need a separate salt field.
     */
    passwordHash: {
        type: String,
        required: [true, 'Password hash is required'],
    },
    /**
     * Display name shown in the dashboard UI and ticket assignment views.
     * `trim` removes accidental whitespace from form submissions.
     */
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    /**
     * Authorization role controlling what the agent can do.
     * Currently only 'agent' is actively enforced; 'admin' and 'readonly'
     * are defined in the enum for future RBAC expansion without a migration.
     */
    role: {
        type: String,
        enum: {
            values: [...agent_1.AGENT_ROLES],
            message: 'Role must be one of: {VALUE}',
        },
        default: 'agent',
    },
}, {
    // Automatically manage createdAt and updatedAt timestamps.
    // This avoids manual Date.now() calls and ensures consistent naming.
    timestamps: true,
    // Customize the JSON serialization for API responses.
    toJSON: {
        transform: (_doc, ret) => {
            // Normalize MongoDB's _id to a frontend-friendly "id" field.
            ret['id'] = ret['_id'];
            delete ret['_id'];
            // Remove Mongoose's internal version key — clients don't need it.
            delete ret['__v'];
            // CRITICAL: Never expose the password hash in API responses.
            // This is our last line of defense — even if a developer forgets
            // to exclude it in the controller, the model itself strips it.
            delete ret['passwordHash'];
            return ret;
        },
    },
});
// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
/**
 * Unique index on email for fast login lookups.
 *
 * Login is the most frequent Agent query — it runs on every authentication
 * attempt. Without an index, MongoDB would scan every document. The `unique`
 * constraint also prevents duplicate registrations at the database level,
 * serving as a safety net behind our application-level checks.
 *
 * Note: `unique: true` in the schema field definition already creates this
 * index, but we declare it explicitly here for documentation clarity and
 * to keep all index definitions in one visible block.
 */
AgentSchema.index({ email: 1 }, { unique: true });
// ---------------------------------------------------------------------------
// Model Export
// ---------------------------------------------------------------------------
/**
 * The compiled Mongoose model.
 *
 * Usage:
 *   import { AgentModel } from '../models/Agent';
 *   const agent = await AgentModel.findOne({ email }).lean();
 */
exports.AgentModel = (0, mongoose_1.model)('Agent', AgentSchema);
//# sourceMappingURL=Agent.js.map