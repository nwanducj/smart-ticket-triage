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

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AgentModel } from '../../models';
import { UnauthorizedError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { AgentJwtPayload } from '../../types/agent';
import { RegisterInput, LoginInput } from './auth.schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * bcrypt salt rounds.
 *
 * 12 rounds ≈ 250ms per hash on modern hardware — a good balance between
 * security (makes brute-forcing expensive) and user experience (login
 * doesn't feel slow). OWASP recommends 10+ rounds; 12 adds a safety margin.
 */
const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

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
export async function registerAgent(input: RegisterInput) {
  const { email, password, name } = input;

  // Check if an agent with this email already exists.
  // We check here (not just rely on the unique index) so we can return
  // a friendly 409 instead of a cryptic MongoDB duplicate key error.
  const existingAgent = await AgentModel.findOne({ email }).lean();

  if (existingAgent) {
    throw new ConflictError('An agent with this email already exists.');
  }

  // Hash the password before storage. bcrypt.hash() generates a random
  // salt and embeds it in the output string, so we don't store it separately.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create the agent document. Mongoose validates against the schema
  // (required fields, enum values, etc.) before writing to MongoDB.
  const agent = await AgentModel.create({
    email,
    passwordHash,
    name,
  });

  // Generate a JWT for immediate login after registration.
  const token = generateToken({
    id: agent._id.toString(),
    email: agent.email,
    role: agent.role,
  });

  logger.info('Agent registered', { agentId: agent._id, email });

  // Return the agent through toJSON() which strips passwordHash.
  return {
    agent: agent.toJSON(),
    token,
  };
}

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
export async function loginAgent(input: LoginInput) {
  const { email, password } = input;

  // We need the passwordHash for comparison, so we can't use .lean()
  // (which returns a plain object and respects the toJSON transform).
  // Instead, we query the full Mongoose document.
  const agent = await AgentModel.findOne({ email });

  if (!agent) {
    // Generic message — don't reveal that the email doesn't exist.
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Compare the provided password against the stored bcrypt hash.
  // bcrypt.compare() extracts the salt from the hash and re-hashes
  // the input to see if they match. This is timing-safe by design.
  const isPasswordValid = await bcrypt.compare(password, agent.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Generate a JWT for the authenticated session.
  const token = generateToken({
    id: agent._id.toString(),
    email: agent.email,
    role: agent.role,
  });

  logger.info('Agent logged in', { agentId: agent._id, email });

  return {
    agent: agent.toJSON(),
    token,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a signed JWT with the agent's identity claims.
 *
 * @param payload - The data to embed in the token (id, email, role).
 * @returns A signed JWT string.
 *
 * Token expiry is read from config (default: 24h). We keep the payload
 * minimal — only fields needed for auth and coarse authorization.
 * Detailed permissions are looked up from the database when needed.
 */
function generateToken(payload: AgentJwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}
