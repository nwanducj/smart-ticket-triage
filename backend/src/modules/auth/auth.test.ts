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

import request from 'supertest';
import { createApp } from '../../app';

const app = createApp();

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const validAgent = {
  email: 'agent@test.com',
  password: 'password123',
  name: 'Test Agent',
};

// ---------------------------------------------------------------------------
// Registration Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  it('should register a new agent and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validAgent)
      .expect(201);

    // Verify response shape.
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent).toBeDefined();
    expect(res.body.data.token).toBeDefined();

    // Verify agent data.
    expect(res.body.data.agent.email).toBe(validAgent.email);
    expect(res.body.data.agent.name).toBe(validAgent.name);
    expect(res.body.data.agent.role).toBe('agent');

    // Verify passwordHash is NOT in the response (security).
    expect(res.body.data.agent.passwordHash).toBeUndefined();

    // Verify the token is a non-empty string (JWT format).
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it('should return 409 for duplicate email', async () => {
    // Register the first agent.
    await request(app)
      .post('/api/auth/register')
      .send(validAgent)
      .expect(201);

    // Try to register with the same email.
    const res = await request(app)
      .post('/api/auth/register')
      .send(validAgent)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' }) // Missing password and name.
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for password shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'short', name: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Login Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  // Register an agent before login tests.
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send(validAgent);
  });

  it('should login with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validAgent.email, password: validAgent.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.agent).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.agent.email).toBe(validAgent.email);
    // passwordHash must never appear in responses.
    expect(res.body.data.agent.passwordHash).toBeUndefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validAgent.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // Message should be generic — don't reveal that the email doesn't exist.
    expect(res.body.error.message).toBe('Invalid email or password.');
  });

  it('should return 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
