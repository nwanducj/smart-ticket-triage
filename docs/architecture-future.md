# Smart Triage — Architecture Today vs. How I'd Rebuild It

A candid look at what the current architecture does well, where it would start
to hurt under real load, and what I'd change if I were building v2 with the
benefit of hindsight.

---

## 1. LLM calls are synchronous HTTP work

**Today:** When a ticket is submitted, the backend awaits the LLM call inside
the same request that saves the ticket. If the LLM is slow or down, the
customer waits — or the ticket lands unclassified and stays that way.

**Better:** Save the ticket immediately, return 201, and drop a classification
job onto a queue (BullMQ + Redis, or SQS). A worker picks it up, calls the LLM
with retries and backoff, and writes the result back. The ticket flips from
"classifying" to "classified" via a status field, and the dashboard subscribes
to updates.

---

## 2. The dashboard polls — or doesn't know things changed

**Today:** Agents see stale data until they refetch. If two agents open the
same ticket, one overwrites the other silently.

**Better:** A WebSocket (or Server-Sent Events) channel pushes ticket updates
to every connected dashboard. Optimistic locking on the ticket document
(version field) rejects stale writes with a clear conflict error.

---

## 3. Audit log is a separate collection written by hand in each controller

**Today:** Every status/priority/assignment change calls a "snapshot this"
helper. Easy to forget; easy to desync.

**Better:** A Mongo change stream (or a Mongoose middleware hook) automatically
records every mutation to an append-only event log. The ticket's current state
becomes a projection of its events — closer to event sourcing, without the
dogma.

---

## 4. One monolithic backend

**Today:** Auth, tickets, LLM classification, and audit all live in one Express
app. Fine for now, but the LLM path has very different scaling needs (bursty,
slow, expensive) than the CRUD path (fast, cheap, steady).

**Better:** Split the classifier into its own small service. The main API
stays thin and fast; the classifier can be scaled, rate-limited, and swapped
independently — and if it falls over, tickets still submit.

---

## 5. Frontend state is scattered

**Today:** Auth lives in React Context, ticket data lives in React Query, form
state lives in `useState`. Three mental models.

**Better:** Keep React Query as the single source of truth for server data (it
already is), move auth into a Query as well (with a `queryFn` that decodes the
JWT), and let `useState` handle only genuinely ephemeral UI state. One
pattern, not three.

---

## 6. Config is env vars all the way down

**Today:** LLM provider, model, secrets, feature flags — all env. Changing a
model requires a redeploy.

**Better:** Runtime config in a small admin table (or a config service like
LaunchDarkly for flags). An admin can swap models, tweak confidence
thresholds, or toggle mock mode from the dashboard. No redeploy, no downtime.

---

## 7. Single-tenant by accident

**Today:** Every ticket belongs to "the company." There's no org model.

**Better:** Add an `organisationId` on every document from day one, even if
there's only one org. Scoping later is painful; scoping early is free.

---

## The honest bit

None of this is *wrong* today — it's a demo built to ship. But if real
customers started using it:

- **Items 1 and 2** would hurt first (slow submits, stale dashboards).
- **Item 7** would hurt worst (retrofitting multi-tenancy is a full rewrite).
- **Item 3** would quietly save someone's job during an incident.
