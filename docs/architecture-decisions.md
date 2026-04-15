# Architecture Decision Records (ADRs)

This document records the key architectural decisions made during the development of Smart Triage, along with the context, rationale, and tradeoffs for each.

---

## ADR-001: MongoDB as the Primary Database

**Status**: Accepted

**Context**: We need a database to store support tickets and agent accounts. Tickets have a semi-structured schema (some fields are set at creation, others added asynchronously by the LLM) and may evolve as we add features like ticket comments, activity history, and attachments.

**Decision**: Use MongoDB 7 as the primary database.

**Rationale**:
- **Flexible schema**: Ticket metadata will evolve over time (new fields for SLA tracking, customer sentiment, etc.). MongoDB's document model lets us add fields without migrations.
- **Natural document fit**: A ticket is naturally a self-contained document — title, description, classification, status, timestamps. No complex joins needed.
- **Embedded documents**: Future features (comments, activity log) can be embedded in the ticket document, keeping related data together and avoiding joins.
- **Horizontal scalability**: MongoDB sharding supports high-volume ticket ingestion if the system scales to millions of tickets.
- **Developer experience**: MongoDB's query language is expressive and well-suited for the filtering/sorting/pagination patterns our dashboard needs.

**Tradeoffs**:
- No ACID transactions across collections (not needed for this use case — tickets and agents are independent).
- No built-in full-text search (would need Atlas Search or Elasticsearch for advanced ticket search).

---

## ADR-002: Mongoose over the Raw MongoDB Driver

**Status**: Accepted

**Context**: We're using MongoDB and need to decide between the raw MongoDB Node.js driver and Mongoose ODM.

**Decision**: Use Mongoose for all database interactions.

**Rationale**:
- **Schema validation**: Mongoose validates documents against a schema before writes, catching invalid data at the data layer.
- **Type safety**: Mongoose's TypeScript integration provides type-safe queries and document interfaces.
- **Middleware hooks**: Pre-save hooks (e.g., for password hashing) and post-save hooks (e.g., for audit logging) are built in.
- **Index management**: Indexes are declared in schema files and auto-created on connection — no separate migration runner needed.
- **Lean queries**: `.lean()` returns plain objects for read-heavy operations, skipping Mongoose's hydration overhead (3-5x faster).
- **toJSON transforms**: Centralizes response formatting (e.g., `_id` → `id`, stripping `passwordHash`) at the model level.

**Tradeoffs**:
- Slight overhead for write operations (schema validation, middleware chain).
- Another abstraction layer to learn — but Mongoose is the de facto standard for Node.js + MongoDB.

---

## ADR-003: Repository Pattern on Top of Mongoose

**Status**: Accepted

**Context**: Mongoose already provides a rich query API. Do we need an additional repository layer?

**Decision**: All Mongoose queries live in dedicated repository files. Services never call Mongoose models directly.

**Rationale**:
- **Separation of concerns**: Business logic (service) is decoupled from data access (repository).
- **Testability**: Repositories can be mocked in service unit tests without involving Mongoose.
- **Database agnosticism**: If we ever migrate from MongoDB to PostgreSQL, only repository files change — services and controllers are untouched.
- **Query documentation**: Having all queries in one file makes it easy to audit and optimize database access patterns.

**Tradeoffs**:
- More files and indirection for simple CRUD operations.
- For this project's scale, it's arguably over-engineered — but it establishes a pattern that pays off as the codebase grows.

---

## ADR-004: Async LLM Classification (Fire-and-Forget)

**Status**: Accepted

**Context**: When a customer submits a ticket, the LLM needs to classify it. LLM API calls take 2-10 seconds. Should we make the customer wait?

**Decision**: Classify tickets asynchronously. Return the ticket to the customer immediately (with null priority/category), then update it in the background when the LLM responds.

**Rationale**:
- **User experience**: Customers get instant confirmation that their ticket was received. Making them wait 5+ seconds for AI classification would feel broken.
- **Resilience**: If the LLM is down, ticket creation still works — the classification just runs through the fallback.
- **Simplicity**: No need for a job queue or WebSocket notifications. The dashboard polls/refetches via React Query, so agents see the classification appear within seconds.

**Tradeoffs**:
- Tickets briefly exist with null priority/category — the dashboard shows "Pending" during this window.
- If the LLM update fails silently, we need the `aiClassificationFailed` flag to surface this to agents.

---

## ADR-005: JWT over Session-Based Authentication

**Status**: Accepted

**Context**: Agents need to authenticate to access the dashboard. Should we use server-side sessions or JWT tokens?

**Decision**: Use JWT (JSON Web Tokens) for stateless authentication.

**Rationale**:
- **Stateless**: No server-side session store needed. The token contains all auth info, making the backend horizontally scalable without shared state.
- **API-first**: JWTs work naturally with REST APIs and can be used by any client (web, mobile, CLI).
- **Simplicity**: No Redis/Memcached dependency for session storage.
- **Standard**: JWTs are the industry standard for API authentication.

**Tradeoffs**:
- Tokens can't be revoked server-side without a blocklist (for this demo, 24h expiry is acceptable).
- Slightly larger request size than a session cookie (JWT in Authorization header).
- XSS risk with localStorage storage (documented with a TODO for production migration to HttpOnly cookies).

---

## ADR-006: React Query for Server State Management

**Status**: Accepted

**Context**: The dashboard needs to fetch, cache, and update ticket data. Should we use Redux, Zustand, React Query, or plain state?

**Decision**: Use TanStack React Query (formerly React Query) for all server state.

**Rationale**:
- **Purpose-built**: React Query is specifically designed for server state — fetching, caching, synchronization, and mutations. Redux/Zustand are for client state.
- **Caching**: Automatic cache management with configurable stale times means the dashboard doesn't re-fetch on every render.
- **Optimistic updates**: Built-in `onMutate`/`onError`/`onSettled` hooks make optimistic UI trivial to implement correctly.
- **Background refetching**: Stale data is refreshed in the background when the user refocuses the tab, keeping the dashboard current.
- **Pagination**: Works seamlessly with paginated APIs via keyed queries.

**Tradeoffs**:
- Another library to learn — but React Query's API is intuitive and well-documented.
- Adds ~12KB gzipped to the client bundle.

---

## ADR-007: Optimistic UI for Status Updates

**Status**: Accepted

**Context**: When an agent changes a ticket's status, should the UI wait for the server to confirm before updating?

**Decision**: Update the UI immediately (optimistic update). If the server rejects the change, revert and show an error toast.

**Rationale**:
- **Perceived performance**: Agents update dozens of tickets per session. Even a 200ms delay on each update feels sluggish at that volume.
- **Confidence**: Status updates rarely fail (validation is done client-side first). The happy path is > 99% of cases.
- **Graceful degradation**: On the rare failure, React Query's `onError` handler reverts the cache to the pre-mutation snapshot, and a toast explains what happened.

**Tradeoffs**:
- Brief UI inconsistency if the server rejects the update (mitigated by the revert + toast).
- More complex code than a simple "wait for response" approach — but React Query's mutation API handles most of the complexity.
