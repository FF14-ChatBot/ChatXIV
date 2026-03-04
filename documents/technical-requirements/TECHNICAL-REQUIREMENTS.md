# ChatXIV — Technical Requirements Document (TRD)

**Document version:** 1.11  
**Based on BRD:** 2.1 (February 28, 2025)  
**Status:** Scoping complete; implementation details in technical design  
**Author role:** Senior software engineer / architect (technical scoping)

---

## 1. Purpose and Scope

This document defines **technical requirements** for ChatXIV derived from the Business Requirements Document (BRD). It is the single technical-requirements reference for:

- **System design and architecture** — components, tech stack, data flow, infrastructure
- **Data and APIs** — sources, ingestion, caching, fallback, attribution
- **Non-functional requirements** — performance, availability, cost, observability, security
- **Client and UX** — web UI, API contract, error states, accessibility

**Relationship to other documents:**

| Document | Purpose |
|----------|---------|
| **BRD** | Single source of truth for business and functional requirements. |
| **TRD (this doc)** | Technical requirements with BRD traceability; no business scope changes. |
| **TECHNICAL-ARCHITECTURE-SUMMARY.md** | Detailed architecture, stack, data flow, infrastructure, tradeoffs. |
| **Data-and-API-Integration-Scope.md** | Per-category sources, APIs, cache, fallback, attribution, gaps. |
| **NFR-and-Operations-Scope.md** | Performance budget, availability, observability, security, cost levers. |
| **Web-Client-UX-Scope.md** | Client architecture, UX checklist, API shape, error states, **UI design and mockup tools** (React-compatible, agent-friendly). |

**Suggested reading order:** (1) BRD → (2) TRD (this doc) → (3) TECHNICAL-ARCHITECTURE-SUMMARY → (4) Data-and-API-Integration-Scope → (5) NFR-and-Operations-Scope → (6) Web-Client-UX-Scope. For a quick pass: BRD → TRD → TECHNICAL-ARCHITECTURE-SUMMARY.

Technical design (later) will specify: exact endpoints, schemas, cache TTLs, rate-limit values, retention periods, runbooks, and the OpenAPI/Swagger spec location and update process.

---

## 2. Executive Summary

ChatXIV is a **hosted web chatbot** that answers FFXIV questions with **sourced, attributed** data. MVP supports five query categories (BiS, raid plans, story progression, unlocks, settings), a **versioned backend API** (for web now and a future Dalamud plugin), **cache-first** integration with XIVAPI and wiki MediaWiki APIs, and **RAG (retrieval-augmented generation)** using **OpenAI** (token subscription): retrieve from corpus → format with LLM; facts only from retrieved data, no hallucination. **OpenAI credentials** stored encrypted at rest, server-side only, never logged or sent to client (TR-19a).

![ChatXIV architecture](chatxiv-architecture.png)

**Key technical commitments:**

- **First useful token ≤ 5 s, full answer ≤ 15 s** for typical single-turn MVP queries (NFR-3).
- **99% availability** for the chat service (excluding planned maintenance and third-party outages) (NFR-4).
- **Cost predictability**: cache-first, configurable rate limits, no stale data without visible "last updated" (NFR-7).
- **Single stable API** consumed by web and future Dalamud; no game memory reading (§4.2, §5).
- **Observability and feedback** without PII: traffic by topic, session patterns, thumbs up/down with category aggregation (FR-25, FR-26).

**Decisions (see §6):** wtfdig/Tomestone.gg linking OK; wiki excerpt when possible; raid plans from WTFDIG first, else YouTube (timestamp) or raidplans.io; Source = clickable dropdown per message; XIVAPI assumed 50 req/s. **Open:** The Balance (recommend manual curation for MVP), report path.

---

## 3. Technical Requirements by Area

Each requirement is stated as a **Technical Requirement (TR)** with **BRD traceability**. Implementations are described at a level sufficient for technical design; exact values (TTLs, limits, retention) are left to technical design.

---

### 3.1 Architecture and System Components

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-1** | The system SHALL comprise: (1) hosted **Web UI**, (2) **versioned Backend API** (single contract for web and future Dalamud), (3) **Chat/conversation service** (session-only state), (4) **Knowledge/resolution layer** (query → category → data source), (5) **External API clients** (XIVAPI, MediaWiki, etc.) server-side only, cache-first. | §4.1, §5, §7.1–7.3 |
| **TR-2** | The backend SHALL be **stateless** at the process level. Conversation state for follow-up (FR-11) MAY be held **server-side** (e.g., Redis or DB keyed by session ID) **or** **client-side** (see §3.1.1). If client-side: client sends last N turns in each request; server does not persist conversation content. | §7.2 FR-11, NFR-4 |
| **TR-3** | The API SHALL be **RESTful**: resource-oriented URLs, standard HTTP methods (GET, POST, etc.), JSON request/response bodies where applicable, and standard HTTP status codes. It SHALL use **URL path versioning** (e.g., `/v1/chat`, `/v1/feedback`) with a defined deprecation/sunset policy (e.g., headers, support N and N-1). | §5, §7.3 |
| **TR-3a** | The system SHALL provide and maintain **API documentation** (e.g. **OpenAPI 3.x** / **Swagger**) that describes all endpoints, request/response schemas, authentication (if any), and versioning. Documentation SHALL be updated as part of the development process (e.g. spec in repo or generated from code) so developers have an internal reference of what is in use and available. Use **free, open-source** tooling (e.g. Swagger UI, Redoc, or equivalent) to serve or render the spec. | §5, §7.3 |
| **TR-4** | Answer generation SHALL use **RAG (retrieval-augmented generation)**: semantic search over the knowledge corpus (e.g. wiki, curated content) → retrieve relevant chunks → format and cite with an LLM pass. The LLM SHALL NOT generate facts (gear, steps, patch) from its weights; facts SHALL come only from **retrieved data**; the LLM rephrases and inserts citations. If no sourced data is found, the system SHALL return a clear "I couldn't find a sourced answer" and SHALL NOT invent content. **LLM provider:** OpenAI; token subscription (usage-based). | NFR-1, NFR-3, NFR-7, §7.3 |
| **TR-5** | For MVP, the system SHALL be implemented as a **modular monolith** (one API process containing chat, classification, knowledge layer, and API clients). Separation into additional services SHALL be considered only when a clear bottleneck is identified. | §4.1, §15, NFR-4 |

#### 3.1.1 Persistence Model design

The following are design choices with a **preferred** option first and **other options** below; non-preferred options include a summary of why they were not chosen.

##### Persistence store: NoSQL (Preferred)

The system SHALL use a **NoSQL** store (e.g. document DB or key-value with persistence) for durable persistence. Rationale: the product only requires (1) **OAuth2 user + login** (user identity, provider); (2) **chats linked to said user** (sessions associated with user ID); (3) **at most 10 saved chats per user**; (4) **metrics** queryable by user or by query/category for analytics—no need for joins or relational integrity across many entities. NoSQL supports this with a simple schema (e.g. user document, session documents keyed or indexed by user_id) and keeps the design simple. Technical design SHALL define the exact store (e.g. MongoDB, Redis with persistence, or similar) and schema (user, session/chats, metrics). When OAuth and saved sessions are implemented, **saved chats** SHALL be stored in this persistence store with a **maximum of 10 chats per user**.

##### Persistence store: SQL

A relational (SQL) database could store users, sessions, and metrics with referential integrity and rich querying.

**Summary (why not chosen):** Product needs are limited (user, linked chats, max 10 per user, metrics by user/query). No requirement for joins across many entities or complex relational constraints. NoSQL keeps the design simpler and matches the access patterns; SQL would add operational and schema overhead without a clear benefit for this scope.

##### Cache: Redis (Preferred)

Assuming **Redis** remains the best lightweight option, the system SHALL use **Redis** as the cache for **most frequent queries** (e.g. popular BiS, raid-plan, or story lookups) in addition to any use for active session state. This supports the cache-first approach (TR-13, TR-15) and keeps latency and third-party API load low. Technical design SHALL define cache key shape, TTL, and invalidation (including alignment with patch cadence per §3.1.3).

##### Cache: In-process or no shared cache

Application could rely only on in-process memory or no shared cache layer.

**Summary (why not chosen):** Multiple API instances need a **shared** cache so that repeated queries benefit regardless of which instance handles the request. TTL and invalidation (e.g. post-patch) are easier with a dedicated cache store (Redis). In-process only would duplicate data per instance and not support cache-first across the fleet.

##### Conversation state: Server-side session store (Preferred)

Client sends only the new message + session ID; server looks up conversation in the persistence store (e.g. Redis for active session or NoSQL) and sends context to the handler. **Load:** server storage and one lookup per request. When OAuth and saved sessions exist, this aligns with saved chats in NoSQL. Technical design SHALL use server-side session store (NoSQL or Redis keyed by session ID) with client sending only session ID when this option is selected. Cookies SHALL NOT be used for full chat history (size limit); use cookies only for session ID or similar small state.

##### Conversation state: Client-side storage

Client stores conversation history (e.g. localStorage/sessionStorage) and sends the new message + **last N messages** in each request; server does not persist conversation content. **Cookies** are too small for full chat history (~4–8 KB per domain); **localStorage / sessionStorage** can hold 5–10 MB per origin. Client-side persistence reduces server storage and can restore the chat on refresh without the server remembering. Per-request processing (classification, fetch, format) is unchanged; request payloads are larger (context sent every time).

**Summary (why not chosen):** When OAuth and saved sessions are implemented, the server already persists saved chats; holding only active session state server-side is consistent. Client-sent context every request increases payload size and does not reduce per-request compute. Server-side session store is preferred for consistency and for supporting saved sessions and metrics tied to the same store.

**Recommendation:** Technical design SHALL choose one of: (1) **server-side session store** (Preferred), or (2) client-side storage (last N turns in each request). The preferred option is server-side session store (NoSQL or Redis keyed by session ID; when OAuth exists, saved chats in NoSQL).

#### 3.1.2 RAG and OpenAI credential storage

- **RAG:** Answer generation uses **retrieval-augmented generation** (TR-4): retrieve from corpus → format/cite with OpenAI. Provider: **OpenAI**; billing via **token subscription** (usage-based).
- **Why encrypt and protect the API key:** The OpenAI API key (or token) authenticates your subscription. If it is stored in plaintext or appears in logs or client traffic, it can be captured from network logs, config dumps, or browser tools. Storing it **encrypted at rest** and **never logging or sending it to the client** ensures it cannot be scanned from network logs or stolen from at-rest storage. TR-19a specifies the mechanism.

#### 3.1.3 RAG corpus: source-only vs. reusing queried responses

Design choice: what to use as the RAG retrieval corpus. Preferred option first; other options below with a summary of why not chosen.

##### RAG corpus: Canonical source data only (Preferred)

The RAG corpus SHALL be **canonical source data only** (wiki, XIVAPI, curated BiS, raid plans, etc.). Answers are derived at query time from that corpus (retrieve → format → cite). This preserves up-to-date values and correct attribution to the real sources (NFR-2, NFR-5).

##### RAG corpus: Reusing queried responses

Storing **queried responses** (previous assistant answers or Q&A pairs) and feeding them back into the RAG corpus is technically possible.

**Summary (why not chosen):** (1) Answers are **snapshots**—e.g. "BiS as of 6.4" becomes stale after 6.5, and re-retrieving them propagates outdated facts; (2) attribution should point to the **original source** (Balance, wiki, etc.), not to "what we said last time"; (3) consistency or reuse is better achieved via **response caching with explicit invalidation**, not by treating answers as retrieval targets. Technical design MAY document this option for future consideration but SHALL NOT use queried responses as the primary RAG corpus for MVP.

**Patch cadence and freshness:** FFXIV patch notes and patch release typically occur **Tuesday 3:00 AM CST**. This known schedule SHALL be used to support freshness: **corpus refresh** and **cache invalidation** (e.g. for source data and any response cache) MAY be aligned to run after patch (e.g. weekly post–patch). The patch cadence does **not** make it safe to use queried responses as RAG corpus; it supports keeping the **real** corpus and caches up to date.

---

### 3.2 Data Sources, APIs, Caching, and Attribution

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-6** | For each MVP query category, technical design SHALL define: **primary source(s)**, **ingestion method** (API, manual curation, or scrape per approval), **cache TTL**, and **invalidation trigger**. BiS: The Balance (per product decision, see §6). **Raid plans:** Prefer **WTFDIG** when possible; else links to **YouTube** (timestamp when possible) or **raidplans.io**. Story: XIVAPI + MediaWiki; unlocks and settings: MediaWiki. **Wiki content:** Excerpt when possible (with attribution); linking in addition. **wtfdig / Tomestone.gg:** Linking only is approved for now. | §4.1, §7.3, §10 |
| **TR-7** | The system SHALL integrate **XIVAPI** for: game data (items, actions, jobs), search/lookup, quests (story), servers/datacenters. All requests SHALL support the **language** parameter (en, ja, de, fr) where applicable. Server-side requests SHALL use an **API key**. **Working assumption:** Cap at **50 requests per second** (server-side) unless XIVAPI documents a different limit; implement configurable throttle and backoff. | FR-15, FR-16, FR-19, FR-20 |
| **TR-8** | The system SHALL integrate **MediaWiki API** (ConsoleGamesWiki, Fandom FFXIV wiki) for unlocks, settings, and story/quest guides. Requests SHALL use a proper **User-Agent** and SHALL respect per-wiki policies and **robots.txt**. Rate limiting SHALL be conservative (e.g., configurable cap per wiki) with backoff on 429/5xx. | §7.3 FR-21, §10 |
| **TR-9** | When a primary source is **unavailable**: if a **cached response exists and age &lt; N hours** (N configurable, e.g., 12–24), the system SHALL serve the cache and SHALL show a notice that data is cached and source is temporarily unavailable; otherwise the system SHALL return a clear "source temporarily unavailable" message and MAY suggest retry or link. | §7.3 fallback |
| **TR-10** | Every data-backed answer SHALL include **source attribution** via a **clickable "Source" control** at the bottom of each assistant message (alongside thumbs up/down): unintrusive label "Source" with down arrow (▼). On click: dropdown opens listing all sources (name, patch/last-updated, optional link); chat MAY scale to accommodate; arrow toggles to up (▲). Stored metadata: source_name, source_url (optional), patch_or_date, last_updated. Multiple sources SHALL be listed in the dropdown. | FR-12, NFR-5 |
| **TR-11** | Use of third-party data SHALL prefer **linking and short attributed summarization** over full reproduction. One-time legal review of data sources and attribution process SHALL be carried out; recurring review as defined by business. | NFR-5 |

---

### 3.3 Performance, Availability, and Cost

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-12** | **First useful token** SHALL be delivered within **5 seconds**, and **full answer** within **15 seconds**, for a **typical** single-turn MVP query (BiS, raid plans, story, unlocks, settings) under normal load and available sources. "Typical" and **exclusions** (cold/first request, third-party unavailability, multi-step/heavy queries, Phase 2 categories) SHALL be defined in technical design. | NFR-3 |
| **TR-13** | The system SHALL achieve the performance budget via: **cache-first** for game data and knowledge; **timeouts** to third-party APIs (e.g., 3–5 s); **time budget per stage** (classify → fetch → format); and **streaming** of response where used so first token is visible within 5 s. | NFR-3, §7.3 |
| **TR-14** | **Availability** of the **chat service** (application + API) SHALL be **99%** over a rolling month. **Excluded**: planned maintenance, third-party API outages. The system SHALL use health checks (liveness, readiness), stateless design, and single-region deployment for MVP; multi-AZ/multi-region only when justified by incidents or SLA. | NFR-4 |
| **TR-15** | The system SHALL be designed for **cost predictability**: cache-first, batch or background refresh where possible, configurable rate limits to third-party APIs. Cost optimizations SHALL NOT degrade UX: no stale data without a visible "last updated"; no confusing error messages. A **cost ceiling** and runbook (e.g., stricter caching, disable optional features, or trigger pricing/funding review) SHALL be defined per BRD §16. | NFR-7, §7.3, §15, §16 |

---

### 3.4 Observability and Feedback

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-16** | The system SHALL support **usage observability**: traffic volume, **generalized asks/topics** (e.g., category tags: BiS, raid plans, story, unlocks, settings—aggregated and anonymized), visit patterns, and session duration. **Full message text SHALL NOT** be stored or sent to analytics; only category/topic and aggregate counters. Retention for raw vs aggregated data SHALL be defined in technical design and SHALL comply with privacy expectations. | FR-26, NFR-6 |
| **TR-17** | The system SHALL provide a **feedback mechanism**: **thumbs up / thumbs down** per message. **Thumbs down** SHALL trigger a dropdown of **2–4 predefined options** (e.g., Wrong answer, Outdated, Missing info, Other) plus optional free-text. Submission SHALL be **idempotent** (e.g., idempotency key or message-id); confirmation SHALL be shown without blocking the conversation. Feedback SHALL be stored and **aggregated by query category** for product use. | FR-25, FR-27 |
| **TR-18** | The system SHALL use **structured logging** (e.g., JSON), **metrics** (request rate, latency, error rate, cache hit rate), and optionally tracing. Logs SHALL NOT contain full user message content. A hosted or provider log/metrics stack is recommended; exact tooling in technical design. | NFR-6 |

---

### 3.5 Security, Safety, and Rate Limiting

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-19** | All user traffic SHALL use **HTTPS**. **API keys and credentials** (XIVAPI, OpenAI, wikis, etc.) SHALL be **server-side only** and SHALL NOT be exposed to the client or in frontend bundles. | §9.1 |
| **TR-19a** | **OpenAI (and any LLM) credentials** SHALL be stored so they cannot be scanned from network logs or stolen at rest: (1) **Encrypted at rest** — use a secrets manager or encrypted config (e.g. env vars from a secure store, or platform secret management with encryption); the API key SHALL NOT be stored in plaintext in config files or code. (2) **Never sent to the client** — all OpenAI calls SHALL be made from the backend only; the key SHALL NOT appear in request/response to the browser. (3) **Never logged** — application and infrastructure logs SHALL NOT include the API key or the `Authorization` header when calling OpenAI; redact or omit credentials from any log that could capture outbound requests. (4) **HTTPS only** — all outbound calls to the OpenAI API SHALL use HTTPS so the key is encrypted in transit. This ensures the token/API key used for the subscription cannot be captured from network logs or config dumps. | §9.1 |
| **TR-20** | The system SHALL apply **rate limiting** using a **leaky bucket** (or equivalent) algorithm per user/session (and optionally per IP as backstop) to protect the backend and third-party APIs and to mitigate DDoS and abuse. The leaky bucket SHALL smooth burst traffic and enforce a sustained request cap. For **anonymous MVP**, rate limiting SHALL use at least **session ID** (e.g., server-issued cookie or token). When a user is rate-limited, the system SHALL show a **graceful message** (e.g., "You've reached the limit for now; please try again later") and SHALL NOT show a generic error. Technical design SHALL define bucket capacity and refill rate (e.g., requests per minute). | FR-27, §9.1, §11.1 |
| **TR-20a** | In addition to rate limiting (TR-20), the system SHALL implement **additional DDoS and cost-protection mechanisms** to prevent overloading and uncontrolled cost: (1) **Request size limits** — enforce a maximum request body size (e.g. message length cap) and reject oversized requests with a clear response; (2) **Timeouts** — connection and request timeouts (e.g. per TR-13) to avoid long-lived or hung requests consuming resources; (3) **Concurrent limits** — cap concurrent requests or active sessions per user/session or per IP where practical; (4) **Cost circuit breaker** — when a cost ceiling or runbook threshold is approached (per TR-15), the system SHALL support triggering stricter limits, optional degradation (e.g. cache-only), or alerting so that cost and load can be contained. Technical design SHALL define concrete values (max body size, timeout values, concurrent caps) and the cost-threshold runbook. | §9.1, NFR-7, §16 |
| **TR-21** | The system SHALL **refuse** with a brief, non-judgmental message (e.g., "I can't help with that") for: **explicit keywords** (content violating platform ToS or community guidelines); **prompt injection or jailbreak** attempts; **off-scope** (non-FFXIV) requests; and SHALL NOT disclose system prompts or internal instructions. Free-text feedback SHALL have defined handling for abusive/off-topic content; a **report path** for users SHALL be available (placement/process per product). | NFR-1, §9.1 |

---

### 3.6 Client (Web UI) and API Contract

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-22** | The client SHALL be a **hosted web UI** with a workable **chat interface**: enterable text field, message list, assistant bubbles, loading state, and **first-run/empty state** with example queries or suggested topics (e.g., "Try: What is BiS for Aloalo Savage?"). Placeholder SHALL read: *"Please ask me anything related to FFXIV."* The client SHALL support **keyboard navigation** and **screen-reader-friendly** structure (e.g., ARIA labels for messages and actions). The client SHALL support **light mode** and **dark mode**, with **dark mode** as the default; user preference MAY be persisted client-side. | FR-24, §8.1 |
| **TR-23** | **Loading:** After submit, the UI SHALL show small text *"Thinking"* with a **pulsate left-to-right** (or equivalent) animation until the first meaningful response. **Response:** Assistant message bubble; **succinct, non-verbose**. **Source:** At bottom of each assistant message, a clickable **"Source"** with down arrow (▼), unintrusive; on click, dropdown opens with list of sources (name, patch/last-updated, optional link), chat MAY scale, arrow toggles to ▲. **Feedback:** Thumbs up/down alongside Source; thumbs down → 2–4 options + optional free text; confirmation without blocking. **New Chat:** Button ends session, starts new; SHALL show **unsaved warning**. **Exit/leave:** On navigate away, close tab, or New Chat, SHALL show popup: *"Chats are currently not saved for this release. Make sure to manually save anything before exiting."* | §8.2, §8.3, §8.5, §8.6, FR-12 |
| **TR-24** | The **chat API** SHALL accept: message text, **session/conversation ID** (for follow-up context), and optional language. It SHALL return (or stream): answer content, **source citations** and patch/last-updated, and a **message ID** for the assistant turn (for feedback). The **feedback API** SHALL accept: message ID (or conversation + turn), rating (up/down), reason and free text when down, and an **idempotency key**. | §5, FR-11, FR-12, FR-25, FR-27 |
| **TR-25** | The following **error/edge states** SHALL be supported and shown in the chat UI: off-topic/FFXIV redirect; "I couldn't find a sourced answer for that" (with optional rephrase/wiki link); rate limit message; source temporarily unavailable (with optional retry/cache notice); refusal for ToS/scope (brief, non-judgmental). | NFR-1, §7.3, FR-27, §9.1 |

---

### 3.7 Infrastructure (Practical)

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-26** | For MVP, infrastructure SHALL use a **single region**. Hosting SHALL be either: (A) **split** — static frontend on Vercel/Netlify (or similar), API on Railway/Render/Fly.io (or similar); or (B) **single app** — frontend + API on Railway/Render/Fly.io. Use of AWS/GCP/Azure only if already in use and cost-predictable. | NFR-4, §15 |
| **TR-27** | Session/store (e.g., Redis) SHALL be external to the API process (managed Redis or DB). Provider health checks and auto-restart SHALL be used to support 99% availability. | NFR-4 |
| **TR-29** | The production web UI SHALL be served from a **defined production URL** (e.g. **chatxiv.gg**). The project SHALL **register the domain** and configure DNS before go-live; ownership and renewal are the project’s responsibility. **Recommended TLD:** **.gg** (gaming community, aligns with tomestone.gg); alternatives: .com if available, .io or .app. Document the chosen URL in the runbook or operations scope. | §4.1, FR-24 |

---

### 3.8 Debugging

| ID | Technical requirement | BRD reference |
|----|------------------------|----------------|
| **TR-28** | The system SHALL support an optional **debug mode** that, when active, exposes **per-message API call details** in the chat UI. **Activation:** Debug mode SHALL be gated by **environment variable** or by a **feature toggle in the persistence store** (e.g. Redis or NoSQL), whichever is easier and more secure to implement; technical design SHALL choose one and SHALL ensure the toggle is **off by default** and not enabled in production unless explicitly required. **UI:** When debug mode is active, each assistant (AI) message SHALL offer a **dropdown control** (e.g. "Debug" or "API calls") that, on click, shows for that message: **which APIs were called** (XIVAPI, MediaWiki, OpenAI, etc.), and for each call the **HTTP request** (method, URL, headers redacted as below, body if applicable) and **HTTP response** (status, headers redacted, body or summary). **Security:** Debug payloads SHALL **NOT** include API keys, tokens, `Authorization` headers, or any credentials (TR-19, TR-19a); redact or omit sensitive headers and query params. The chat API SHALL include the debug payload only when the server-side toggle is enabled; the client SHALL display the dropdown only when the response indicates debug data is present. | NFR-6, §9.1 |

---

## 4. BRD-to-Technical-Requirements Traceability

| BRD section / ID | Summary | Primary TRs |
|------------------|---------|-------------|
| §4.1 Scope (MVP) | Web UI, five query categories, follow-up within topic | TR-1, TR-4, TR-6, TR-22, TR-29 |
| §5 Extensibility | Stable versioned API, REST, API docs, future Dalamud | TR-1, TR-3, TR-3a, TR-24 |
| FR-1, FR-5, FR-7, FR-9, FR-10 | BiS, Unlocks, Raid plans, Settings, Story | TR-4, TR-6, TR-10 |
| FR-11 Follow-up | Refinement within same topic | TR-2, TR-24 |
| FR-12 Source attribution | Cite source, patch, optional link | TR-10, TR-23, TR-24 |
| FR-15–FR-23 | API consumption (XIVAPI, MediaWiki, etc.) | TR-6, TR-7, TR-8, TR-9 |
| FR-24 Usable client | Web UI, first-run, accessibility | TR-22, TR-23, TR-29 |
| FR-25, FR-26 Feedback & observability | Thumbs up/down, usage by topic | TR-16, TR-17, TR-18, TR-24 |
| FR-27 Idempotency, rate limiting | Per user/session, graceful message | TR-20, TR-24 |
| NFR-1 Accuracy, refusal | Sourced only, no hallucination, refuse ToS/scope | TR-4, TR-21, TR-25 |
| NFR-2 Recency | Patch/last updated | TR-6, TR-10, TR-15 |
| NFR-3 Performance | 5 s / 15 s | TR-12, TR-13 |
| NFR-4 Availability | 99% | TR-2, TR-14, TR-26, TR-27 |
| NFR-5 Legal/ToS | Attribution, linking, legal review | TR-10, TR-11 |
| NFR-6 Observability | Usage, feedback, optional debug (API call details) | TR-16, TR-17, TR-18, TR-28 |
| NFR-7 Cost-aware | Cache-first, rate limits, DDoS/cost protection, visible freshness | TR-9, TR-15, TR-20a |
| §9.1 Security, safety | HTTPS, secrets, rate limit, DDoS/cost protection, refusal, report path; OpenAI credential storage; debug mode redaction | TR-19, TR-19a, TR-20, TR-20a, TR-21, TR-28 |

---

## 5. Verified Assumptions (Research and BRD)

The following have been checked against the BRD and, where applicable, public documentation or web search:

| Assumption | Verification |
|------------|--------------|
| **XIVAPI** | Server-side use with **API key** is recommended; rate limiting is IP-based (frontend) or key-based (server). Exact numeric limits are not published; technical design SHALL use a configurable server-side limit and backoff. |
| **MediaWiki** | Standard **MediaWiki API** (action=query, action=parse, search) is available; rate limits vary by wiki and action. **User-Agent** and **robots.txt** compliance are required; conservative limits (e.g., 1 req/s per wiki) and 429/Retry-After handling are appropriate. |
| **No game memory reading** | BRD §4.2 explicitly: Dalamud must not read game memory or packet data; all data from user input or existing APIs. **Clarification:** This remains the rule even when packet data would be more convenient (e.g. current gear). Packet/memory reading is more intrusive (ToS/anti-cheat risk, platform policy) and adds overhead (parsing, version coupling). User-supplied input (paste/link) stays the supported path. |
| **Hosted web UI only at launch** | BRD §4.1: client at launch is hosted web UI only; Discord and in-game for initial release are out of scope. |
| **Anonymous MVP** | BRD §11.1: initial release may operate without user authentication; rate limiting and abuse resistance still apply via session ID (and optionally IP). |

---

## 6. Requires Human Verification or Input

Resolved and open items:

| Item | Status | Decision / action |
|------|--------|-------------------|
| **The Balance** | Open | **Recommendation:** Use **manual curation** for MVP (lowest legal risk, clear attribution, "as of patch" under our control). Optional scraping only after ToS/legal review and with explicit attribution. Assign a single owner for BiS updates and SLA (e.g. within N days of patch). |
| **wtfdig / Tomestone.gg** | Resolved | Linking only is **OK for now**; no API consumption, reference only. |
| **Wiki excerpting vs linking** | Resolved | **Excerpt when possible** (with attribution); linking in addition. |
| **XIVAPI rate limits** | Assumption | No published limit; **assume 50 requests per second** as working cap; configurable throttle and backoff in technical design. |
| **Raid plans curated list** | Resolved | **Priority:** (1) Retrieve from **WTFDIG** when possible; (2) else links to **YouTube** (with timestamp when possible) or **raidplans.io**. |
| **Attribution and copy** | Resolved | **Source UI:** Clickable **"Source"** with down arrow (▼) at bottom of each assistant message (with thumbs up/down). On click: dropdown opens with list of sources; chat scales if necessary; arrow becomes up (▲). Unintrusive. Copy for "Cached; source temporarily unavailable" and "Last updated" per technical design. |
| **Report path** | Open | Product to define placement and process for users to report harmful output or abuse. |

---

## 7. Summary of Supporting Documents

For implementation detail, refer to:

- **TECHNICAL-ARCHITECTURE-SUMMARY.md** — Components, tech stack (React/Vue + Node/Python, hybrid answer generation), data flow, infrastructure options, tradeoffs (LLM vs cache, monolith).
- **Data-and-API-Integration-Scope.md** — Category → source → ingestion → cache table; XIVAPI/MediaWiki endpoints and rate-limit assumptions; fallback and attribution format; gaps.
- **NFR-and-Operations-Scope.md** — Performance budget and exclusions; availability definition; observability data model and retention; security and rate-limit approach; cost levers.
- **Web-Client-UX-Scope.md** — Client architecture, UX checklist, API request/response shape, error states, future-proofing for Dalamud.

---

## 8. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-02-28 | Initial TRD from BRD 2.1; consolidated architecture, data, NFR, and client scoping; added traceability, verified assumptions, and open points. |
| 1.1 | 2025-02-28 | Clarified no game memory/packet reading (even when convenient); The Balance recommendation (manual curation for MVP); resolved wtfdig/tomestone linking, wiki excerpting, raid plans (WTFDIG → YouTube/raidplans.io), Source dropdown UX, XIVAPI 50 req/s assumption; TR-6, TR-7, TR-10, TR-23 and §6 updated. |
| 1.2 | 2025-02-28 | Added §3.1.1 Conversation history: client vs server; cookies too small for full history; localStorage/sessionStorage viable; client-held history reduces server storage but not per-request load; TR-2 allows server or client-held context. NFR, Architecture, Web-Client docs updated. |
| 1.3 | 2025-02-28 | Chosen approach: **RAG** (Option C) with **OpenAI** (token subscription). TR-4 updated to RAG; TR-19a added for OpenAI credential storage (encrypted at rest, server-side only, never logged or sent to client, HTTPS only). §3.1.2 and Architecture §2.3 / data flow updated. |
| 1.4 | 2025-02-28 | TR-3: API SHALL be **RESTful**. TR-3a: **API documentation** (OpenAPI/Swagger or equivalent, free tooling) maintained internally so developers know what is in use/available; spec updated as part of development. |
| 1.5 | 2025-02-28 | §3.1.3 **RAG corpus: source-only vs. reusing queried responses** — preferred approach (corpus = canonical sources only); suggested but not preferred option (queried responses as corpus) and cons (stale snapshots, attribution); patch cadence (Tuesday 3:00 AM CST) for corpus refresh and cache invalidation. |
| 1.6 | 2025-02-28 | §3.1.1 reframed as **Persistence Model design**: NoSQL chosen for OAuth2 user + login, chats linked to user, max 10 chats per user, metrics queryable by user/query without relational need; conversation state (client vs server, cookies vs localStorage) retained as sub-section; recommendation updated to NoSQL or Redis for session store, saved chats in NoSQL when OAuth exists. |
| 1.7 | 2025-02-28 | §3.1.1 **Cache: Redis** — Redis (assuming best lightweight option) used as cache for most frequent queries; supports cache-first, TTL and invalidation per technical design and patch cadence. |
| 1.8 | 2025-02-28 | **Design-choice format:** Major sections with architecture/design choices now use headerized options: **(Preferred)** suffix on preferred option (first), other options below with same header value; **Summary (why not chosen)** for non-preferred options. Applied to §3.1.1 (Persistence store: NoSQL/SQL; Cache: Redis / in-process; Conversation state: server-side / client-side) and §3.1.3 (RAG corpus: canonical source only / reusing queried responses). |
| 1.9 | 2025-02-28 | **TR-20:** Rate limiting SHALL use **leaky bucket** (or equivalent) algorithm to smooth burst traffic and mitigate DDoS/abuse; technical design to define bucket capacity and refill rate. |
| 1.10 | 2025-02-28 | **TR-20a:** Additional DDoS and cost-protection mechanisms — request size limits, timeouts, concurrent limits per user/session or IP, cost circuit breaker (stricter limits or degradation when cost ceiling approached); technical design to define values and runbook. |
| 1.11 | 2025-02-28 | **§3.8 Debugging, TR-28:** Optional debug mode gated by env or Redis/NoSQL feature toggle (off by default). When active, per assistant message a dropdown shows APIs called and HTTP request/response; credentials and sensitive headers redacted. Traceability: NFR-6, §9.1. |

---

*This TRD is the technical-requirements baseline for ChatXIV. All implementation SHALL satisfy these requirements and remain traceable to the BRD. Detailed specifications (endpoints, schemas, TTLs, runbooks) belong in the technical design document(s).*
