# ChatXIV — Non-Functional Requirements & Operations Scope

**Document type:** Technical summary (NFR and operations scoping)  
**References:** BRD v2.1 (§7–§9, §11, §15–§16)  
**Last updated:** February 28, 2025

This document scopes non-functional requirements and operations for ChatXIV per the BRD, with implementation-oriented definitions for performance, availability, cost, observability, and security.

---

## (a) Performance Budget and Exclusions (NFR-3)

### Targets (BRD §9 NFR-3)

| Metric | Target | Notes |
|--------|--------|--------|
| **First useful token** | ≤ 5 s | Time from request submission to first token (or first meaningful chunk) delivered to the client. |
| **Full answer** | ≤ 15 s | Time from request submission to complete response for a typical single-turn query. |

### Definition of “Typical” Query

**In scope for the 5s / 15s targets:**

- **Single-turn** (no multi-turn context beyond optional last-answer refinement).
- **Phase 1 (MVP) categories:** BiS (FR-1), raid plans (FR-7), story progression (FR-10), unlocks (FR-5), settings (FR-9).
- **Representative examples:** “What is BiS for Aloalo Savage in Endwalker?”; “How do I unlock UCOB?”; “Where do I change camera height?”; “Where is [NPC] for this quest?”; “What raid plans exist for [fight]?”
- **Conditions:** Normal load; primary data sources (e.g. XIVAPI, cache) available; no concurrent burst that exhausts rate limits.

**Exclusions (not counted against the SLA):**

- **Multi-step or heavy queries:** e.g. full relic step list with user-selected step, “what to greed?” with large gear paste (Phase 2).
- **Cold / first request:** First request after deploy or cache eviction when upstream (e.g. XIVAPI, wiki) must be called and cache is empty.
- **Third-party unavailability:** When a required API (XIVAPI, wiki, etc.) is down or rate-limited; system may return cached answer or “source temporarily unavailable” (BRD §7.3 fallback) — these responses are excluded from “full answer within 15s” but should still aim for first useful token (e.g. “Checking…” or cached snippet) within 5s where possible.
- **Abuse / prompt-injection handling:** Refusal paths (NFR-1, §9.1) may respond faster; if extra validation adds latency, document and keep under 5s for first token.
- **Optional/Phase 2 categories:** Rotations, patch history, crafting, relic progression, raid gear greed — targets to be set in technical design for Phase 2.

Technical design will define percentiles (e.g. p95) and measurement method (client-visible timings vs server-side).

### How to Achieve the Budget

| Lever | Purpose |
|-------|--------|
| **Caching** | Cache game data, BiS lists, raid plan metadata, unlock steps, settings locations (BRD §7.3, NFR-7). Cache-first reduces latency and third-party calls. |
| **Async prefetch** | Prewarm or background-refresh high-value entries (e.g. popular BiS, raid plans) so first request is cache-hit. |
| **Streaming response** | Stream tokens/chunks to the client so “first useful token within 5s” is achievable even when full answer takes longer; client shows “Thinking” until first chunk (§8.2). |
| **Timeouts to third-party APIs** | Set bounded timeouts (e.g. 3–5 s per upstream call) so one slow API does not blow the 15s budget; fall back to cache or “source unavailable” (BRD §7.3). |
| **Time budget per stage** | Allocate a budget across: classify intent/category → fetch from cache or API → format/synthesize → stream. Example: classify &lt; 1s, fetch &lt; 6s (so first token by ~5s), format/stream remainder within 15s total. Technical design will define exact split and timeouts. |

---

## (b) Availability Definition and Implementation (NFR-4)

### Target (BRD §9 NFR-4)

- **99%** availability for the **chat service** over a **rolling month**.

### What Counts as “Chat Service”

- **In scope:** The ChatXIV **application and API** that the user hits (hosted web UI + backend/API used by that UI). Availability = successful handling of chat requests (e.g. HTTP 2xx or successful stream start within SLA window).
- **Out of scope:** Third-party APIs (XIVAPI, wikis, Universalis, FFLogs, etc.). Their outages are **excluded** from the 99% calculation (BRD §9 NFR-4). When they are down, ChatXIV may return cached data or “source temporarily unavailable” and still count as “available” for the chat service.

### Exclusions (Do Not Count as Downtime)

- **Planned maintenance:** Announced maintenance windows; duration and notice to be defined in operations.
- **Third-party API outages:** Unavailability of XIVAPI, wikis, or other external services (handled via cache/fallback messaging per BRD §7.3).

### Practical Implementation

| Approach | Description |
|---------|-------------|
| **Stateless app** | No server-side session state required for core chat; enables restart/redeploy and horizontal scaling without sticky sessions. Conversation context may be server-stored (Redis/DB) or client-sent (see “Conversation history storage” below). |
| **Health checks** | Liveness (process up) and readiness (can serve traffic, e.g. cache/DB reachable). Load balancer or platform uses readiness for routing. |
| **Single region with restart/redeploy** | MVP: single region, single AZ acceptable. Availability via fast restart, automated redeploy, and dependency timeouts so one bad upstream does not hang the process. |
| **When to consider multi-AZ or multi-region** | When 99% cannot be met (e.g. regional outages, need for higher SLA) or when product/business requires it; document trigger (e.g. “two incidents in 6 months where single-AZ caused &gt;1% downtime”). |

Measurement: uptime = (total time in month − excluded time − unplanned outage time) / (total time − excluded time). Define “unplanned outage” (e.g. error rate above X% for Y minutes) in technical design.

### Conversation history storage (client vs server, load impact)

**Cookies:** Not suitable for full chat history. Browsers limit cookies to ~4–8 KB total per domain; a few message pairs can exceed that. Use cookies only for session ID (or similar small state).

**localStorage / sessionStorage:** Can hold full conversation (typically 5–10 MB per origin). Storing history there allows restoring the chat on refresh without the server persisting it.

**Load impact:** The backend still needs recent messages for follow-up (FR-11). So either (1) the server stores conversation (e.g. Redis) and the client sends only session ID, or (2) the client stores conversation and sends last N turns in each request. Option (2) **reduces server storage** but does not reduce per-request processing; request payloads are larger. Technical design may choose server-only, client-only (context in body), or hybrid. See TRD §3.1.1.

---

## (c) Observability Data Model and Retention Notes (NFR-6, FR-25, FR-26)

### Usage Observability (FR-26, BRD §7.5, §9 NFR-6)

**Capture (no PII, no full message text in analytics):**

| Data point | Purpose | Privacy |
|------------|---------|--------|
| **Traffic volume** | Request count, trends over time (e.g. by hour/day). | Aggregate only. |
| **Generalized asks/topics** | Category tag per request (e.g. BiS, raid plans, story, unlocks, settings) — from classifier, not from raw text. | Aggregated and anonymized; no full query or message text. |
| **Visit patterns** | Visit frequency, time-of-day/day-of-week patterns. | Session/cookie or anonymous ID only; no identity. |
| **Session duration** | Time from first to last activity in session (or similar). | Anonymized. |

**How to capture without PII:** Do not log or send full user message text to analytics. Send only: timestamp, **category/topic label** (from intent classifier), optional anonymized session ID, and aggregate counters. Retention (raw vs aggregated) to be defined in technical design and aligned with privacy expectations.

**Retention (to define in tech design):**

- **Raw event-level data:** Short retention (e.g. 7–30 days) if kept at all; restrict access; use only for debugging or one-off analysis.
- **Aggregated data:** Longer retention (e.g. 12+ months) for trends, traffic by topic, session duration, visit patterns — no individual messages or identifiers.

### Feedback (FR-25, BRD §7.5)

| Element | Description |
|---------|-------------|
| **Thumbs up/down** | Per message (default); optional per-conversation in tech design. |
| **Thumbs down** | Triggers 2–4 predefined options (e.g. “Wrong answer,” “Outdated,” “Missing info,” “Other”) plus optional free-text. Confirmation after submit; non-blocking. |
| **Storage and aggregation** | Store feedback with message/session context needed for aggregation **by query category** (not by raw text). Aggregate for product (e.g. satisfaction by category, thumbs-down rate by category). |
| **Idempotency (FR-27)** | Feedback submission idempotent (e.g. client-generated idempotency key or message-id + user action); duplicate submits do not double-count. |

**Feedback free-text:** Moderation and handling of abusive/off-topic content per §9.1; report path available to users. Storage and retention for free-text to be defined in technical design (minimize retention, restrict access).

### Tools (NFR-6, operations)

| Area | Recommendation |
|------|----------------|
| **Logging** | Structured logs (JSON); log levels; no full message content; correlation ID per request. |
| **Metrics** | Request rate, latency (e.g. p50/p95, first-token and full-response), error rate, cache hit rate (per layer/category if useful). |
| **Tracing** | Optional; add if needed to debug latency across classify/fetch/format or third-party calls. |
| **Stack** | Use hosted log/metrics (e.g. cloud provider or vendor) to reduce ops burden; exact stack in technical design. |

---

## (d) Security and Rate-Limit Approach (§9.1, FR-27, NFR-1)

### Security (BRD §9.1)

| Requirement | Implementation |
|-------------|----------------|
| **HTTPS** | All user traffic over HTTPS (TLS). |
| **Secrets server-side only** | API keys (XIVAPI, OpenAI, wikis, etc.) and credentials only on backend; never exposed to client or in frontend bundles. |
| **OpenAI / LLM credential storage (TR-19a)** | Store OpenAI API key **encrypted at rest** (secrets manager or encrypted config); **never log** the key or `Authorization` header; **HTTPS only** for OpenAI calls. Ensures token cannot be scanned from network logs or config dumps. |
| **Rate limiting per user/session** | FR-27: rate limits to protect backend and third-party APIs; applied per user or per session (see anonymous MVP below). |
| **Abuse resistance** | Design to resist single-actor abuse (e.g. one client consuming disproportionate capacity); rate limits + optional abuse detection in tech design. |
| **Refusal (NFR-1, §9.1)** | Explicit keywords (ToS/guideline violations): refuse with brief, non-judgmental message; no substantive response. Prompt injection / jailbreak / off-scope: remain FFXIV-only; refuse briefly. Scope adherence: no system prompt or internal instruction disclosure. |
| **Feedback free-text moderation** | Storage and handling of abusive/off-topic feedback defined in technical design; align with NFR-1 and content policy. |
| **Report path** | Users can report harmful output or abuse; placement and process defined by product. |

### Anonymous MVP: How to Rate Limit (BRD §11.1)

Without mandatory sign-in, identify “user” or “session” for rate limiting by one or more of:

| Method | Pros | Cons |
|--------|------|------|
| **Session ID** | Server-issued session cookie or token; stable within session. | Users can clear cookies to get new session. |
| **IP** | Simple. | Shared IPs (NAT, offices) can throttle many users; VPNs can evade. |
| **Fingerprint** | Browser fingerprint (e.g. hash of UA, screen, etc.) for additional signal. | Privacy considerations; not unique. |

**Recommendation:** Primary limit by **session ID** (and optionally IP as a backstop). Define limits (e.g. N requests per minute per session, M per hour per IP) and **graceful message** when rate limited: e.g. “You’ve reached the limit for now; please try again later” (BRD §9.1). Idempotency for feedback (FR-27) via idempotency key or message-id to avoid double-counting.

---

## (e) Cost Levers (NFR-7, §15, §16)

### Design Principles (BRD §9 NFR-7, §7.3)

- **Cache-first** for game data and knowledge; batch or background refresh where possible.
- **Configurable rate limits** to third-party APIs to cap cost and stay within provider limits.
- **No stale data without “last updated”** — user-facing recency indicator; clear errors when source unavailable (NFR-7).

### Cost Ceiling (BRD §16)

- When **monthly (or annual) cost exceeds agreed ceiling** (e.g. $X/month), sustainability owner triggers **pricing/funding review** within agreed days.
- Runbook: e.g. stricter caching, disable optional features, or trigger pricing/funding review (BRD §12 cost overrun).

### Estimate Levers (BRD §15)

| Lever | What to estimate / control |
|-------|----------------------------|
| **LLM tokens** | Input/output token volume per request; model choice; caching of embeddings or common responses where applicable. |
| **API calls** | XIVAPI, wikis, Universalis, FFLogs, etc.: calls per request, rate limits, and cost tier; cache hit rate directly reduces calls. |
| **Egress** | Data transfer out (responses, assets); relevant if responses or assets are large. |
| **Hosting** | Compute (e.g. serverless or containers), database/cache, log/metrics storage; scaling behavior and single-region vs multi-AZ. |

Technical design (or “Cost and Pricing Assumptions” doc per §15) should document assumptions, scenarios (e.g. 5k MAU → $Y/month), and levers so cost stays predictable and within ceiling.

---

## BRD Section Reference

| Topic | BRD sections |
|-------|------------------|
| Performance | §9 NFR-3; §7.3 (fallback); §8.2 (loading) |
| Availability | §9 NFR-4 |
| Cost | §9 NFR-7; §7.3 (cache-first, rate limits); §15 Cost; §16 Sustainability |
| Observability | §7.5 FR-25, FR-26; §9 NFR-6; §8.3 (feedback UI) |
| Idempotency / rate limiting | FR-27; §9.1 (limits, graceful message) |
| Security & safety | §9.1; NFR-1 (refusal, scope); §11.1 (anonymous MVP) |

---

*This summary is for technical design and operations planning. Implementation details (exact timeouts, retention periods, rate-limit values, and tooling choices) belong in the technical design document.*
