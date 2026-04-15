# Smart Triage — AI-Powered Ticketing System

An intelligent support ticket management system that uses Claude (Anthropic's LLM) to automatically categorize and prioritize incoming customer tickets, enabling support agents to work more efficiently.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Customer   │     │      Frontend         │     │    Backend      │
│   Browser    │────▶│   Next.js (port 3000) │────▶│ Express (4000)  │
│              │     │   - Submit form       │     │  - REST API     │
│              │     │   - Agent dashboard   │     │  - JWT Auth     │
└──────────────┘     └──────────────────────┘     │  - Validation   │
                                                   └────────┬────────┘
                                                            │
                                              ┌─────────────┼─────────────┐
                                              │             │             │
                                        ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
                                        │  MongoDB   │ │  Claude  │ │ Fallback │
                                        │  (27017)   │ │   API    │ │ Keyword  │
                                        │  Mongoose  │ │ Anthropic│ │Classifier│
                                        └───────────┘ └──────────┘ └──────────┘
```

**Flow:**
1. Customer submits a ticket via the public form (no login required).
2. Backend saves the ticket immediately and returns 201 to the customer.
3. Asynchronously, the LLM classifies the ticket (category + priority).
4. If the LLM is unavailable, a keyword-based fallback classifier runs.
5. Agents log in via JWT and manage tickets through the dashboard.
6. Status updates use optimistic UI — changes appear instantly, revert on failure.

---

## Tech Stack

| Layer        | Technology          | Why                                                                 |
|-------------|--------------------|--------------------------------------------------------------------|
| Frontend    | Next.js 14+ (App Router) | Server components, file-based routing, built-in optimization  |
| UI          | shadcn/ui + Tailwind CSS | Accessible, customizable components with utility-first styling |
| Server State| TanStack React Query     | Caching, background refetch, optimistic mutations              |
| Backend     | Express.js + TypeScript  | Mature, minimal, huge ecosystem, strict type safety            |
| Database    | MongoDB 7 + Mongoose     | Flexible schema for evolving ticket metadata, rich ODM         |
| Auth        | JWT (jsonwebtoken)       | Stateless auth ideal for API-first architecture                |
| Validation  | Zod                      | TypeScript-first schema validation with type inference         |
| LLM         | Claude (Anthropic SDK)   | Best-in-class reasoning for accurate ticket classification     |
| Testing     | Jest + Supertest         | Industry standard, mongodb-memory-server for isolated tests    |
| Containers  | Docker + Compose         | Single command to run the entire stack                         |

---

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** (recommended method)
- OR: **Node.js 20 LTS** and **MongoDB 7** installed locally

### Quick Start with Docker

```bash
# 1. Clone the repository
git clone <repo-url>
cd smart-triage

# 2. Create environment file
cp .env.example .env
# Edit .env to add your ANTHROPIC_API_KEY (or keep LLM_MOCK=true for demo)

# 3. Start all services
docker-compose up --build

# 4. Access the application
# Frontend:  http://localhost:3000
# Backend:   http://localhost:4000/api/health
```

### Local Development (without Docker)

```bash
# 1. Start MongoDB locally (or use MongoDB Atlas)
mongod --dbpath /data/db

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI=mongodb://localhost:27017/smart_triage
npm install
npm run dev

# 3. Frontend setup (in a separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev

# 4. Seed demo data (in a separate terminal)
cd backend
npm run seed
```

### Seed Data

The seed script creates a demo agent account and 10 sample tickets:

```bash
cd backend
npm run seed
```

**Demo credentials:** `agent@smarttriage.com` / `password123`

---

## API Documentation

### Authentication

| Method | Path               | Auth     | Description                    |
|--------|-------------------|----------|--------------------------------|
| POST   | `/api/auth/register` | Public   | Create a new agent account     |
| POST   | `/api/auth/login`    | Public   | Authenticate and receive JWT   |

**Register** — `POST /api/auth/register`
```json
// Request
{ "email": "agent@example.com", "password": "password123", "name": "Agent Name" }

// Response (201)
{ "success": true, "data": { "agent": { "id": "...", "email": "...", "name": "...", "role": "agent" }, "token": "eyJ..." } }
```

**Login** — `POST /api/auth/login`
```json
// Request
{ "email": "agent@example.com", "password": "password123" }

// Response (200)
{ "success": true, "data": { "agent": { ... }, "token": "eyJ..." } }
```

### Tickets

| Method | Path              | Auth      | Description                          |
|--------|------------------|-----------|--------------------------------------|
| POST   | `/api/tickets`    | Public    | Submit a new support ticket          |
| GET    | `/api/tickets`    | JWT       | List tickets (paginated, filterable) |
| GET    | `/api/tickets/:id`| JWT       | Get a single ticket                  |
| PATCH  | `/api/tickets/:id`| JWT       | Update ticket status                 |

**Create Ticket** — `POST /api/tickets`
```json
// Request
{ "title": "Payment failed", "description": "I was charged twice...", "customerEmail": "customer@example.com" }

// Response (201) — priority/category are null until LLM classifies
{ "success": true, "data": { "id": "...", "title": "...", "status": "open", "priority": null, "category": null, ... } }
```

**List Tickets** — `GET /api/tickets?status=open&priority=high&page=1&limit=20&sort=createdAt&order=desc`
```json
// Response (200)
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

**Update Status** — `PATCH /api/tickets/:id`
```json
// Request
{ "status": "in_progress" }

// Response (200)
{ "success": true, "data": { "id": "...", "status": "in_progress", ... } }
```

### Health Check

| Method | Path           | Description                          |
|--------|---------------|--------------------------------------|
| GET    | `/api/health`  | Server and database health status    |

---

## LLM Integration

### How Classification Works

When a ticket is created, the system asynchronously sends the title and description to Claude with a carefully crafted system prompt that includes:

1. **Category definitions** — bug, feature_request, billing, account, technical_support, general
2. **Priority definitions** — critical, high, medium, low (with SLA expectations)
3. **Few-shot examples** — 3 representative tickets showing correct classification
4. **Strict JSON output format** — category, priority, confidence (0-1), reasoning

The LLM returns a structured JSON response that is parsed, validated, and stored on the ticket.

### Mock Mode

Set `LLM_MOCK=true` to run without an Anthropic API key. The mock classifier uses keyword detection to produce realistic-looking classifications, enabling full end-to-end demos without API costs.

### Fallback Behavior

If the LLM is unavailable (timeout, rate limit, outage):

1. The system retries with exponential backoff (1s, 2s, 4s).
2. After all retries fail, a keyword-based fallback classifier runs.
3. The ticket's `aiClassificationFailed` flag is set to `true`.
4. Agents see an "(AI fallback)" indicator in the dashboard.

---

## Testing

### Backend Tests

```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
```

Tests use `mongodb-memory-server` for isolated in-memory MongoDB — no external database needed.

**Coverage:**
- Auth endpoints (register, login, validation, duplicates)
- Ticket endpoints (CRUD, pagination, filtering, auth protection)
- LLM service (mock classifier, fallback classifier, error handling)

### Frontend Tests

```bash
cd frontend
npm test
```

---

## Role-Based Access Control (RBAC)

The system is designed for RBAC expansion. The Agent model already includes a `role` field with three values:

| Role       | Permissions                                                    |
|-----------|---------------------------------------------------------------|
| `agent`    | View tickets, update ticket status, be assigned to tickets    |
| `admin`    | All agent permissions + manage agents, override AI, reassign  |
| `readonly` | View tickets and dashboard only, cannot modify anything       |

### Implementation Plan

1. **Middleware**: Add a `requireRole('admin')` middleware that checks `req.agent.role` after JWT authentication.
2. **Backend routes**: Apply role middleware to sensitive endpoints (e.g., only admins can register new agents).
3. **Frontend**: Conditionally render UI elements based on role — e.g., readonly users see the dashboard but status dropdowns are disabled.
4. **Optional**: Add a `permissions` collection mapping roles to fine-grained actions for maximum flexibility.

---

## LLM Failure Resilience

The system is designed to function fully even when the LLM API is completely down:

1. **Retry strategy**: Exponential backoff (1s → 2s → 4s) absorbs transient failures.
2. **Keyword fallback**: A rule-based classifier maps common keywords to categories/priorities.
3. **Failure flag**: `aiClassificationFailed=true` alerts agents that the classification may need review.
4. **Non-blocking**: Ticket creation never waits for the LLM — customers always get an immediate response.

### Future Improvements

- **Circuit breaker pattern**: Stop calling the LLM after N consecutive failures, auto-recover after a cooldown period.
- **Queue-based retry**: Push failed classifications to a job queue (Bull/BullMQ) for background retry.
- **Manual classification UI**: Let agents manually set category/priority for tickets where AI failed.
- **Classification analytics**: Track AI accuracy over time to improve the prompt.

---

## Project Structure

```
smart-triage/
├── docker-compose.yml          # Full-stack orchestration
├── .env.example                # Environment variable template
├── backend/
│   ├── src/
│   │   ├── config/             # Env validation, database connection
│   │   ├── models/             # Mongoose schemas (Agent, Ticket)
│   │   ├── middleware/         # Auth, validation, error handling, rate limiting
│   │   ├── modules/
│   │   │   ├── auth/           # Authentication (routes, controller, service, schema)
│   │   │   └── tickets/        # Tickets (routes, controller, service, repository, schema)
│   │   ├── services/llm/       # LLM integration (service, prompts, fallback, mock)
│   │   ├── utils/              # Logger, custom errors, pagination
│   │   └── types/              # TypeScript type definitions
│   ├── seeds/                  # Database seed script
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages (submit, login, dashboard)
│   │   ├── components/         # React components (tickets, auth, layout)
│   │   ├── hooks/              # React Query hooks (useTickets, useUpdateTicket)
│   │   ├── providers/          # Context providers (Query, Auth)
│   │   ├── lib/                # API client, auth utilities
│   │   └── types/              # Shared TypeScript types
│   └── Dockerfile
└── docs/
    └── architecture-decisions.md
```
