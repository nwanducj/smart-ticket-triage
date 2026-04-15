"use strict";
/**
 * Auth Routes
 *
 * Defines the Express routes for agent authentication. Each route is a
 * pipeline of middleware: rate limiter → validation → controller.
 *
 * POST /auth/register — Create a new agent account (open for demo).
 * POST /auth/login    — Authenticate and receive a JWT.
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
const rateLimiter_1 = require("../../middleware/rateLimiter");
const auth_schema_1 = require("./auth.schema");
const authController = __importStar(require("./auth.controller"));
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
/**
 * POST /auth/register
 *
 * Pipeline: rate limit → validate body → create agent.
 *
 * NOTE: In production, this endpoint would be restricted to admins or
 * disabled entirely, with agents provisioned via an admin panel or SSO.
 * For this demo, it's open so testers can create accounts freely.
 */
router.post('/register', rateLimiter_1.authRateLimiter, (0, validate_1.validate)(auth_schema_1.registerSchema), authController.register);
/**
 * POST /auth/login
 *
 * Pipeline: rate limit → validate body → authenticate.
 *
 * Rate limiting on login is critical — it makes brute-force password
 * attacks impractical by capping attempts per IP per time window.
 */
router.post('/login', rateLimiter_1.authRateLimiter, (0, validate_1.validate)(auth_schema_1.loginSchema), authController.login);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map