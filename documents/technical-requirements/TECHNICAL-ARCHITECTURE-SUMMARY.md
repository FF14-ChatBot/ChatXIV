# ChatXIV — Technical Architecture Summary

**Document version:** 1.2  
**Based on BRD:** 2.1  
**Focus:** System components, tech stack, data flow, infrastructure, tradeoffs

---

## 1. System Components

| Component | Responsibility | BRD reference |
|-----------|----------------|---------------|
| **Web UI (hosted)** | Chat interface, input, loading state ("Thinking"), response bubbles, thumbs up/down, New Chat, empty-state / first-run experience, keyboard/ARIA. Delivered as a hosted app (tomestone.gg / wtfdig style). | §4.1, §7.4 (FR-24), §8 |
| **Backend API (versioned, stable)** | Single contract consumed by web now and by future Dalamud plugin (§5). Handles: chat/conversation, classification, data resolution, rate limiting, idempotency for feedback, observability ingestion. | §5 Extensibility, §7.3, §7.4 (FR-27) |
| **Chat / conversation service** | Accepts user message, runs classification/routing, invokes knowledge layer, formats + cites response, streams or returns answer. Holds **session-only** conversation state for follow-up refinement (FR-11). | §7.2 (FR-11, FR-12), §8.4 |
| **Knowledge / resolution layer** | **Query → category → data source.** Maps intent (BiS, raid plans, story, unlocks, settings for MVP) to canonical handlers; resolves entities (job, fight, expansion, quest) via XIVAPI/search; fetches from cache or external APIs; returns structured data + source metadata for formatting. | §4.1, §7.1, §7.3, §10 |
| **External API clients** | **XIVAPI** (game data, search, Lodestone, servers), **MediaWiki** (wikis: unlocks, settings, story progression), and optionally Garland Tools, Universalis, FFLogs post-MVP. All server-side; rate-limited and cache-first per NFR-7. | §7.3 (FR-15–FR-23), §9.1 |

**Rationale:** Clear separation lets the web UI stay a thin client, the API stay the single integration point for future Dalamud (§5), and the knowledge layer stay source-agnostic for cache/fallback and multiple backends (XIVAPI, wikis, curated).

---

## 2. Tech Stack Recommendations

Design choices use a **recommended** option first and **other options** below; non-recommended options include **Summary (why not chosen)** where applicable.

### 2.1 Web Frontend

#### Framework: React (Recommended)

- **React** — Large ecosystem, straightforward state for chat history and loading, good a11y libraries (ARIA, keyboard nav per FR-24). Aligns with a JS/TS stack if backend is Node.
- Fast iteration, easy hosting on Vercel/Netlify; single backend for web + future Dalamud keeps scope manageable (§4.1, §5).

#### Framework: Vue

- **Vue** — Viable alternative with similar benefits (ecosystem, state, a11y). Use if team preference or existing Vue experience.

**Summary (why not chosen as default):** React is recommended by default for broader ecosystem and common pairing with Node backend; Vue is an equal choice if the team prefers it.

#### Delivery: Static/SPA (Recommended)

- **Static/SPA for MVP.** The app is client-heavy (chat UI, streaming or single-shot responses); no need for per-request HTML. Deploy as static assets to CDN for low latency and cost.

#### Delivery: SSR or hybrid

**Summary (why not chosen):** Only if SEO or first-paint becomes a requirement (e.g. public landing/marketing page). Not needed for MVP chat app; adds server and complexity.

### 2.2 Backend

#### Runtime: Node.js with TypeScript (Recommended)

- **Node.js (TypeScript)** — Aligns with JS/TS frontend and streaming; single language across client and server. **Fastify** for low overhead, clear routing, middleware for versioning, rate limiting, and auth.
- **Stateless:** No in-memory session store; session/conversation state in **external store** (e.g., Redis or DB) keyed by session ID so any replica can serve the request. Supports 99% availability (NFR-4) and horizontal scaling.
- Rationale: Stateless + external session store meets NFR-4; single runtime keeps ops simple for MVP (§15 cost, §9.1).

#### Runtime: Python with FastAPI

- **Python (FastAPI)** — Low overhead, clear routing, middleware for versioning and auth. Suits data/ML if you add heavier RAG or embeddings later.

**Summary (why not chosen as default):** Node is recommended by default for alignment with frontend and streaming; choose Python if team strength or future ML workload favors it.

#### Stateless design (Required)

- No in-memory session store; external store (Redis or DB) keyed by session ID. Required for NFR-4 and horizontal scaling; see TRD §3.1.1.

### 2.3 Chat / Answer Generation

#### Approach: RAG with OpenAI (Recommended)

- **RAG (retrieval-augmented generation)** — Semantic search over the knowledge corpus (wiki, curated content) → retrieve relevant chunks → format and cite using an LLM. **LLM provider:** OpenAI (token subscription).
- **Flow:** User message → (optional) intent/category classification → **retrieve** relevant passages from the corpus (embeddings + vector search or keyword + semantic) → pass retrieved content + query to **OpenAI** to produce a natural-language answer with **citations**; facts come only from retrieved data, LLM rephrases and structures.
- **Constraints (NFR-1):** The LLM SHALL NOT generate facts (gear, steps, patch) from its weights; all facts from **retrieved data**; if nothing relevant is retrieved, return "I couldn't find a sourced answer" and never invent content.
- **Meeting NFR-3 (first token 5s, full 15s):** Cache embeddings and retrieval results where possible; stream LLM output so first token is fast; timeouts and parallel work where applicable.
- **OpenAI credential storage (TR-19a):** The API key (or token) used for the OpenAI subscription SHALL be stored **encrypted at rest** (e.g. secrets manager, encrypted env/config), **server-side only** (never sent to the client or in frontend bundles), and **never logged** (do not log the `Authorization` header or API key). All calls to OpenAI SHALL use **HTTPS** so the key is encrypted in transit.

**Rationale:** RAG gives semantic, conversational answers while keeping facts grounded in the corpus; OpenAI token subscription aligns with usage-based cost; secure credential storage prevents key exposure.

#### Approach: Template-only or pure LLM

**Summary (why not chosen):** Template-only lacks semantic flexibility and does not support open-ended questions. Pure LLM (no retrieval) risks hallucination and cannot guarantee grounded citations (NFR-1); TRD requires facts only from retrieved data.

### 2.4 API Style and Versioning

**REST:** The ChatXIV backend API SHALL be **RESTful** (TR-3): resource-oriented URLs, standard HTTP methods (GET, POST, etc.), JSON request/response where applicable, standard HTTP status codes.

#### Versioning: URL path (Recommended)

- **Path-based:** `/v1/...` (e.g. `/v1/chat`, `/v1/feedback`, `/v1/health`). Simple for all clients (web, future Dalamud), easy to route and document.
- **Deprecation:** Announce deprecated version and sunset date (e.g., 6–12 months); support at least N and N-1. Return `Deprecation` / `Sunset` headers and document in API spec.
- Rationale: Path versioning is widely understood and stable for a long-lived API consumed by multiple clients (§5, §7.3).

#### Versioning: Header or query parameter

**Summary (why not chosen):** Harder for all clients to use consistently; path is simpler to document and to route. Header/query versioning can be ambiguous for caching and tooling; path is explicit.

**API documentation (TR-3a):** Maintain **OpenAPI 3.x** (or Swagger) spec that describes all endpoints, request/response schemas, and versioning. Use **free** tooling (e.g. Swagger UI, Redoc) to serve or render the spec internally. Update the spec as part of the development process (e.g. spec in repo or generated from code).

---

## 3. Data Flow

![Data flow diagram](data-flow-diagram.png)

**End-to-end (RAG):** User message → **classification/routing** (optional) → **retrieve** from knowledge corpus (semantic/vector or keyword search) → **format + cite** via OpenAI (facts from retrieved data only) → response.

1. **Ingress:** Web UI sends user message (and session ID) to backend.
2. **Classification/routing:** Map message to category (BiS, raid plans, story, unlocks, settings); optionally extract entities. Route to RAG pipeline.
3. **Retrieve:** Query the knowledge base (embeddings + vector store, or keyword search over wiki/curated content); fetch relevant chunks; resolve entities via XIVAPI/MediaWiki where needed; cache aggressively.
4. **Format + cite (OpenAI):** Pass retrieved chunks + user query to OpenAI; LLM produces natural-language answer with citations; facts only from retrieved content (no hallucination). Stream response when supported.
5. **Response:** Return (or stream) answer to client; store message pair in session for follow-up. **OpenAI API key** held server-side, encrypted at rest, never logged or sent to client (TR-19a).

**Where FR-11 (follow-up refinement) lives:** In **conversation state** — either **server-side** (session store e.g. Redis/DB keyed by session ID) or **client-side** (client sends last N turns in each request; no server persistence of conversation content). **Cookies** cannot hold full chat history (~4–8 KB limit); use **localStorage/sessionStorage** if storing on client. Client-held history reduces server storage but not per-request processing; see TRD §3.1.1. No long-term memory or "my character" for MVP — that’s post-MVP (FR-13).

**Rationale:** Single pipeline keeps behavior predictable; session-scoped context satisfies FR-11 without persistence beyond the session (§4.1, §8.4, §8.6).

---

## 4. Infrastructure (Practical)

Design choice: hosting and region. **Recommended** option first; other options below with **Summary (why not chosen)**.

- **Region:** **Single region** for MVP. Choose one close to most users (e.g., US or EU). Multi-region adds cost and complexity; 99% (NFR-4) is achievable with one region + good uptime SLA from the provider.
- **Availability and cost:** Stateless API + managed Redis (e.g., Upstash, Railway Redis) for session/store; use provider health checks and auto-restart. 99% is realistic with a single region and a solid PaaS. Keep a **monthly cost ceiling** and runbook per §16; avoid microservices and extra regions for MVP.

### Hosting options

#### Hosting: Single app on Railway/Render/Fly.io (Recommended)

- **Option B — Single app:** **Railway, Render, or Fly.io** host both static frontend (served by app or CDN) and API. Pros: one deployment, one bill, simpler ops, maximum cost predictability and minimal moving parts. Cons: frontend not on a global CDN unless you add one.

**Rationale:** Matches NFR-4 and NFR-7 (cost predictability, §15–§16); avoids over-engineering (§4.1 Definition of done).

#### Hosting: Split (frontend Vercel/Netlify, API Railway/Render/Fly.io)

- **Option A — Split:** **Vercel or Netlify** for the web app (static/SPA), **Railway, Render, or Fly.io** for the API + conversation + knowledge layer. Pros: great DX, automatic HTTPS, CDN for frontend. Cons: two deployments and two bills.

**Summary (why not chosen as default):** Use if best frontend performance and global CDN matter more than single deployment and single bill; prefer when comfortable with two platforms.

#### Hosting: Cloud (AWS/GCP/Azure)

- **Option C — Cloud:** Full use of AWS, GCP, or Azure for compute, CDN, and store.

**Summary (why not chosen):** Heavier for MVP and less cost-predictable at low scale. Only if you already have accounts and ops; otherwise prefer PaaS (Option A or B) for cost predictability and simplicity.

---

## 5. Tradeoffs

For each tradeoff, the **Recommendation** is the preferred stance; **Alternative (why not chosen)** summarizes why the other side of the tradeoff is not taken for MVP.

| Tradeoff | Recommendation (preferred) | Alternative (why not chosen) | Rationale |
|----------|-----------------------------|------------------------------|-----------|
| **LLM cost vs accuracy vs latency** | Minimize LLM use for facts; use for classification and/or safe formatting only. Cache and parallelize to hit 5s/15s. | Heavy LLM use for all content: higher cost and latency; risk of hallucination if used for facts. | NFR-1 (no hallucination), NFR-3 (5s/15s), NFR-7 (cost). |
| **Cache-first vs freshness** | Cache-first with explicit "last updated" / patch in UI. Invalidate on patch day or TTL (e.g., 24h for game data, longer for static guides). | Always live/fresh: higher load, cost, and latency; not required for MVP. | §7.3, NFR-2 (recency), NFR-7; BRD fallback when source unavailable. |
| **Monolith vs microservices for MVP** | **Single backend service (modular monolith):** one API process (chat, classification, knowledge layer, API clients). Separate only if a clear bottleneck appears later. | Microservices now: extra ops, networking, and cost; no proven bottleneck for MVP. | §4.1, §15; 99% and cost predictability are easier with one deploy and one scaling unit. |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-02-28 | Initial architecture summary; components, tech stack, data flow, infrastructure, tradeoffs. |
| 1.1 | 2025-02-28 | Baseline before recommended-vs-other format. |
| 1.2 | 2025-02-28 | **Recommended vs other options format:** §2–§4 and §5 restructured so each design choice has a **recommended** option first (header suffix "(Recommended)") and **other options** below with **Summary (why not chosen)**. Applied to Web Frontend (React/Vue, Static/SPA vs SSR), Backend (Node vs Python), Chat (RAG vs template-only/pure LLM), API versioning (path vs header/query), Infrastructure hosting (single app vs split vs cloud), and Tradeoffs table (added "Alternative (why not chosen)" column). |

---

## BRD Reference Quick Links

- **§4.1** — MVP scope (BiS, raid plans, story, unlocks, settings); web UI; follow-up within same topic.
- **§5** — Extensibility; stable versioned API for web + Dalamud.
- **§7.1–7.2** — Query categories (FR-1, FR-7, FR-10, FR-5, FR-9); FR-11 follow-up refinement; FR-12 source attribution.
- **§7.3** — API consumption (XIVAPI, MediaWiki, etc.); fallback; cache; cost predictability.
- **§7.4–7.5** — Web UI (FR-24), idempotency/rate limiting (FR-27), observability (FR-25, FR-26).
- **§9** — NFR-1 (accuracy, sourced, no hallucination), NFR-2 (recency), NFR-3 (5s/15s), NFR-4 (99%), NFR-5 (legal/ToS), NFR-6 (observability), NFR-7 (cost-aware).
- **§9.1** — Security, safety, rate limits, server-side secrets.
- **§15–§16** — Cost, sustainability, cost ceiling.

---

*This summary is a scoping document for technical design. Detailed specs (endpoints, schemas, cache TTLs, runbooks) belong in separate technical specifications.*
