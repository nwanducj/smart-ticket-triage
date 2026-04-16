# AI Journey — Smart Triage Development

This document chronicles how AI tools were used in building the Smart Triage ticketing system, covering the collaboration process, prompt engineering decisions, and lessons learned.

---

## 1. Tools Used

### Claude Code (Anthropic)
The entire application was built with Claude Code, an AI-powered software engineering assistant. It was used for:

- **Architecture design**: Defining the monorepo structure, module boundaries, and data flow.
- **Code generation**: Writing every file — backend, frontend, infrastructure, and tests.
- **Documentation**: Generating comprehensive README, ADRs, and inline code comments.
- **Problem solving**: Making tradeoffs between competing approaches (e.g., JWT vs sessions, Mongoose vs raw driver).

### Anthropic Claude API
The production system integrates with Claude's API for real-time ticket classification. The LLM is used as a runtime component, not just a development tool.

---

## 2. Prompt Engineering

### Classification Prompt Design

The LLM classification prompt went through several design iterations:

**Iteration 1: Simple instruction**
> "Classify this ticket into a category and priority."

*Problem*: Inconsistent output format, hallucinated categories, varying confidence scales.

**Iteration 2: Structured with definitions**
Added explicit category and priority definitions with clear boundaries between each.

*Improvement*: Categories were consistent, but edge cases (e.g., a billing bug) were still ambiguous.

**Iteration 3: Few-shot examples + strict JSON**
Added 3 representative examples covering different ticket types, plus explicit rules requiring JSON-only output.

*Result*: Consistent, parseable output with ~90%+ accuracy on test tickets.

### Key Prompt Engineering Decisions

1. **Role-setting**: "You are an expert customer support triage specialist" — giving the model a specific persona improves classification quality.
2. **Exhaustive definitions**: Each category and priority includes a description and concrete examples, reducing ambiguity.
3. **Few-shot examples**: 3 diverse examples (billing, bug, feature request) anchor the model's behavior for edge cases.
4. **Strict JSON format**: Explicit schema with a rule saying "respond with ONLY a JSON object" eliminates extraneous text.
5. **Confidence score**: Asking for a self-reported confidence (0-1) lets agents know when to trust vs. override the AI.
6. **Reasoning field**: Included for debugging and logging, not shown to agents — helps diagnose misclassifications.

---

## 3. Key Decisions Influenced by AI

### Async LLM Classification
The decision to classify tickets asynchronously (fire-and-forget after creation) was informed by the understanding that LLM calls take 2-10 seconds. Blocking the customer's response for that long would be a terrible UX. The ticket exists immediately; classification enriches it in the background.

### Fallback Classifier Design
The keyword-based fallback was designed to be "better than nothing" — a simple, deterministic safety net that runs in microseconds when the LLM is unavailable. The `aiClassificationFailed` flag ensures agents know when the classification might be inaccurate.

### Repository Pattern with Mongoose
The decision to add a repository layer on top of Mongoose (which already provides a query API) was driven by testability and future-proofing. While it adds indirection, it means swapping from MongoDB to another database only requires changing repository files — services and controllers remain untouched.

### Optimistic UI Updates
Implementing optimistic updates for ticket status changes was influenced by the UX requirement that the dashboard feel "instant." React Query's `onMutate`/`onError` pattern provides a clean way to update the cache immediately and roll back on failure.

---

## 4. Challenges & Learnings

### Challenge: LLM Output Parsing
LLMs occasionally wrap JSON in markdown code fences (```json ... ```) despite explicit instructions not to. The parsing logic includes a cleanup step that strips code fences before JSON.parse().

### Challenge: Balancing Mock Fidelity
The mock LLM needs to be realistic enough for end-to-end demos but simple enough to be deterministic for tests. Using keyword detection (similar to the fallback) with higher confidence scores achieves this balance.

### Challenge: Type Safety Across the Stack
Keeping TypeScript types synchronized between backend and frontend without a shared package requires discipline. Both sides define the same types independently — in a larger project, a shared types package or OpenAPI code generation would be essential.

### Learning: Defense in Depth for Validation
Zod validates the HTTP layer (request shape), Mongoose validates the data layer (schema constraints). Neither alone covers all cases. This dual validation strategy catches errors at the earliest possible point.

### Learning: Error Handling is Critical
The error handler needed to catch Mongoose-specific errors (CastError, ValidationError, duplicate key), custom AppError subclasses, and unexpected errors — each with different status codes and message formatting. Getting this right prevents information leakage and improves debuggability.

---

## 5. Notable Human Contributions

AI was the implementation muscle, but the shape of the final product was driven by a steady stream of human judgment calls — product decisions, UX instincts, deployment pragmatism, and architectural bets that the AI would not have taken on its own. The most consequential are recorded below so future readers can see where the human was in the loop.

### Product & UX Direction

- **Intercom-style floating support widget.** Called for replacing the plain "submit a ticket" form with a bottom-right floating action button that expands into a compact chat-like panel, including a "Submit another ticket" state after success. The widget was then scoped to the home page only — dashboard users should never see a customer-facing submission entry point. This pushed a meaningful refactor: lifting the form out of a page component into a self-contained widget with its own state machine (collapsed → form → thank-you → form).

- **Home page redesigned as a simulated 404.** Turned the default landing page into a deliberate "error page" metaphor whose only CTA is the chat widget, with a subtle agent-login link tucked below. This made the deployment story cleaner — there's no ambiguity about who the two surfaces are for.

- **Login as a true standalone page.** Explicitly rejected the initial boxed-card login, insisted on a flattened layout with no "back to home" link. The result: login reads as a first-class destination rather than a modal bolted onto the marketing site.

- **Bigger, heavier typography and chunkier controls.** Called out when headings and action buttons felt thin, driving a pass that bumped title weight, control heights, and tap targets across the app.

- **Select labels must be human-readable.** Noticed that base-ui's `Select.Value` was rendering the raw `"all"` token instead of "All Statuses" in both filters and the inline table row. Led to discovering the base-ui vs. Radix API difference (base-ui requires a render function) and a project-wide fix.

- **System-wide font switch to Source Sans 3.** One decisive call that unified sans, mono, and heading stacks under a single Google font loaded through `next/font/google`.

### Dashboard & Observability

- **Overview tiles for ticket counts by status.** Recognized that an agent opening the dashboard needs a "weather report" before diving into rows. Drove the creation of `TicketOverview` — a grid of stat tiles (Total, Open, In Progress, Waiting, Resolved, Closed, Critical).

- **Agent attribution on every row.** Pushed for showing *who* last acted on each ticket — not just what changed. This reshaped the data model: a new `lastUpdatedBy` snapshot on the ticket for fast table display, plus a full `history[]` audit log on a new `GET /tickets/:id/history` endpoint. Chose snapshot-at-write over live join so the record stays accurate even if an agent later changes name or leaves.

- **Audit log dialog.** Off the back of the attribution work, called for a timeline view showing every status change and classification event with actor name, timestamp, and transition pill. Implemented as a lazy-loaded `TicketHistoryDialog` so the query only fires when opened.

### Responsiveness

- **Complete mobile responsiveness, not "good enough."** Rejected a half-measure responsive pass and asked for full phone-grade support. This drove the dual-layout pattern in `TicketTable`: a `md:hidden` card stack built on `TicketCard` for phones and a traditional table from `md` up, with the filter bar, header, pagination, and dialog all flexing independently. No horizontal scrolling anywhere below the breakpoint.

### Deployment & Infrastructure

- **PATCH must work in the browser, not just Postman.** Diagnosed the "works in Postman, fails in Chrome" symptom as a CORS preflight problem, insisted on a real fix rather than routing around the issue. After an initial attempt (explicit `methods`, `allowedHeaders`, `app.options('*')`) still appeared to fail, made the call to switch to POST temporarily to unblock work — then later reverted to PATCH once the preflight cache and stale `dist/` root cause were understood. The final state keeps PATCH and its semantic correctness.

- **Render blueprint for one-click deploy.** Directed a deployment path using Render with both services provisioned from a single `render.yaml`. Caught a legitimate bug in an earlier draft: `dockerBuildArgs` is not a real field in Render's schema (documented that Docker build args must be set via the dashboard, not the blueprint). Pushed back on the documentation until it reflected reality.

- **Dockerfiles for deployment portability.** Asked explicitly for Dockerfiles that would cleanly deploy to Render and also Cloud Run with minimal delta. This led to removing hard-coded `NEXT_PUBLIC_API_URL`, converting it to a build `ARG`, removing the backend `HEALTHCHECK` directive (Render/Cloud Run use their own probes), and binding to `$PORT` rather than a fixed port — all of which make the images truly portable.

- **Frontend not on GitHub — investigate.** Caught that only a gitlink existed for the `frontend/` directory (mode `160000`, no `.gitmodules`, no inner `.git`) and asked for investigation rather than a cargo-cult "try committing again." Root cause turned out to be a dead submodule pointer; fix was `git rm --cached frontend && git add frontend/`.

### Architecture

- **Switch to the OpenAI-compatible Chat Completions API.** Raised the concern that being locked to the Anthropic Messages SDK meant *code changes* every time the team wanted to try a new model. Drove the migration to a generic `/chat/completions` client (`openai` SDK pointed at a configurable `LLM_BASE_URL`) so the model is now controlled entirely by three environment variables — `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Benefits:
  - **Zero-code model swaps**: change the env var, restart, done. No rebuild, no redeploy code path.
  - **Zero-code provider swaps**: point `LLM_BASE_URL` at OpenAI, OpenRouter (100+ models under one key), Groq, Together, or a local Ollama — the application is unchanged.
  - **No cost spike for experiments**: try a cheaper model for a week without touching the deploy pipeline; if quality holds, keep it.
  - **Runtime flexibility**: different deployments (prod vs. staging vs. a customer demo) can run different models without branching code.

  Also gained `response_format: { type: 'json_object' }` — compliant providers now enforce JSON output at the API level, eliminating a class of parse errors the service previously had to defend against manually.

---

## 6. Time Savings

| Task                      | Estimated Manual Time | With AI     | Savings |
|--------------------------|----------------------|-------------|---------|
| Project scaffolding       | 2-3 hours           | 15 minutes  | ~90%    |
| Backend CRUD + Auth       | 8-10 hours          | 1-2 hours   | ~85%    |
| LLM integration + prompt  | 4-6 hours           | 45 minutes  | ~85%    |
| Frontend components       | 6-8 hours           | 1-2 hours   | ~80%    |
| Tests                     | 4-6 hours           | 30 minutes  | ~90%    |
| Documentation             | 3-4 hours           | 30 minutes  | ~85%    |
| Docker setup              | 1-2 hours           | 15 minutes  | ~85%    |
| **Total**                 | **28-39 hours**      | **4-6 hours** | **~85%** |

The most significant time savings came from code generation and documentation. The areas requiring the most human judgment were architecture decisions, prompt engineering, and error handling edge cases.
