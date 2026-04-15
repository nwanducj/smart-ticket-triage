"use strict";
/**
 * Auth Zod Schemas
 *
 * Defines request body validation schemas for authentication endpoints.
 * These schemas run at the HTTP layer via the validate() middleware,
 * catching malformed requests before they reach the auth service.
 *
 * Why Zod instead of Joi or express-validator?
 * - Zod infers TypeScript types from schemas (z.infer), so we define
 *   the shape once and get both runtime validation and compile-time types.
 * - Zod's API is more composable and tree-shakeable than Joi.
 * - express-validator is middleware-based and harder to unit test.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Register Schema
// ---------------------------------------------------------------------------
/**
 * Validates the request body for POST /auth/register.
 *
 * Constraints:
 * - email: must be a valid email format (Zod's built-in email validator).
 * - password: minimum 8 characters — balances security with usability.
 *   OWASP recommends 8+ chars as the minimum for user-chosen passwords.
 * - name: 1–100 characters, trimmed — prevents empty names and absurdly
 *   long strings that could break UI layouts.
 */
exports.registerSchema = zod_1.z.object({
    email: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
    password: zod_1.z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters'),
    name: zod_1.z
        .string({ required_error: 'Name is required' })
        .min(1, 'Name cannot be empty')
        .max(100, 'Name cannot exceed 100 characters')
        .trim(),
});
// ---------------------------------------------------------------------------
// Login Schema
// ---------------------------------------------------------------------------
/**
 * Validates the request body for POST /auth/login.
 *
 * Minimal validation — we only check that both fields are present and
 * the email is well-formed. We intentionally don't enforce password
 * complexity here because login should accept whatever the user types
 * and let the bcrypt comparison determine correctness.
 */
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),
    password: zod_1.z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required'),
});
//# sourceMappingURL=auth.schema.js.map