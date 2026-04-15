"use strict";
/**
 * Ticket Routes
 *
 * Defines Express routes for ticket CRUD operations.
 *
 * POST /tickets       — Public: customer submits a ticket (rate-limited).
 * GET  /tickets       — Protected: agents list tickets with filters.
 * GET  /tickets/:id   — Protected: agents view a single ticket.
 * PATCH /tickets/:id  — Protected: agents update ticket status.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const tickets_schema_1 = require("./tickets.schema");
const ticketsController = __importStar(require("./tickets.controller"));
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Public Routes
// ---------------------------------------------------------------------------
/**
 * POST /tickets
 *
 * Pipeline: rate limit → validate body → create ticket.
 *
 * No auth required — customers submit tickets without an account.
 * Rate limiting prevents abuse and protects LLM API credits.
 */
router.post('/', rateLimiter_1.ticketSubmissionLimiter, (0, validate_1.validate)(tickets_schema_1.createTicketSchema), ticketsController.create);
// ---------------------------------------------------------------------------
// Protected Routes (require JWT)
// ---------------------------------------------------------------------------
/**
 * GET /tickets
 *
 * Pipeline: auth → validate query params → list tickets.
 *
 * Returns paginated results with optional status/priority/category filters.
 */
router.get('/', auth_1.authMiddleware, (0, validate_1.validateQuery)(tickets_schema_1.listTicketsQuerySchema), ticketsController.list);
/**
 * GET /tickets/:id
 *
 * Pipeline: auth → get single ticket.
 */
router.get('/:id', auth_1.authMiddleware, ticketsController.getById);
/**
 * PATCH /tickets/:id
 *
 * Pipeline: auth → validate body → update ticket status.
 */
router.patch('/:id', auth_1.authMiddleware, (0, validate_1.validate)(tickets_schema_1.updateTicketSchema), ticketsController.update);
exports.default = router;
//# sourceMappingURL=tickets.routes.js.map