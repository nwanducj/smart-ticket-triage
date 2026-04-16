/**
 * Centralized Configuration Module
 * Reads all environment variables, validates them with Zod at startup, and
 * exports a single strongly-typed config object. Fail-fast: if any required
 * variable is missing or malformed, the process crashes immediately with a
 * clear error message — far better than a cryptic runtime failure minutes later.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file BEFORE we read process.env. In production the variables come
// from the container/orchestrator, but dotenv harmlessly no-ops if .env is absent.
dotenv.config();

// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------
// We define the expected shape and constraints of every environment variable
// here. Zod gives us parsing + validation + type inference in one step.
// Using z.coerce for numeric fields so string env vars like "4000" become
// actual numbers without manual parseInt scattered throughout the codebase.

const envSchema = z.object({
  // --- Database ---
  // Must be a non-empty string. We don't validate URI format here because
  // Mongoose itself will produce a clearer error on invalid URIs.
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI cannot be empty'),

  // --- Server ---
  // Coerce string to number; default 4000 keeps us out of the way of
  // frontend dev servers that typically run on 3000 or 5173.
  PORT: z.coerce.number().int().positive().default(4000),

  // --- Auth ---
  // JWT_SECRET must be present; we refuse to start without it because
  // an unsigned/weak token is a critical security hole.
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(1, 'JWT_SECRET cannot be empty'),

  // Default to 8 hours — a reasonable session length for support agents
  // who work in shifts. The jsonwebtoken library parses this string.
  JWT_EXPIRES_IN: z.string().default('8h'),

  // --- AI / LLM ---
  // Generic completions-API configuration. We talk to any provider that
  // implements the OpenAI-compatible `/chat/completions` contract: OpenAI,
  // OpenRouter, Groq, Together, local Ollama/vLLM, etc. This means the
  // model can be swapped at runtime via LLM_MODEL without code changes,
  // and the provider can be swapped via LLM_BASE_URL without redeploy.

  // Base URL of the completions endpoint. Defaults to OpenAI, but point
  // it at OpenRouter (https://openrouter.ai/api/v1) for access to 100+
  // models including Claude/Gemini/Llama from one account.
  LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),

  // API key for whichever provider LLM_BASE_URL points to. Optional so
  // the app still starts in mock mode without a real key.
  LLM_API_KEY: z.string().default(''),

  // Which model to invoke — the string is passed through to the provider
  // unchanged. Examples by provider:
  //   OpenAI:     gpt-4o-mini, gpt-4o, gpt-4.1
  //   OpenRouter: anthropic/claude-sonnet-4, google/gemini-2.0-flash
  //   Groq:       llama-3.1-70b-versatile
  LLM_MODEL: z.string().default('gpt-4o-mini'),

  // When "true", the LLM service returns canned responses. This avoids
  // burning API credits during development and keeps tests deterministic.
  // We accept common truthy strings and coerce to a boolean.
  LLM_MOCK: z
    .string()
    .default('false')
    .transform((val) => val === 'true' || val === '1' || val === 'yes'),

  // Timeout ceiling for a single LLM request. 15 s default is generous
  // for a classification call that usually completes in 2-5 s.
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  // Number of retries on transient LLM failures. More than 3 is rarely
  // useful — exponential backoff makes the total wait uncomfortably long.
  LLM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),

  // --- Runtime ---
  // NODE_ENV controls Express behavior (error stacks, etc.) and our own
  // conditional logic. Restrict to known values so a typo like "prod"
  // doesn't silently bypass production guards.
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// ---------------------------------------------------------------------------
// Parsing & Validation
// ---------------------------------------------------------------------------
// safeParse returns a discriminated union so we can format a friendly error
// message listing every invalid/missing variable at once, rather than failing
// on the first one and making the developer fix them one at a time.

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Log each validation issue so the developer knows exactly what to fix.
  console.error(
    '=== INVALID ENVIRONMENT VARIABLES ===\n',
    parsed.error.flatten().fieldErrors
  );

  // Crash immediately. There is no safe way to continue with bad config.
  // A non-zero exit code signals the process manager to not restart blindly.
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Typed Export
// ---------------------------------------------------------------------------
// Every other module imports this single object. Changes to env var names
// or defaults happen here and only here — the rest of the codebase is
// insulated from the raw process.env.

export const config = parsed.data;

// Also export the inferred type so other modules can reference it without
// importing Zod. Useful for dependency injection in tests.
export type Config = z.infer<typeof envSchema>;
