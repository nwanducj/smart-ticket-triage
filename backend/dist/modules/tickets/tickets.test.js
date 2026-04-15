"use strict";
/**
 * Ticket Endpoint Integration Tests
 *
 * Tests the full HTTP request/response cycle for ticket CRUD endpoints
 * using Supertest. LLM is mocked (NODE_ENV=test triggers mock mode).
 *
 * Coverage:
 * - Create ticket with valid data → 201
 * - Create ticket with missing fields → 400
 * - List tickets without auth → 401
 * - List tickets with auth → 200 + paginated response
 * - List tickets with status filter → only matching tickets
 * - Update ticket status with auth → 200
 * - Update non-existent ticket → 404
 * - Update with invalid ObjectId → 400
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const app = (0, app_1.createApp)();
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Register an agent and return the JWT token for authenticated requests. */
async function getAuthToken() {
    const res = await (0, supertest_1.default)(app)
        .post('/api/auth/register')
        .send({
        email: 'agent@test.com',
        password: 'password123',
        name: 'Test Agent',
    });
    return res.body.data.token;
}
/** Create a ticket and return the response body. */
async function createTicket(overrides = {}) {
    const defaultTicket = {
        title: 'Test ticket',
        description: 'This is a test ticket description for integration testing.',
        customerEmail: 'customer@test.com',
        ...overrides,
    };
    return (0, supertest_1.default)(app).post('/api/tickets').send(defaultTicket);
}
// ---------------------------------------------------------------------------
// Ticket Creation Tests (Public endpoint)
// ---------------------------------------------------------------------------
describe('POST /api/tickets', () => {
    it('should create a ticket with valid data', async () => {
        const res = await createTicket();
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Test ticket');
        expect(res.body.data.status).toBe('open');
        // Priority and category are null initially (set asynchronously by LLM).
        expect(res.body.data.id).toBeDefined();
    });
    it('should return 400 for missing title', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/tickets')
            .send({
            description: 'Missing title',
            customerEmail: 'test@test.com',
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should return 400 for missing description', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/tickets')
            .send({
            title: 'Missing description',
            customerEmail: 'test@test.com',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should return 400 for invalid email', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/tickets')
            .send({
            title: 'Bad email',
            description: 'Test description',
            customerEmail: 'not-an-email',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should return 400 for title exceeding 500 characters', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/tickets')
            .send({
            title: 'x'.repeat(501),
            description: 'Test description',
            customerEmail: 'test@test.com',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
// ---------------------------------------------------------------------------
// Ticket Listing Tests (Protected endpoint)
// ---------------------------------------------------------------------------
describe('GET /api/tickets', () => {
    it('should return 401 without auth token', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/tickets');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
    it('should return paginated tickets with auth', async () => {
        const token = await getAuthToken();
        // Create a few tickets first.
        await createTicket({ title: 'Ticket 1' });
        await createTicket({ title: 'Ticket 2' });
        await createTicket({ title: 'Ticket 3' });
        const res = await (0, supertest_1.default)(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(3);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.total).toBe(3);
        expect(res.body.pagination.page).toBe(1);
    });
    it('should filter tickets by status', async () => {
        const token = await getAuthToken();
        // Create tickets and manually update one's status for filtering.
        const ticket1 = await createTicket({ title: 'Open ticket' });
        await createTicket({ title: 'Another open ticket' });
        // Update the first ticket's status to 'in_progress'.
        await (0, supertest_1.default)(app)
            .patch(`/api/tickets/${ticket1.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'in_progress' });
        // Filter by 'open' status — should only return the second ticket.
        const res = await (0, supertest_1.default)(app)
            .get('/api/tickets?status=open')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].title).toBe('Another open ticket');
    });
    it('should respect pagination parameters', async () => {
        const token = await getAuthToken();
        // Create 5 tickets.
        for (let i = 0; i < 5; i++) {
            await createTicket({ title: `Ticket ${i + 1}` });
        }
        // Request page 1 with limit 2.
        const res = await (0, supertest_1.default)(app)
            .get('/api/tickets?page=1&limit=2')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
        expect(res.body.pagination.total).toBe(5);
        expect(res.body.pagination.totalPages).toBe(3);
    });
    it('should return 401 for invalid token', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/tickets')
            .set('Authorization', 'Bearer invalid-token');
        expect(res.status).toBe(401);
    });
});
// ---------------------------------------------------------------------------
// Ticket Update Tests (Protected endpoint)
// ---------------------------------------------------------------------------
describe('PATCH /api/tickets/:id', () => {
    it('should update ticket status', async () => {
        const token = await getAuthToken();
        const ticket = await createTicket();
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/tickets/${ticket.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'in_progress' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('in_progress');
    });
    it('should return 404 for non-existent ticket', async () => {
        const token = await getAuthToken();
        // Use a valid ObjectId format that doesn't exist in the database.
        const fakeId = '507f1f77bcf86cd799439011';
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/tickets/${fakeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'resolved' });
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
    it('should return 400 for invalid ObjectId', async () => {
        const token = await getAuthToken();
        const res = await (0, supertest_1.default)(app)
            .patch('/api/tickets/not-a-valid-id')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'resolved' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
    it('should return 400 for invalid status value', async () => {
        const token = await getAuthToken();
        const ticket = await createTicket();
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/tickets/${ticket.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'invalid_status' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('should return 401 without auth token', async () => {
        const ticket = await createTicket();
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/tickets/${ticket.body.data.id}`)
            .send({ status: 'resolved' });
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=tickets.test.js.map