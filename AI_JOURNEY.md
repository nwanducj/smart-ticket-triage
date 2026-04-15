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

## 5. Time Savings

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
