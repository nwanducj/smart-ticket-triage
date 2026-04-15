"use strict";
/**
 * Tickets Controller
 *
 * Handles the HTTP layer for ticket endpoints. Each method extracts data
 * from the request, delegates to the tickets service, and sends the
 * appropriate HTTP response. Controllers are thin — no business logic here.
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
exports.create = create;
exports.list = list;
exports.update = update;
exports.getById = getById;
const ticketsService = __importStar(require("./tickets.service"));
// ---------------------------------------------------------------------------
// Controller Methods
// ---------------------------------------------------------------------------
/**
 * POST /tickets (Public)
 *
 * Creates a new support ticket. The request body is already validated
 * by the Zod middleware. LLM classification happens asynchronously —
 * the response is returned immediately with status 201.
 */
async function create(req, res, next) {
    try {
        const input = req.body;
        const ticket = await ticketsService.createTicket(input);
        // 201 Created — the ticket exists in the database.
        // Priority and category will be null until the LLM classifies it.
        res.status(201).json({
            success: true,
            data: ticket,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /tickets (Protected)
 *
 * Returns a paginated, filterable list of tickets for the agent dashboard.
 * Query params are validated by the Zod middleware.
 */
async function list(req, res, next) {
    try {
        // req.query has been parsed/validated by validateQuery middleware.
        const query = req.query;
        const { tickets, pagination } = await ticketsService.listTickets(query);
        res.status(200).json({
            success: true,
            data: tickets,
            pagination,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /tickets/:id (Protected)
 *
 * Updates a ticket's status. The request body is validated by Zod.
 * Returns the updated ticket or 404 if not found.
 */
async function update(req, res, next) {
    try {
        const id = req.params['id'];
        const input = req.body;
        const ticket = await ticketsService.updateTicket(id, input);
        res.status(200).json({
            success: true,
            data: ticket,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /tickets/:id (Protected)
 *
 * Returns a single ticket by ID. Returns 404 if not found.
 */
async function getById(req, res, next) {
    try {
        const id = req.params['id'];
        const ticket = await ticketsService.getTicketById(id);
        res.status(200).json({
            success: true,
            data: ticket,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=tickets.controller.js.map