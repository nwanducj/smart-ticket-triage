"use strict";
/**
 * Auth Controller
 *
 * Handles the HTTP layer for authentication endpoints. Each method:
 * 1. Extracts validated data from the request (already parsed by Zod middleware).
 * 2. Delegates to the auth service for business logic.
 * 3. Sends the appropriate HTTP response.
 *
 * Controllers are intentionally thin — they contain no business logic.
 * If you find yourself writing an if/else for a business rule here,
 * it belongs in the service layer instead.
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
exports.register = register;
exports.login = login;
const authService = __importStar(require("./auth.service"));
// ---------------------------------------------------------------------------
// Controller Methods
// ---------------------------------------------------------------------------
/**
 * POST /auth/register
 *
 * Creates a new agent account and returns the agent profile + JWT.
 * The request body is already validated by the Zod middleware before
 * this handler runs, so we can safely cast req.body to RegisterInput.
 *
 * @returns 201 with { success, data: { agent, token } }
 */
async function register(req, res, next) {
    try {
        const input = req.body;
        const result = await authService.registerAgent(input);
        // 201 Created — a new resource (agent) was successfully created.
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Pass errors to the global error handler.
        // The service throws ConflictError (409) for duplicate emails
        // and any unexpected errors bubble up as 500s.
        next(error);
    }
}
/**
 * POST /auth/login
 *
 * Authenticates an agent and returns the agent profile + JWT.
 *
 * @returns 200 with { success, data: { agent, token } }
 */
async function login(req, res, next) {
    try {
        const input = req.body;
        const result = await authService.loginAgent(input);
        // 200 OK — authentication succeeded, returning existing resource.
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // The service throws UnauthorizedError (401) for bad credentials.
        next(error);
    }
}
//# sourceMappingURL=auth.controller.js.map