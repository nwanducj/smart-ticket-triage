/**
 * Auth Service
 *
 * Contains the business logic for agent authentication: password hashing,
 * credential verification, and JWT token generation. This layer is
 * framework-agnostic — it knows nothing about Express, HTTP, or request
 * objects. It receives plain data, performs logic, and returns results.
 *
 * Why separate service from controller?
 * - Testability: we can unit-test auth logic without spinning up Express.
 * - Reusability: the same service can be called from a CLI script, a
 *   background job, or a different transport layer (e.g., GraphQL).
 */
import { RegisterInput, LoginInput } from './auth.schema';
/**
 * Register a new agent account.
 *
 * @param input - Validated registration data (email, password, name).
 * @returns The created agent (sans passwordHash) and a signed JWT.
 * @throws ConflictError if the email is already registered.
 *
 * NOTE: In production, this endpoint would be admin-only or disabled,
 * with agents provisioned by an admin. For this demo, it's open.
 */
export declare function registerAgent(input: RegisterInput): Promise<{
    agent: import("mongoose").FlattenMaps<import("../../models").IAgentDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    };
    token: string;
}>;
/**
 * Authenticate an agent with email and password.
 *
 * @param input - Validated login data (email, password).
 * @returns The agent (sans passwordHash) and a signed JWT.
 * @throws UnauthorizedError if credentials are invalid.
 *
 * Security note: We use the same error message for "email not found" and
 * "wrong password" to prevent email enumeration attacks. An attacker
 * cannot determine whether an email exists by observing the response.
 */
export declare function loginAgent(input: LoginInput): Promise<{
    agent: import("mongoose").FlattenMaps<import("../../models").IAgentDocument> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    };
    token: string;
}>;
