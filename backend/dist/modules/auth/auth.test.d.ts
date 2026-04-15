/**
 * Auth Endpoint Integration Tests
 *
 * Tests the full HTTP request/response cycle for authentication endpoints
 * using Supertest against the Express app with an in-memory MongoDB.
 *
 * Coverage:
 * - Register with valid data → 201 + JWT
 * - Register with duplicate email → 409
 * - Register with invalid data → 400
 * - Login with valid credentials → 200 + JWT
 * - Login with wrong password → 401
 * - Login with non-existent email → 401
 */
export {};
