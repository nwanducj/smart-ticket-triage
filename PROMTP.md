# Smart Triage: AI-Powered Ticketing System

## Claude Code Prompt

**Instructions to Claude Code:** Read this entire prompt before writing any code. Treat every section as a binding requirement. Build this system the way a senior engineer with 10+ years of experience would — clean architecture, exhaustive inline comments explaining the *why* behind every decision, and documentation that a new hire could onboard from on day one. Every file you create must have a comment block at the top explaining what the file does, why it exists, and how it fits into the larger system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Tooling](#2-tech-stack--tooling)
3. [Project Structure](#3-project-structure)
4. [Backend Requirements](#4-backend-requirements)
5. [Frontend Requirements](#5-frontend-requirements)
6. [Infrastructure & Docker](#6-infrastructure--docker)
7. [Testing Requirements](#7-testing-requirements)
8. [Documentation Requirements](#8-documentation-requirements)
9. [Code Quality Standards](#9-code-quality-standards)
10. [Implementation Order](#10-implementation-order)

---

## 1. Project Overview

Build a **"Smart Triage" Ticketing System** — a full-stack application where:

- Customers submit support tickets through a public form (no login required).
- An LLM (Claude via Anthropic API) automatically analyzes each ticket's description and assigns a **category** (e.g., "Billing", "Technical Bug", "Feature Request", "Account Access", "General Inquiry") and a **priority** (High, Medium, Low).
- Support Agents log in via JWT authentication and manage tickets through a dashboard — viewing, filtering, and updating ticket statuses in real-time.

The system must be production-minded: proper error handling, graceful LLM failure fallback, optimistic UI updates, and a zero-debt testing policy.

---

## 2. Tech Stack & Tooling

### Backend

- **Runtime:** Node.js (v20 LTS)
- **Framework:** Express.js
- **Language:** TypeScript (strict mode)
- **Database:** MongoDB 7 (via Mongoose ODM — schemas, validation, and indexing all defined in code)
- **Authentication:** JWT (`jsonwebtoken` + `bcryptjs`)
- **Validation:** Zod (request body validation on every endpoint — Zod validates the HTTP layer, Mongoose validates the data layer)
- **LLM Integration:** Anthropic SDK (`@anthropic-ai/sdk`) — Claude 3.5 Sonnet / Haiku
- **Testing:** Jest + Supertest + `mongodb-memory-server` (in-memory MongoDB for isolated tests)

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Query (TanStack Query) for server state, React context for auth
- **Testing:** Jest + React Testing Library

### Infrastructure

- **Containerization:** Docker + Docker Compose
- **Database Setup:** Mongoose handles schema creation and indexing automatically on connection — no separate migration runner needed, but a dedicated `models/` folder defines all models and indexes explicitly

---

## 3. Project Structure

Generate the following monorepo structure. Every directory must contain the files listed. Do not skip any file.

```
smart-triage/
├── docker-compose.yml
├── .env.example                    # Template for all env vars (never commit real secrets)
├── README.md                       # Full project documentation (see Section 8)
├── AI_JOURNEY.md                   # AI collaboration documentation (see Section 8)
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── .env.example
│   │
│   ├── src/
│   │   ├── index.ts                # Entry point — bootstraps Express, connects MongoDB, starts server
│   │   ├── app.ts                  # Express app factory (separated from server for testability)
│   │   │
│   │   ├── config/
│   │   │   ├── index.ts            # Centralized config — reads env vars, validates, exports typed config object
│   │   │   └── database.ts         # Mongoose connection setup with health check, reconnect logic, event listeners
│   │   │
│   │   ├── models/
│   │   │   ├── Agent.ts            # Mongoose schema + model for support agents
│   │   │   ├── Ticket.ts           # Mongoose schema + model for tickets (with indexes defined here)
│   │   │   └── index.ts            # Barrel export — re-exports all models from one place
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT verification middleware — extracts agent from token
│   │   │   ├── errorHandler.ts     # Global error handler — catches all unhandled errors, logs, returns safe response
│   │   │   ├── validate.ts         # Zod validation middleware factory — validates req.body against any schema
│   │   │   └── rateLimiter.ts      # Basic rate limiting for ticket submission endpoint
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts      # POST /auth/login, POST /auth/register
│   │   │   │   ├── auth.controller.ts  # Handles HTTP layer — parses request, calls service, sends response
│   │   │   │   ├── auth.service.ts     # Business logic — hashing, token generation, credential verification
│   │   │   │   ├── auth.schema.ts      # Zod schemas for login/register request bodies
│   │   │   │   └── auth.test.ts        # Integration tests for auth endpoints
│   │   │   │
│   │   │   └── tickets/
│   │   │       ├── tickets.routes.ts       # POST /tickets, GET /tickets, PATCH /tickets/:id
│   │   │       ├── tickets.controller.ts   # HTTP layer for ticket operations
│   │   │       ├── tickets.service.ts      # Core business logic — create, list, update tickets
│   │   │       ├── tickets.repository.ts   # Data access layer — all Mongoose queries live here
│   │   │       ├── tickets.schema.ts       # Zod schemas for ticket creation, update, query params
│   │   │       └── tickets.test.ts         # Integration tests for ticket endpoints
│   │   │
│   │   ├── services/
│   │   │   └── llm/
│   │   │       ├── llm.service.ts      # LLM integration — sends ticket to Claude, parses response
│   │   │       ├── llm.prompts.ts      # System prompt templates for ticket classification
│   │   │       ├── llm.types.ts        # TypeScript types for LLM request/response
│   │   │       ├── llm.fallback.ts     # Fallback logic when LLM is unavailable — keyword-based classification
│   │   │       ├── llm.mock.ts         # Mock implementation for testing (deterministic responses)
│   │   │       └── llm.test.ts         # Tests for LLM service including fallback scenarios
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.ts           # Structured logging utility (console-based, JSON format)
│   │   │   ├── errors.ts           # Custom error classes (AppError, NotFoundError, ValidationError, etc.)
│   │   │   └── pagination.ts       # Pagination helper — calculates skip, limit, total pages from Mongoose countDocuments
│   │   │
│   │   └── types/
│   │       ├── ticket.ts           # Ticket entity type, enums for Status, Priority, Category
│   │       ├── agent.ts            # Agent entity type
│   │       └── common.ts           # Shared types — PaginatedResponse, ApiResponse wrapper
│   │
│   └── seeds/
│       └── seed.ts                 # Seeds database with a default agent account + sample tickets
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── jest.config.ts
│   ├── .env.example
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout — providers, global styles, font setup
│   │   │   ├── page.tsx                # Landing / redirect page
│   │   │   │
│   │   │   ├── submit/
│   │   │   │   └── page.tsx            # PUBLIC: Customer ticket submission form
│   │   │   │
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Agent login page
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx          # PROTECTED: Dashboard layout with auth guard
│   │   │       └── page.tsx            # Agent dashboard — ticket table/kanban with filters
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn/ui components (button, input, badge, table, card, dialog, select, etc.)
│   │   │   ├── tickets/
│   │   │   │   ├── TicketTable.tsx          # Data table view of tickets with sorting & filtering
│   │   │   │   ├── TicketRow.tsx            # Single ticket row with inline status update
│   │   │   │   ├── TicketStatusBadge.tsx    # Color-coded badge for ticket status
│   │   │   │   ├── TicketPriorityBadge.tsx  # Color-coded badge for priority level
│   │   │   │   ├── TicketCategoryBadge.tsx  # Badge for ticket category
│   │   │   │   ├── TicketFilters.tsx        # Filter controls — status dropdown, priority dropdown, search
│   │   │   │   └── TicketSubmitForm.tsx     # Customer-facing ticket submission form
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx              # Dashboard header with agent info + logout
│   │   │   │   └── Sidebar.tsx             # Navigation sidebar (if needed)
│   │   │   └── auth/
│   │   │       ├── LoginForm.tsx           # Login form component
│   │   │       └── AuthGuard.tsx           # Client component that redirects unauthenticated users
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                  # Axios/fetch wrapper — base URL, auth header injection, error handling
│   │   │   ├── auth.ts                 # Auth utilities — token storage, decode, isAuthenticated check
│   │   │   └── utils.ts                # General utilities (cn helper for tailwind, formatDate, etc.)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useTickets.ts           # React Query hook for fetching tickets with filters & pagination
│   │   │   ├── useUpdateTicket.ts      # React Query mutation hook with OPTIMISTIC UI updates
│   │   │   ├── useCreateTicket.ts      # React Query mutation hook for submitting a new ticket
│   │   │   └── useAuth.ts              # Auth context hook — login, logout, current agent
│   │   │
│   │   ├── providers/
│   │   │   ├── QueryProvider.tsx       # TanStack Query provider wrapper
│   │   │   └── AuthProvider.tsx        # Auth context provider — manages JWT token state
│   │   │
│   │   └── types/
│   │       └── index.ts                # Shared frontend TypeScript types (mirror backend types)
│   │
│   └── __tests__/
│       ├── TicketSubmitForm.test.tsx
│       ├── TicketTable.test.tsx
│       └── useUpdateTicket.test.tsx
│
└── docs/
    └── architecture-decisions.md    # ADRs — key architectural decisions and rationale
```

---

## 4. Backend Requirements

### 4.1 MongoDB Schemas (Mongoose Models)

Define these Mongoose models in the `models/` directory. Add thorough comments in each file explaining the schema design choices, why each field exists, and which indexes are created and why.

#### File: `models/Agent.ts`

```typescript
/**
 * Agent.ts
 *
 * Mongoose model for support agents who can log in and manage tickets.
 * Passwords are stored as bcrypt hashes (never plaintext).
 * The role field is a string enum for future RBAC extensibility (currently only 'agent').
 *
 * Why Mongoose over raw MongoDB driver? Mongoose gives us schema validation at the
 * data layer, type-safe queries, middleware hooks (pre-save for hashing), and
 * automatic index creation — all things we'd have to build manually otherwise.
 */

const AgentSchema = new Schema({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:   { type: String, required: true },
  name:           { type: String, required: true, trim: true },
  role:           { type: String, enum: ['agent', 'admin', 'readonly'], default: 'agent' },
                  // Future: 'admin' and 'readonly' roles for RBAC expansion
}, {
  timestamps: true,   // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id;      // Normalize _id → id for API consistency
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash; // NEVER expose password hash in API responses
      return ret;
    }
  }
});

// Index: email lookups happen on every login attempt — must be fast
AgentSchema.index({ email: 1 }, { unique: true });
```

#### File: `models/Ticket.ts`

```typescript
/**
 * Ticket.ts
 *
 * Mongoose model for support tickets. Each ticket is created by a customer
 * (no account needed) and triaged by the LLM on creation. Agents update
 * status via the dashboard.
 *
 * Key design decisions:
 * - priority and category are nullable (null until LLM classifies or fallback runs)
 * - aiClassificationFailed flags tickets where the LLM was unavailable
 * - aiConfidence stores the LLM's self-reported confidence (0.00–1.00)
 * - assignedAgent is a reference for future agent assignment features
 */

const TICKET_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'] as const;
const TICKET_PRIORITIES = ['high', 'medium', 'low'] as const;
const TICKET_CATEGORIES = ['billing', 'technical_bug', 'feature_request', 'account_access', 'general_inquiry'] as const;

const TicketSchema = new Schema({
  title:          { type: String, required: true, maxlength: 500 },
  description:    { type: String, required: true, maxlength: 5000 },
  customerEmail:  { type: String, required: true, lowercase: true, trim: true },

  status:         { type: String, enum: TICKET_STATUSES, default: 'open' },
  priority:       { type: String, enum: TICKET_PRIORITIES, default: null },
                  // null until LLM classifies — agents see "Pending" in the UI
  category:       { type: String, enum: TICKET_CATEGORIES, default: null },
                  // null until LLM classifies — agents see "Uncategorized" in the UI

  aiConfidence:           { type: Number, min: 0, max: 1, default: null },
                          // LLM confidence score (0.00–1.00), null if fallback was used
  aiClassificationFailed: { type: Boolean, default: false },
                          // true if LLM was unavailable and keyword fallback was used

  assignedAgent:  { type: Schema.Types.ObjectId, ref: 'Agent', default: null },
                  // Future: agent assignment feature
}, {
  timestamps: true,   // createdAt + updatedAt managed automatically
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ---- INDEXES ----
// These indexes support the most common dashboard queries.
// Agents constantly filter by status and priority.

// Compound index: the dashboard's default view (filter by status, sort by createdAt)
TicketSchema.index({ status: 1, createdAt: -1 });

// Compound index: filter by status + priority (common dashboard filter combo)
TicketSchema.index({ status: 1, priority: 1 });

// Single field: priority-only filtering
TicketSchema.index({ priority: 1 });

// Single field: sort by creation date (descending = newest first)
TicketSchema.index({ createdAt: -1 });

// Single field: customer email lookup (for "show all tickets from this customer" feature)
TicketSchema.index({ customerEmail: 1 });
```

### 4.2 API Endpoints

#### `POST /tickets` (Public — no auth required)

- **Purpose:** Customer submits a new support ticket.
- **Request body:** `{ title: string, description: string, customerEmail: string }`
- **Validation:** All fields required. Email must be valid. Title max 500 chars. Description max 5000 chars.
- **Flow:**
  1. Validate request body with Zod.
  2. Create ticket document in MongoDB with status `open`, priority and category as `null`.
  3. Asynchronously call the LLM service to classify the ticket (do **NOT** block the response).
  4. Return the created ticket immediately to the customer (status 201).
  5. Once the LLM responds, update the ticket's priority, category, and aiConfidence via `findByIdAndUpdate`.
  6. If the LLM call fails after retries, run the keyword-based fallback classifier and set `aiClassificationFailed = true`.
- **Important:** The LLM call must NOT delay the customer's response. Use a fire-and-forget pattern (e.g., call the async function without awaiting it in the response path, but ensure errors are caught and logged).

#### `GET /tickets` (Protected — requires JWT)

- **Purpose:** Agents view tickets on the dashboard.
- **Query params:**
  - `page` (default: 1)
  - `limit` (default: 20, max: 100)
  - `status` (optional, filter by ticket status enum)
  - `priority` (optional, filter by ticket priority enum)
  - `sort` (optional, default: `createdAt`, options: `createdAt`, `priority`, `updatedAt`)
  - `order` (optional, default: `desc`, options: `asc`, `desc`)
- **Response:** `{ data: Ticket[], pagination: { page, limit, total, totalPages } }`
- **Validation:** Validate all query params with Zod. Reject invalid enum values.
- **Implementation:** Use Mongoose's `.find()` with a dynamically built filter object, `.sort()`, `.skip()`, and `.limit()`. Use `.countDocuments()` with the same filter for total count. Use `.lean()` for performance. Add comments explaining the query construction.

#### `PATCH /tickets/:id` (Protected — requires JWT)

- **Purpose:** Agent updates a ticket's status.
- **Request body:** `{ status: "open" | "in_progress" | "resolved" | "closed" }`
- **Flow:**
  1. Validate the status is a valid enum value.
  2. Validate that `:id` is a valid MongoDB ObjectId (return 400 if not).
  3. Use `findByIdAndUpdate` with `{ new: true }` to update status and return the updated document.
  4. If the document is `null`, return 404.
  5. Return the updated ticket.

#### `POST /auth/register` (Public — but should be restricted in production)

- **Request body:** `{ email, password, name }`
- **Validation:** Email format, password min 8 chars, name required.
- **Flow:** Hash password with bcrypt (salt rounds: 12), create agent document, return agent (without passwordHash via the `toJSON` transform) + JWT.
- **Add a comment:** In production, this endpoint would be admin-only or disabled, with agents provisioned by an admin. For this demo, it's open.

#### `POST /auth/login`

- **Request body:** `{ email, password }`
- **Flow:** Find agent by email with `.findOne()`, compare password hash, return JWT (expires in 24h) + agent info.

### 4.3 LLM Integration (Critical Section)

This is the most important backend component. Build it with care.

#### File: `llm.service.ts`

The LLM service must:

1. Accept a ticket's title and description.
2. Send a structured prompt to the Anthropic API (Claude) asking it to classify the ticket.
3. Parse the structured JSON response.
4. Implement retry logic: 3 attempts with exponential backoff (1s, 2s, 4s).
5. If all retries fail, gracefully fall back to the keyword-based classifier.
6. Log every LLM call — input, output, latency, success/failure — for observability.

#### File: `llm.prompts.ts`

Create a well-crafted system prompt that:

- Tells the LLM it is a customer support triage specialist.
- Lists the exact categories and priorities with definitions for each.
- Instructs the LLM to respond **ONLY** in a strict JSON format: `{ "category": "...", "priority": "...", "confidence": 0.XX, "reasoning": "..." }`.
- Include 2-3 few-shot examples in the prompt showing different ticket types and correct classifications.
- The `reasoning` field is for logging/debugging, not shown to agents.

#### File: `llm.fallback.ts`

A keyword-based fallback classifier that runs when the LLM is down:

- Map common keywords to categories (e.g., "billing", "invoice", "charge", "payment" → Billing; "bug", "error", "crash", "broken" → Technical Bug; etc.).
- Default priority to "Medium" if no strong signals.
- Set `aiClassificationFailed = true` so agents know the classification may be less accurate.
- Add detailed comments explaining the keyword mapping rationale.

#### File: `llm.mock.ts`

A mock LLM service for testing that:

- Returns deterministic classifications based on keywords in the title.
- Simulates configurable delay (50-200ms).
- Can be toggled to simulate failures for testing fallback logic.
- Is used when `NODE_ENV=test` or `LLM_MOCK=true`.

### 4.4 Authentication

- **JWT Secret:** Read from environment variable `JWT_SECRET`. Never hardcode.
- **Token payload:** `{ agentId: string, email: string, role: string }`.
- **Token expiry:** 24 hours.
- **Auth middleware:** Extract token from `Authorization: Bearer <token>` header. Verify signature. Attach agent to `req` object. Return 401 if missing/invalid/expired.
- **Password hashing:** bcrypt with 12 salt rounds.

### 4.5 Error Handling

Create a global error handling middleware (`errorHandler.ts`) that:

- Catches all unhandled errors.
- Returns consistent error response format: `{ success: false, error: { message: string, code: string } }`.
- Logs the full error (including stack trace) server-side.
- Never exposes internal error details (stack traces, DB errors) to the client in production.
- Handles specific error types: `ValidationError` → 400, `NotFoundError` → 404, `UnauthorizedError` → 401, Mongoose `CastError` (invalid ObjectId) → 400, Mongoose `ValidationError` → 400, generic → 500.
- **Mongoose-specific:** Catch Mongoose `Error.ValidationError` and `CastError` explicitly — these are the most common MongoDB-related errors that would otherwise leak internal details. Also handle duplicate key errors (MongoDB error code `11000`) for the agent email unique constraint.

### 4.6 Repository Pattern with Mongoose

Even though Mongoose provides a rich query API, **all database queries must live in the repository layer** (`tickets.repository.ts`, etc.). The service layer calls the repository, never calls Mongoose models directly. This separation means:

- If we ever swap MongoDB for another database, only the repository files change.
- Query logic is testable in isolation.
- Add a file header comment explaining this decision.

The repository should use Mongoose's `.lean()` on read queries for better performance (returns plain objects instead of Mongoose documents, skipping hydration overhead). Add a comment explaining why `.lean()` is used.

---

## 5. Frontend Requirements

### 5.1 Customer Submission Page (`/submit`)

- Public route — no authentication required.
- Clean, simple form with fields: Title, Description (textarea), Customer Email.
- Client-side validation matching backend Zod schemas.
- On submit: show loading spinner, call `POST /tickets`, show success message with ticket ID, reset form.
- On error: show error message inline (not an alert).
- **Design:** Use shadcn/ui Card, Input, Textarea, Button. Keep it minimal and professional. A customer should be able to submit a ticket in under 30 seconds.

### 5.2 Agent Login Page (`/login`)

- Simple login form with email and password.
- On success: store JWT in memory (React state via AuthProvider — NOT localStorage for security, but for this demo localStorage is acceptable with a comment explaining the tradeoff).
- Redirect to `/dashboard` after login.
- Show error message for invalid credentials.

### 5.3 Agent Dashboard (`/dashboard`)

- Protected route — redirect to `/login` if not authenticated.
- **Data Table view (primary)** showing all tickets with columns:
  - Title (truncated to 60 chars with tooltip for full text)
  - Category (color-coded badge)
  - Priority (color-coded badge: High=red, Medium=yellow, Low=green)
  - Status (with inline dropdown to change status — this is the optimistic UI piece)
  - Customer Email
  - Created At (relative time, e.g., "2 hours ago")
- **Filters bar** at the top: dropdown for Status, dropdown for Priority, with "Clear Filters" button.
- **Pagination** at the bottom: Previous / Next buttons, showing "Page X of Y (Z total tickets)".
- **Optimistic UI for status updates:** When an agent changes a ticket's status via the inline dropdown:
  1. Immediately update the UI to reflect the new status (don't wait for the server).
  2. Send the PATCH request in the background.
  3. If the request fails, revert the UI to the previous status and show an error toast.
  4. Add detailed comments in `useUpdateTicket.ts` explaining the optimistic update pattern.

### 5.4 UI Component Standards

- Use shadcn/ui components exclusively for UI primitives (Button, Input, Select, Table, Badge, Card, Dialog, Toast/Sonner).
- Follow shadcn/ui installation process — run the CLI to add each component.
- Color-coding must be consistent and accessible (not relying solely on color — include text labels).
- **Responsive:** the dashboard should work on tablet-width screens (1024px+). The submission form should work on mobile.

---

## 6. Infrastructure & Docker

### 6.1 `docker-compose.yml`

A single `docker-compose up` must start the entire system:

```yaml
# Three services: mongo, backend, frontend
# Backend depends on mongo being healthy.
# Frontend depends on backend being healthy.
# Use health checks so services start in the right order.
```

- **mongo:** MongoDB 7, persistent volume for `/data/db`, expose port 27017. Use the `mongo:7` Docker image. Add a health check using `mongosh --eval "db.adminCommand('ping')"`.
- **backend:** Build from `./backend/Dockerfile`, expose port 4000, depends on mongo, pass all env vars. Health check on `GET /api/health`.
- **frontend:** Build from `./frontend/Dockerfile`, expose port 3000, depends on backend.

### 6.2 Backend Dockerfile

- Multi-stage build: builder stage compiles TypeScript, runner stage copies only compiled JS + `node_modules`.
- Run as non-root user.
- Include comments explaining each stage.

### 6.3 Frontend Dockerfile

- Multi-stage build: builder stage runs `next build`, runner stage uses Next.js standalone output.
- Run as non-root user.

### 6.4 Environment Variables

Create `.env.example` at the root with ALL variables documented:

```bash
# ===== DATABASE =====
MONGODB_URI=mongodb://mongo:27017/smart_triage
# For local development without Docker: mongodb://localhost:27017/smart_triage
# For MongoDB Atlas (production): mongodb+srv://user:pass@cluster.mongodb.net/smart_triage

# ===== BACKEND =====
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production    # MUST be changed in production
JWT_EXPIRES_IN=24h

# ===== LLM CONFIGURATION =====
ANTHROPIC_API_KEY=your-anthropic-api-key            # Get from console.anthropic.com
LLM_MODEL=claude-sonnet-4-20250514                  # Model to use for ticket classification
LLM_MOCK=false                                      # Set to 'true' to use mock LLM (no API key needed)
LLM_TIMEOUT_MS=10000                                # Timeout for LLM API calls
LLM_MAX_RETRIES=3                                   # Number of retry attempts before fallback

# ===== FRONTEND =====
NEXT_PUBLIC_API_URL=http://localhost:4000/api        # Backend API URL for the frontend
```

---

## 7. Testing Requirements

**Zero-Debt Policy:** Every module must have meaningful tests. No skipping tests to ship faster.

### 7.1 Backend Tests (Jest + Supertest + `mongodb-memory-server`)

**Test infrastructure:** Use `mongodb-memory-server` to spin up an isolated in-memory MongoDB instance for each test suite. This means:

- Tests run fast (no external DB dependency).
- Each test suite gets a clean database.
- No port conflicts or shared state between parallel test runs.
- Create a `test/setup.ts` file that handles connecting to the in-memory instance before all tests and disconnecting + stopping after.

Write integration tests for:

1. **Auth endpoints:**
   - Register with valid data → 201 + JWT.
   - Register with duplicate email → 409.
   - Login with valid credentials → 200 + JWT.
   - Login with wrong password → 401.

2. **Ticket endpoints:**
   - Create ticket with valid data → 201 + ticket object.
   - Create ticket with missing fields → 400 + validation error.
   - List tickets without auth → 401.
   - List tickets with auth → 200 + paginated response.
   - List tickets with status filter → only matching tickets.
   - Update ticket status with auth → 200 + updated ticket.
   - Update non-existent ticket → 404.
   - Update with invalid ObjectId → 400.

3. **LLM service:**
   - Successful classification → returns category + priority + confidence.
   - LLM timeout → retries, then falls back to keyword classifier.
   - Fallback classifier → maps known keywords correctly.
   - Mock mode → returns deterministic results.

**Test setup:** Use `mongodb-memory-server`. Clean collections between tests with `deleteMany({})`. The mock LLM should be used in all tests (never hit the real API in tests).

### 7.2 Frontend Tests (Jest + React Testing Library)

Write tests for:

1. **TicketSubmitForm:** renders fields, validates empty submission, calls API on valid submit, shows success message.
2. **TicketTable:** renders ticket data, shows correct badge colors, handles empty state.
3. **useUpdateTicket:** optimistic update applies immediately, reverts on error.

---

## 8. Documentation Requirements

### 8.1 `README.md`

The README must be comprehensive and include these sections (write each one fully — not placeholders):

1. **Project Title + One-line Description**
2. **Architecture Overview:** Text description + ASCII diagram showing the flow: `Customer → Frontend → Backend → LLM → MongoDB → Dashboard`.
3. **Tech Stack:** Table listing every technology and why it was chosen.
4. **Getting Started:**
   - Prerequisites (Docker, Node.js, etc.)
   - Clone, create `.env` from `.env.example`, `docker-compose up`, access URLs.
   - Seed data: how to create a default agent account for testing.
5. **API Documentation:** Table of all endpoints with method, path, auth requirement, request body, and response format.
6. **LLM Integration:** How the AI classification works, the prompt strategy, fallback behavior, and how to mock it.
7. **Testing:** How to run backend and frontend tests, what's covered.
8. **RBAC Section** (required by the spec): A written explanation of how you would implement Role-Based Access Control if we added "Admin" and "Read-Only" roles. Describe:
   - Schema changes (the Agent model already has a `role` field with enum values — now enforce it in middleware).
   - Optionally: a separate permissions collection mapping roles to allowed actions for fine-grained control.
   - Middleware changes (role-checking middleware that runs after auth middleware, checks `req.agent.role` against required role).
   - Frontend changes (conditionally rendering UI elements based on role — e.g., read-only users see the dashboard but status dropdowns are disabled).
   - Specific permission matrix: what each role can do.
9. **LLM Failure Resilience Section** (required by the spec): A written explanation of what happens when the LLM API goes down. Describe:
   - The retry strategy (exponential backoff).
   - The keyword-based fallback classifier.
   - The `aiClassificationFailed` flag that alerts agents.
   - How the system continues to function without the LLM.
   - Future improvements: circuit breaker pattern, queue-based retry, manual classification UI.

### 8.2 `AI_JOURNEY.md`

Document the AI collaboration process. Structure it as:

1. **Tools Used:** Which AI tools assisted in building this project and how.
2. **Prompt Engineering:** How the LLM classification prompt was designed and iterated.
3. **Key Decisions Influenced by AI:** Where AI suggestions shaped architectural choices.
4. **Challenges & Learnings:** What didn't work, what required human judgment to override.
5. **Time Savings:** Estimate of time saved by using AI tools.

### 8.3 `docs/architecture-decisions.md`

An Architecture Decision Record (ADR) file covering:

- Why MongoDB for this use case (flexible schema for evolving ticket metadata, embedded document potential for future features like ticket comments/history, natural fit for a document-oriented ticket model, horizontal scalability for high-volume ticket ingestion).
- Why Mongoose over the raw MongoDB driver (schema validation, type safety, middleware hooks, index management, lean queries).
- Why the repository pattern on top of Mongoose (separation of concerns, testability, database-agnostic service layer).
- Why async LLM classification (not blocking the ticket creation response).
- Why JWT over session-based auth for this system.
- Why React Query for server state management.
- Why optimistic UI for status updates.

---

## 9. Code Quality Standards

These are **non-negotiable**. Apply to every single file.

### 9.1 Comments

Every file must have:

- **File header comment:** 3-5 lines explaining what this file does, why it exists, and its role in the system.
- **Function comments:** Every exported function gets a JSDoc-style comment explaining purpose, params, return value, and any side effects.
- **Inline comments:** For any non-obvious logic (regex patterns, business rules, query construction decisions, error handling choices), add a comment explaining the *why*, not the *what*.
- **TODO comments:** If you make a simplification for time's sake, add a `// TODO(production):` comment explaining what you'd change for production.

**Example standard:**

```typescript
/**
 * tickets.repository.ts
 *
 * Data access layer for the tickets module. All Mongoose queries that touch
 * the Ticket model live here — nowhere else in the codebase should query
 * Ticket directly. This separation lets us swap the database engine without
 * touching business logic in the service layer.
 *
 * Why Mongoose with .lean()? Mongoose documents carry hydration overhead
 * (change tracking, save methods, etc.). For read-heavy operations like
 * listing tickets, .lean() returns plain JS objects — roughly 5x faster
 * for large result sets. We only use full Mongoose documents when we need
 * middleware hooks (e.g., pre-save).
 */

/**
 * Fetches a paginated list of tickets with optional status and priority filters.
 *
 * @param filters - Object containing optional status, priority, page, limit, sort, order
 * @returns Paginated ticket list with total count for pagination metadata
 *
 * Note: We run .find() and .countDocuments() with the same filter object.
 * For very large collections (millions of tickets), consider using an
 * estimatedDocumentCount() for the total or a cursor-based pagination
 * approach instead of skip/limit. For this scale, skip/limit is fine.
 */
export async function findTickets(filters: TicketFilters): Promise<PaginatedResult<Ticket>> {
  // ...
}
```

### 9.2 Error Messages

All error messages must be **human-readable and actionable**. Never return raw database errors to the client. Examples:

- ✅ **Good:** `"A ticket with this ID does not exist."`
- ❌ **Bad:** `"Cast to ObjectId failed for value \"abc\" (type string)"` or `"ECONNREFUSED"`

### 9.3 TypeScript

- **Strict mode:** `"strict": true` in tsconfig.
- **No `any`:** Use proper types everywhere. If a type is complex, create a named type for it.
- **Enums or const objects:** Use TypeScript enums or `as const` objects for Status, Priority, Category — must match the Mongoose schema enum values exactly.
- **Mongoose typing:** Use Mongoose's `InferSchemaType` or manually define interfaces that extend `Document` for full type safety on queries.

---

## 10. Implementation Order

Build the system in this exact order. Complete each step fully before moving to the next. After each major step, run the relevant tests to verify.

### Phase 1: Foundation

1. Initialize the monorepo structure with all directories.
2. Set up the backend: `package.json`, `tsconfig.json`, install dependencies (`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `zod`, `@anthropic-ai/sdk`, `cors`, `helmet`, `express-rate-limit`, `dotenv`).
3. Set up the frontend: `create-next-app`, install shadcn/ui, TanStack Query.
4. Create `docker-compose.yml` and Dockerfiles.
5. Define Mongoose models (Agent, Ticket) with all indexes.
6. Build the database connection module with health check.
7. **Verify:** `docker-compose up` starts all services, MongoDB is accessible, Mongoose connects and creates collections/indexes.

### Phase 2: Backend Core

1. Build config module (env var loading + validation).
2. Build utility modules (logger, custom errors, pagination helper).
3. Build auth module: schema → service → controller → routes → tests.
4. Build auth middleware.
5. Build tickets repository (all Mongoose queries with `.lean()`).
6. Build tickets service (business logic, calls repository).
7. Build tickets controller and routes.
8. Build validation middleware with Zod schemas.
9. Wire up global error handler (including Mongoose `CastError` + `ValidationError` + duplicate key handling).
10. **Verify:** All backend tests pass. Test with Postman/curl.

### Phase 3: LLM Integration

1. Build `llm.prompts.ts` — craft and document the classification prompt.
2. Build `llm.service.ts` — Anthropic API integration with retry logic.
3. Build `llm.fallback.ts` — keyword-based classifier.
4. Build `llm.mock.ts` — deterministic mock for testing.
5. Integrate LLM service into ticket creation flow (async, non-blocking).
6. **Verify:** LLM tests pass. Create a ticket and confirm classification appears.

### Phase 4: Frontend

1. Set up providers (QueryProvider, AuthProvider).
2. Build the API client (`lib/api.ts`).
3. Build the login page and auth flow.
4. Build the ticket submission page (`/submit`).
5. Build the dashboard layout with auth guard.
6. Build the ticket table with badges and filters.
7. Implement optimistic status updates.
8. Add pagination.
9. **Verify:** Full end-to-end flow works. Frontend tests pass.

### Phase 5: Polish & Documentation

1. Write seed script for demo data.
2. Write `README.md` with all required sections.
3. Write `AI_JOURNEY.md`.
4. Write `docs/architecture-decisions.md`.
5. Final review: run all tests, `docker-compose up` from clean state, verify full flow.

---

## Environment and Mock Mode

If no Anthropic API key is available, the system **MUST** still work fully by setting `LLM_MOCK=true`. The mock service should provide realistic-looking classifications so the entire system can be demonstrated end-to-end without an API key. The README must clearly explain this.

---

## Final Notes for Claude Code

- **Do not cut corners on comments or documentation.** This codebase should read like a tutorial. A junior developer should be able to understand every file.
- **Do not skip error handling.** Every API call that can fail must have a `try/catch`. Every Mongoose query must handle connection errors and cast errors.
- **Do not leave `console.log` statements.** Use the structured logger utility.
- **Mongoose-specific:** Always use `.lean()` on read queries in the repository layer. Always validate ObjectIds before passing to `.findById()` or `.findByIdAndUpdate()`. Always handle `CastError` and duplicate key errors (code `11000`) in the error handler.
- **Commit message style:** If you're asked to create commits, use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **When in doubt, over-document.** More comments are always better than fewer.