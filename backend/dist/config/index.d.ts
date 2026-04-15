/**
 * Centralized Configuration Module
 * Reads all environment variables, validates them with Zod at startup, and
 * exports a single strongly-typed config object. Fail-fast: if any required
 * variable is missing or malformed, the process crashes immediately with a
 * clear error message — far better than a cryptic runtime failure minutes later.
 */
import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    MONGODB_URI: z.ZodString;
    PORT: z.ZodDefault<z.ZodNumber>;
    JWT_SECRET: z.ZodString;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    ANTHROPIC_API_KEY: z.ZodDefault<z.ZodString>;
    LLM_MODEL: z.ZodDefault<z.ZodString>;
    LLM_MOCK: z.ZodEffects<z.ZodDefault<z.ZodString>, boolean, string | undefined>;
    LLM_TIMEOUT_MS: z.ZodDefault<z.ZodNumber>;
    LLM_MAX_RETRIES: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "test" | "development";
    MONGODB_URI: string;
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    ANTHROPIC_API_KEY: string;
    LLM_MODEL: string;
    LLM_MOCK: boolean;
    LLM_TIMEOUT_MS: number;
    LLM_MAX_RETRIES: number;
}, {
    MONGODB_URI: string;
    JWT_SECRET: string;
    NODE_ENV?: "production" | "test" | "development" | undefined;
    PORT?: number | undefined;
    JWT_EXPIRES_IN?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    LLM_MODEL?: string | undefined;
    LLM_MOCK?: string | undefined;
    LLM_TIMEOUT_MS?: number | undefined;
    LLM_MAX_RETRIES?: number | undefined;
}>;
export declare const config: {
    NODE_ENV: "production" | "test" | "development";
    MONGODB_URI: string;
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    ANTHROPIC_API_KEY: string;
    LLM_MODEL: string;
    LLM_MOCK: boolean;
    LLM_TIMEOUT_MS: number;
    LLM_MAX_RETRIES: number;
};
export type Config = z.infer<typeof envSchema>;
export {};
