# ChatXIV — Web Client & UX Implementation Scope

**Source:** BRD §7.4 (Client Interface and UX), §8 (User Experience — Detailed Specification), §5 (Extensibility), §9 (NFRs), §11 (Assumptions).  
**Purpose:** Technical scoping for hosted web UI, chat interface, API contract, error states, and future-proofing.

---

## (a) Client Architecture and API Usage

### Delivery and Hosting

- **Client at launch:** Hosted **web UI only** (similar to tomestone.gg, wtfdig.info) — §4.1, §7.4 FR-24.
- **First-run / empty state:** Example queries or suggested topics (e.g. *"Try: What is BiS for Aloalo Savage?"*) so users immediately see what ChatXIV can do — FR-24.
- **Placeholder:** Input field shows *"Please ask me anything related to FFXIV."* — §8.1.
- **Theme:** The chatbot SHALL support **light mode** and **dark mode**, with **dark mode** as the default. User preference MAY be persisted (e.g. localStorage) so the choice is retained across sessions.

### Tech Choices (to be decided in technical design)

| Area | Options | BRD / notes |
|------|--------|-------------|
| **Rendering** | SPA vs SSR | Not specified; choose based on SEO, first-load, and complexity. Hosted “app-like” chat suggests SPA is viable. |
| **Real-time** | WebSocket vs HTTP polling vs single request | Not specified. Performance target: first useful token within 5s, full answer within 15s (NFR-3). Streaming vs full-body affects choice. |
| **Accessibility** | Keyboard navigation, ARIA, screen readers | **Required:** FR-24 — "keyboard navigation and screen-reader-friendly structure (e.g., ARIA labels for messages and actions)." |

### API Usage (high level)

- Consume a **stable, versioned API** used by web now and Dalamud later — §5.
- **Session / conversation ID** used for follow-up context (FR-11); client sends it with each message. **Optional:** Conversation history may be stored **client-side** (localStorage/sessionStorage) so the chat restores on refresh; cookies are too small (~4–8 KB) for full history. If client holds history, client sends last N turns in each request; see TRD §3.1.1.
- **Feedback** submitted to a dedicated endpoint with **idempotency** (FR-27).
- All clients (web, future Dalamud) use the same contract; no game memory reading — §4.2, §5.

---

## (b) UX Implementation Checklist

| # | Item | Spec reference | Implementation notes |
|---|------|----------------|----------------------|
| 1 | **Loading** | §8.2 | Small text *"Thinking"*; pulsate left-to-right (or equivalent subtle animation) while request is in progress. |
| 2 | **Response** | §8.2 | Assistant message bubble (or equivalent block). Answer: **succinct, non-verbose**. |
| 2b | **Source (attribution)** | FR-12 | At bottom of each assistant message: clickable **"Source"** with down arrow (▼), unintrusive. On click: dropdown opens with **list of sources** (name, patch/last-updated, optional link); chat area MAY scale to accommodate; arrow toggles to up (▲). Same row/area as thumbs up/down. |
| 3 | **Per-message feedback** | §8.3, FR-25 | Thumbs up / thumbs down at **bottom of each assistant message** (alongside Source). Small, subdued, non-intrusive. **Thumbs down:** dropdown with **2–4 options** (e.g. "Wrong answer," "Outdated," "Missing info," "Other") + optional free text. Submit → **confirmation without blocking** the conversation. |
| 4 | **New Chat** | §8.5 | Button/menu item **"New Chat"**. On action: end current session, start fresh. **Show unsaved warning** (chats not saved this release) — same message as exit. |
| 5 | **Exit / leave warning** | §8.6 | On **navigate away, close tab/window, or New Chat**: popup (or equivalent): *"Chats are currently not saved for this release. Make sure to manually save anything before exiting."* Initial release only. |
| 6 | **Theme (light / dark)** | — | Support **light mode** and **dark mode**. **Default:** dark mode. Provide a control (e.g. toggle or menu) to switch; preference MAY be stored client-side (e.g. localStorage) for the next visit. |

---

## (c) API Request/Response Shape (High Level)

### Chat (submit message, get response)

**Client sends (conceptual):**

- **Message** (user text).
- **Session / conversation ID** for follow-up context (FR-11).
- **Language** (optional): e.g. EN/DE/FR/JP where supported (FR-19) — technical design to define.

**Client receives:**

- **Streaming vs full body:** To be defined in technical design; affects first-token and full-answer timing (NFR-3).
- **Source citations** and patch/last-updated in or alongside the answer (FR-12).
- **Message ID** for the assistant turn, for feedback submission (FR-25).

**API style:** REST (TR-3); JSON request/response. **Documentation:** OpenAPI/Swagger (or equivalent) maintained internally so developers know what is in use/available (TR-3a). **Versioning:** API path (e.g. `/v1/chat`) so web and future Dalamud share a stable contract — §5.

### Feedback

- **Endpoint:** Dedicated feedback API (e.g. `POST /v1/feedback` or similar).
- **Idempotency:** Required (FR-27); e.g. `Idempotency-Key` header or client-generated feedback ID to avoid double-counting.
- **Payload (conceptual):** Message ID (or conversation + turn), thumbs up/down, and if thumbs down: selected reason code(s) + optional free text.

---

## (d) Error and Edge States

| State | BRD reference | UI behavior |
|-------|----------------|-------------|
| **Off-topic / non-FFXIV** | §8.1, §9.1 (scope) | Gentle redirect or clarification that the bot is focused on FFXIV. No substantive off-scope answer. |
| **No sourced answer** | NFR-1 | Show clear, friendly message: *"I couldn't find a sourced answer for that"*; optionally suggest rephrasing or link to wiki/search. |
| **Rate limit** | FR-27, §9.1 | **Graceful message**, e.g. *"You've reached the limit for now; please try again later"* — not a generic error. |
| **Source temporarily unavailable** | §7.3 (fallback) | Use cache if within defined age; otherwise show clear "source temporarily unavailable" and suggest retry. |
| **Explicit / ToS-violating input** | NFR-1, §9.1 | Refuse with brief, non-judgmental message (e.g. "I can't help with that") or redirect; no substantive response. |

All of the above should be surfaced in the **same chat UI** (e.g. assistant-style bubble or inline notice) so the user sees a consistent conversation flow.

---

## (e) UI Design and Mockup Tools

For designing or mocking the UI from a **business perspective** (no code required), the following options work well with **React** and produce output that an **agent or developer can read** to implement or align the UI faster.

| Approach | Tool(s) | Best for | Agent-readable output |
|----------|--------|----------|------------------------|
| **Structured written spec** | Markdown, Notion, or any doc | Fast alignment; no design tool to learn | ✅ Yes — sections, component names, copy, layout in one place |
| **Visual mockups** | Figma | Pixel-level mockups for stakeholders | Export: Dev Mode / plugins (Anima, Locofy) → code or specs; or export screens as images + short Markdown spec |
| **Visual React builders** | Plasmic, Builder.io, Lovable | No-code UI that outputs real React | ✅ Yes — export/copy React code; agent refines or integrates |

### Recommended workflows

1. **Maximum alignment with an agent, zero learning curve**  
   Use **Markdown (or Notion) specs**: one doc per screen or feature. Describe layout, components, copy, and behavior in plain language. Reference the doc when asking an agent to build or change the UI. Example format:

   ```markdown
   ## Home page
   - **Header:** Logo left, nav right: "Home", "About", "Contact"
   - **Hero:** Headline "Welcome to ChatXIV", subtext, primary CTA "Get started"
   - **Features:** 3 columns, each: icon, title, short description
   - **Footer:** Copyright, links
   ```

2. **Visual mockups + implementation alignment**  
   Use **Figma** for screens and components. Then either: (a) use Dev Mode or a plugin to export to code, or (b) export screens as images (e.g. in `documents/` or `docs/ui/`) and add a **short Markdown spec** (as above) so the agent has both visuals and structure to implement in React.

3. **No-code UI that is already React**  
   Use **Plasmic** or **Builder.io**: design in the tool, export or copy the generated React. Commit or paste that code into the repo; an agent can then integrate, refactor, or extend it.

Keeping UI intent in **version-controlled Markdown** (or exported from Figma/visual tools) ensures designs stay in sync with the codebase and speeds up agent-driven implementation.

---

## Future-Proofing

| Aspect | BRD reference | Implication |
|--------|----------------|-------------|
| **Same API for Dalamud** | §5 | One versioned chat + feedback API; web and plugin are two clients. No game-specific endpoints required for MVP. |
| **No game memory reading** | §4.2 | Dalamud must not read game memory or packet data; data comes from user input or existing APIs. |
| **Usage transparency (optional MVP)** | §11.1 | Consider non-intrusive "X queries today" (or similar) for trust and future tiering; optional for MVP. |

---

## BRD Section Quick Reference

- **§4.1** — In scope: hosted web UI, Phase 1 query categories.
- **§4.2** — Out of scope: Discord, in-game for initial release; no game memory reading.
- **§5** — Extensibility: stable versioned API, Dalamud plugin later, same backend.
- **§7.4** — FR-24 (usable client, first-run, accessibility), FR-27 (idempotency, rate limiting).
- **§7.5** — FR-25 (feedback), FR-26 (observability).
- **§8** — UX: entry/input (§8.1), loading & response (§8.2), feedback (§8.3), New Chat (§8.5), exit warning (§8.6).
- **§9** — NFR-1 (accuracy, refusal, no sourced answer), NFR-3 (performance), NFR-4 (availability).
- **§9.1** — Security, safety, rate-limit messaging, data use, optional usage transparency.
- **§11.1** — Usage transparency optional for MVP; anonymous use possible.

---

*This scope document is derived from the BRD. Technical design will define exact API schemas, streaming vs non-streaming, and implementation details.*
