"use strict";
/**
 * Models Barrel Export
 *
 * Re-exports all Mongoose models from a single entry point so consumers
 * can write `import { AgentModel, TicketModel } from '../models'` instead
 * of importing from individual files. This keeps import statements short
 * and makes it easy to see all available models at a glance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketModel = exports.AgentModel = void 0;
var Agent_1 = require("./Agent");
Object.defineProperty(exports, "AgentModel", { enumerable: true, get: function () { return Agent_1.AgentModel; } });
var Ticket_1 = require("./Ticket");
Object.defineProperty(exports, "TicketModel", { enumerable: true, get: function () { return Ticket_1.TicketModel; } });
//# sourceMappingURL=index.js.map