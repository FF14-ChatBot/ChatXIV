# Business Requirements Document (BRD)
# ChatXIV — FFXIV Data Chatbot

**Document version:** 2.1
**Last updated:** February 28, 2025  
**Product name:** ChatXIV

---

## 1. Executive Summary

ChatXIV is a chat-first assistant that provides extensive, accurate data to *Final Fantasy XIV* (FFXIV) players. It reduces the manual labor of researching and retrieving information outside the game (e.g., via search engines) by answering common questions in-conversation—from Best-in-Slot (BiS) gear and relic progress to rotations, unlocks, patch history, and raid plans.

**Value proposition:** A single chat interface that answers FFXIV questions with sourced, up-to-date information so players spend less time tabbing out and more time playing.

---

## 2. Business Objectives

| Objective | Description |
|-----------|-------------|
| **Reduce research friction** | Minimize time players spend searching multiple sites (wikis, The Balance, raid content guides, etc.) for answers. |
| **Improve accuracy & recency** | Surface data that is attributed to sources and, where possible, tied to patch/date so players can trust and verify. |
| **Support common workflows** | Cover the most frequent "jobs to be done": gearing, progression tracking, rotations, unlocks, patch history, and raid strategy discovery. |
| **Enable follow-up and refinement** | Allow natural follow-up questions (e.g., "What's your desired spell speed?" or "Do you want max damage?") so answers can be refined without starting over. |

**Primary outcome for MVP:** A defined percentage of supported query types (Phase 1: BiS, raid plans, story progression, unlocks, settings) return a sourced, relevant answer within the performance target (NFR-3); adoption and satisfaction targets are set in §13.

---

## 3. Problem Statement

Players perform significant manual labor outside the game to research and retrieve data. This BRD prioritizes relieving that burden through a single, conversational entry point.

**Problem statement:** Players must today:

- Switch between game and browser.
- Visit multiple sites (wikis, spreadsheets, raid plan repositories).
- Re-enter context (job, level, patch, fight) repeatedly.
- Manually compare their gear to BiS or relic steps (some people make spreadsheets)

ChatXIV aims to centralize these tasks in a chatbot that returns structured, sourced answers and can remember context (e.g., job, level, relic step) within a conversation.

---

## 4. Scope

### 4.1 In Scope (MVP and Post-MVP)

**Client at launch:** A hosted **web UI** only (similar to tomestone.gg or wtfdig.info), with a workable chat interface through which users can submit queries and receive answers. In-game access via a Dalamud plugin is planned as an extension after initial release (see §5 Extensibility). Discord and other chat-platform clients are not in scope for initial release (see §4.2).

**MVP (Phase 1) — priority query categories:** The first release shall support the following five query categories. All other categories below are Phase 2 (post-MVP) unless otherwise noted.

| Phase | Category | Description |
|-------|----------|-------------|
| **1 (MVP)** | BiS and gearing | "What is the BiS for [fight] (e.g., Aloalo Savage) in [expansion]?" with source and patch. |
| **1 (MVP)** | Raid plans | "What are the available raid plans for [fight]?" — list of known raid content guides with links or summaries. |
| **1 (MVP)** | Story progression (MSQ) | "Where is this NPC to complete this quest?" Spoiler-safe location/direction only; no major plot reveals. |
| **1 (MVP)** | Unlocks | "How do I unlock [content]?" (e.g., UCOB) — step-by-step unlock requirements and where to go. |
| **1 (MVP)** | Settings | "Where do I go to change my camera height?" — instructions on how to locate a setting within the game. |
| 2 | Relic progression | "What step of the relic am I on?" — full step list and progress (user provides or selects current step). |
| 2 | Raid gear recommendations | "With my current gear, what raid gear should I greed on?" MVP requires user to supply gear each time (paste/link/export); stored "my character" profile is post-MVP. |
| 2 | Rotations | "What is my rotation for level [X]?" (job + level → rotation/opener; patch-aware where relevant). |
| 2 | Patch history | "When was this skill buffed and as of which patch?" (skill + job → patch notes / timeline). |
| 2 | Crafting | "What is the best macro for this crafting item?" "What level is this craft?" "Where do I unlock this craft?" |

**Observability and feedback** are in scope for MVP: usage observability (traffic by generalized asks/topics, visit frequency and timing, session duration) and a user feedback mechanism (thumbs up / thumbs down) to support product improvement and satisfaction measurement.

**Follow-up and context:** MVP supports refinement of the *last* answer within the same topic (e.g., "spell speed vs max damage" on a greed list). Cross-turn context memory (remembering job, level, expansion, relic step so the user need not re-specify) is post-MVP.

**Raid gear input (MVP):** For "what to greed?" in Phase 2, supported input formats (e.g., Etro link, Teamcraft link or export, Lodestone URL, paste) and whether "link" means URL only or in-game export strings will be defined in technical design. MVP raid gear recommendations require the user to supply current gear (paste/link/export) each time; a stored character profile is post-MVP.

**Definition of ready for a query category:** For each category, "in scope" means: data source(s) identified, attribution agreed, and at least one example query and expected answer defined. Technical design will specify primary source(s), cache strategy, and invalidation trigger (e.g., patch day, manual refresh, TTL) per category.

Additional capabilities to consider post-MVP:

- **"My character" profile:** Store job(s), level(s), gear set (e.g., from Etro/Teamcraft export) for personalized "what to greed?" and "my rotation."
- **Context memory:** Remember job, level, expansion, or current relic step across turns so follow-ups don't require re-specifying.
- **Localization:** Same flows for EN/DE/FR/JP where data exists.

### 4.2 Out of Scope (For This BRD)

- **Discord (or other chat-platform clients)** for the initial release; ChatXIV launches as a hosted web UI only.
- In-game integration (overlays, add-ons) for the **initial release**; ChatXIV launches as an external chatbot. A Dalamud plugin for in-game access is planned as a post–initial-release extension (see §5 Extensibility). **Dalamud integration may display the chatbot in-game but must not read game memory or packet data;** all data is obtained via user input or existing APIs.
- Real-time game state reading (e.g., reading memory or network traffic).
- Transactional features (e.g., marketplace, subscriptions) unless later specified in a separate BRD.
- **Adding advertisements for revenue**, with possibility of hosting (e.g., third-party ad serving), unless later specified in a separate BRD.

---

## 5. Extensibility

ChatXIV is designed so that additional client interfaces and integrations can be added after the initial release. A primary extension path is integration with the FFXIV mod ecosystem.

**Backend / API contract:** The system shall expose a **stable, versioned API (or chat protocol)** that all clients (web UI and, later, Dalamud) consume. API contract and versioning strategy will be defined in technical design.

**Dalamud plugin (post–initial release):** Once the initial release (hosted web UI, core query capabilities) is complete and stable, ChatXIV is intended to be paired with a **Dalamud** plugin. This would allow players to access the same chatbot **in-game** (e.g., via overlay or in-game window), reducing context-switching and supporting the business objective of keeping players in the game while getting answers. The plugin would consume the same backend or API as the web client; requirements for that API and any plugin-specific behavior will be defined in a separate technical or product specification. In-game integration remains out of scope for the initial release (see §4.2).

**Picture / image support (post–initial release):** As an extension, ChatXIV may support returning **images** (e.g., raid plan diagrams, strategy screenshots, position maps) directly in the chat response so users can view plans and visuals without leaving to open the source sites. Implementation would respect attribution and legal/ToS constraints (see §9 NFR-5)—e.g., linking to or embedding images with clear source credit—and would be defined in a separate technical or product specification.

**Advertising (post–initial release):** Adding **advertisements for revenue**, with possibility of hosting (e.g., third-party ad serving), is out of scope for this BRD (see §4.2) but may be considered as a future extension in a separate BRD or product specification. Any ad strategy would address user experience, privacy, and attribution.

---

## 6. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| FFXIV players (end users) | Primary users | Fast, accurate answers; less tabbing out; trusted sources. |
| Product / development team | Build and operate ChatXIV | Clear requirements, feasible data pipelines, sustainable updates, and observability (usage and feedback) to guide priorities. |
| Community data owners (e.g., The Balance, raid content guide authors, wiki maintainers) | Data sources | Proper attribution, respectful use, no copyright violation. |

---

## 7. Functional Requirements

### 7.1 Query Categories and Required Behavior

Phase 1 (MVP) categories: BiS (FR-1), Raid plans (FR-7), Story progression (FR-10), Unlocks (FR-5), Settings (FR-9). All others are Phase 2 (see §4.1).

| ID | Category | Example query | Required behavior |
|----|----------|---------------|-------------------|
| FR-1 | BiS | "What is the BiS for Aloalo Savage in Endwalker?" | Return BiS list for the given fight/expansion; support job/role; cite source and patch. |
| FR-2 | Relic progression | "What step of the relic am I on? How many more steps? Is there a list?" | Accept current step (user-stated or selected); return full step list, progress (e.g., X of Y), and next steps. |
| FR-3 | Raid gear to greed | "With my current gear, what raid gear should I greed on?" | Ingest current gear (paste/link/export); compare to BiS; return greed list; support follow-ups (e.g., spell speed vs max damage). |
| FR-4 | Rotations | "What is my rotation for level 70?" | Given job + level, return appropriate rotation/opener; indicate patch or "current" where relevant. |
| FR-5 | Unlocks | "How do I unlock UCOB?" | Return step-by-step unlock requirements and where to go; link to official or wiki where appropriate. |
| FR-6 | Patch history | "When was this skill buffed and as of which patch?" | Given skill (and optionally job), return patch timeline and summary of change. |
| FR-7 | Raid plans | "What are the available raid plans for [fight]?" | Return list of known raid content guides with links and optional short descriptions. |
| FR-8 | Crafting | "What is the best macro for this crafting item?" "What level is this craft?" "Where do I unlock this craft?" | Return crafting macros, level, or unlock steps as applicable; cite source. |
| FR-9 | Settings | "Where do I go to change my camera height?" | Return instructions on how to locate the setting within the game; cite wiki or official guide where appropriate. |
| FR-10 | Story progression | "Where is this NPC to complete this quest?" | Return quest/NPC location or next-step guidance; answer in a spoiler-safe way (location and direction only, without revealing important plot points). |

### 7.2 Conversation and Context

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-11 | Follow-up refinement | Support follow-up questions (e.g., "What's your desired spell speed?" or "Do you want max damage?") and refine previous answer (e.g., greed list) without full re-specification. |
| FR-12 | Source attribution | All data-backed answers must cite source (e.g., The Balance, raid content guides, patch notes, wiki) and, where applicable, patch or last-updated date. Sources shall be visible in-line (e.g., "Source: The Balance, patch 6.5") with optional link; long lists shall support expand/collapse or "See full source" so the answer remains scannable. |
| FR-13 | Optional context memory | (Post-MVP) Remember within-session context (job, level, expansion, relic step, "my character") to personalize and shorten follow-up queries. |
| FR-14 | Spoiler-safe story answers | For story progression and quest-location queries, present only location, NPC name, and directional guidance; avoid revealing major plot points, twists, or story outcomes (e.g., character fate, expansion ending, or specific story twists). |

### 7.3 API Consumption for Knowledge Base

ChatXIV shall consume the following external APIs as a client to populate and support the knowledge base. These requirements ensure the system uses authoritative, structured data where available instead of relying solely on scraped or manually curated content.

| ID | Requirement | Description | Primary API(s) |
|----|-------------|-------------|----------------|
| FR-15 | Game data (items, actions, jobs) | Ingest or resolve item names, job/class data, actions, and skill IDs for BiS, rotations, and gear comparisons. | XIVAPI (game data endpoints) |
| FR-16 | Search and lookup | Resolve user queries (e.g., item names, job names, quest/achievement names) to canonical IDs and metadata. | XIVAPI (search, content endpoints) |
| FR-17 | Character and profile data | (Optional) Resolve character name + server to Lodestone ID; retrieve class/job levels, gear, or achievements for “my character” and greed recommendations. | XIVAPI (Lodestone/character endpoints) |
| FR-18 | Market and pricing data | (Optional / post-MVP) Provide current market board listings, prices, or sale history when users ask about item cost or availability. | Universalis |
| FR-19 | Localization | Request game data and search results in the user’s language (EN, JA, DE, FR) where supported by the API. | XIVAPI (language parameter) |
| FR-20 | Servers and data centers | Resolve server and data center names for character lookups and market queries. | XIVAPI (servers/dc endpoints), Universalis |
| FR-21 | Wiki knowledge (unlocks, guides, settings, story progression) | (Optional) Retrieve wiki page content—e.g. unlock steps, quest guides, item/ability descriptions—via the wikis’ public API for answering “how do I unlock X?” and similar knowledge queries. | MediaWiki API (see wiki table below) |
| FR-22 | Raid logs and encounter data | (Optional / post-MVP) Resolve zones, encounters, rankings, or parse data for "top parses for [fight]" or encounter metadata; support linking to FFLogs reports. | FFLogs (v2 GraphQL API) |
| FR-23 | Crafting lists and gear export | (Optional) Ingest or resolve crafting lists and gear set data (e.g., from user-provided Teamcraft link or export) for "what to greed?" and crafting-list answers. | Teamcraft (see reference table below) |

**Reference — available FFXIV-related APIs:**

| API | Purpose | Access | Notes |
|-----|---------|--------|--------|
| **XIVAPI** (xivapi.com) | Game data (items, actions, jobs, quests, achievements, recipes, content), search, Lodestone character/FC data, server/datacenter lists | REST; free with optional API key for higher limits | Community-driven; data from game files; multi-language (en, ja, de, fr). Primary source for structured game data. |
| **Universalis** (universalis.app) | Market board: listings, prices, sale history by world/datacenter | REST; free, no auth required | Crowdsourced; supports HTTPS and CORS. Use for “how much does X cost?” or market-aware answers. |
| **Garland Tools** (garlandtools.org) | Crafting, equipment, gathering nodes, instances, quests, FATEs | Unofficial API / database | Alternative or supplement for crafting lists, gathering, and equipment data. |
| **Teamcraft** (teamcraft.io) | Crafting lists, list sharing, gear set export | REST; public API where documented | Use for crafting lists and gear-set ingestion when user provides Teamcraft link or export; supports "what to greed?" and list-based workflows. |
| **Lodestone** (official site) | Character profiles, FC, achievements (via scraping or proxy) | Via XIVAPI Lodestone endpoints or community parsers (e.g. NetStone, xivlodestone) | Official source; XIVAPI proxies/parses Lodestone for character search and profile. |
| **FFXIV wikis (in-game knowledge)** | Guides, unlock steps, quest/item/ability descriptions, patch notes summaries | **MediaWiki API** (standard, not FFXIV-specific) at each wiki’s `api.php` | No dedicated “wiki API”; major FFXIV wikis run on MediaWiki (or Fandom’s fork) and expose the standard [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) for page content, search, and parse. See table below. |
| **FFLogs** (fflogs.com) | Raid logs, rankings, parses, zones, encounters, character/guild parse data | **GraphQL v2 API**; OAuth 2.0 (client credentials for public data). Docs: fflogs.com/api/docs, v2-api-docs | Zones, encounters, brackets/partitions; characterData, reportData, worldData, gameData. Use for “top parses,” encounter lists, or linking to logs. |

**FFXIV wikis exposing MediaWiki (or Fandom) API for knowledge-style content:**

| Wiki | URL | API endpoint | Notes |
|------|-----|--------------|--------|
| **FFXIV Wiki (ConsoleGamesWiki)** | ffxiv.consolegameswiki.com | `/mediawiki/api.php` (or site’s Action API) | Large community wiki; quests, jobs, unlocks, guides. Standard MediaWiki `action=query`, `action=parse`, search. |
| **FFXIV Wiki (Fandom)** | ffxiv.fandom.com | `/api.php` | Fandom runs on MediaWiki; same Action API for pages and search. Player-maintained reference. |
| **Final Fantasy Wiki (Fandom)** | finalfantasy.fandom.com | `/api.php` | Broader FF wiki; FFXIV database and some XIVAPI-backed modules. |

Use of wiki APIs must respect each site’s robots policy, rate limits, and terms of use; prefer linking and short attributed excerpts over full reproduction (see §9 NFR-5).

**Other notable FFXIV sources (no public API documented):** These are valuable for the knowledge base as references or link targets; integration would require scraping, manual curation, or future API availability.

| Source | Purpose | Notes |
|--------|---------|--------|
| **Tomestone.gg** (tomestone.gg) | Gear planning, BiS optimization, character/gear data | Community gear-planning site. Data ingested from users via Dalamud plugin (no public third-party API). Use as cited reference or link for BiS/gearing; no API consumption. |
| **wtfdig** (wtfdig.info) | Raid strategy guides (Extreme, Savage, Ultimate) | Strategy guides and mechanics; patch-aware (e.g. 7.2, 7.3). No public API documented. Use as reference/link for raid plans and “how to do X” answers; no API consumption. |
| **xivanalysis** (xivanalysis.com) | Rotation and performance analysis from FFLogs reports | Analyzes combat logs (via FFLogs report URL) and returns job-specific feedback: checklist (GCD uptime, buffs, DoTs), suggestions, timeline. Open-source (TypeScript/Rust); no public API for third-party “analyze report” calls. Use as reference/link for “how do I improve my parse?” or rotation feedback; no API consumption. |
| **xiv-housing.com** (xiv-housing.com) | Housing lottery tracker (plots by region/datacenter) | FF14 housing lottery tracker; no public API documented. Use as reference/link only for "when is the next lottery?" or plot availability; no API consumption. |

**Housing (future extension):** Housing information (lottery schedules, plot availability, ward/district data) is **out of scope for MVP**. When extending to housing in a later phase, the following sources may be evaluated; **xiv-housing.com** does not document a public API.

| Source | Purpose | Access / notes |
|--------|---------|----------------|
| **FFXIV_PaissaDB** (e.g. zhudotexe/FFXIV_PaissaDB) | Companion API for PaissaHouse plugin; housing plot data | GitHub; API for plugin use; evaluate for plot/ward data. |
| **XIVHOUSING** (xivhousing.com) | Historical housing data, Free Company census, plot distribution by patch/datacenter | Separate site from xiv-housing.com; check site for API or data access. |
| **ffxiv-housing-lottery-schedule** (e.g. yoshiori/ffxiv-housing-lottery-schedule) | Housing lottery schedule | GitHub (e.g. Ruby); schedule data; evaluate for lottery timing. |

**Fallback and degradation:** When a primary data source is unavailable (e.g., XIVAPI or a wiki down or rate-limited), the system shall return cached data if available and within a defined age (e.g., &lt; N hours), or else a clear "source temporarily unavailable" message with a suggestion to retry; behavior and cache TTL will be defined in technical design.

**Source of truth and cache:** For each query category, technical design shall define primary source(s), cache strategy, and invalidation trigger (e.g., patch day, manual refresh, TTL).

Technical design will specify which endpoints to call, caching and update strategy, rate limits, and fallbacks when an API is unavailable. The system shall be designed for **cost predictability** (e.g., cache-first for game data, batch or background refresh where possible, configurable rate limits to third-party APIs). Cost optimizations shall not degrade the user-facing experience (e.g., stale data must show a visible "last updated"; error messages must be clear).

### 7.4 Client Interface and User Experience (UX)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-24 | Usable client interface | The system shall provide a hosted **web UI** (similar to tomestone.gg or wtfdig.info) with a workable chat interface through which users can submit queries, conduct conversations, and receive sourced answers. The client shall provide a **first-run or empty-state experience**: example queries or suggested topics (e.g., "Try: What is BiS for Aloalo Savage?") so users can immediately see what ChatXIV can do. The interface shall support keyboard navigation and screen-reader-friendly structure (e.g., ARIA labels for messages and actions). Optional structured inputs (e.g., job/level dropdowns for rotations) may be considered in a later phase. |
| FR-27 | Idempotency and rate limiting | The system shall support **idempotency** for feedback submission (FR-25) and shall apply **rate limiting** per user/session to protect backend and third-party APIs; limits and handling (e.g., graceful message when rate limited) shall be defined in technical design. |

---

## 8. User Experience (UX) — Detailed Specification

This section defines the in-depth user experience for the ChatXIV chat interface. It applies to the web (and similar external) client for initial release; the Dalamud plugin experience is described in §8.7.

### 8.1 Entry and Input

- **Entry:** The user enters the interface and is presented with a chat UI that includes an **enterable text field** as the primary input.
- **Placeholder:** The text field displays **placeholder (hint) text** that reads: *"Please ask me anything related to FFXIV."* The placeholder is visually de-emphasized (e.g., transparent or muted) so it does not compete with actual user input.
- **Topic scope:** Queries are expected to be **about FFXIV**. The system should handle off-topic or non-FFXIV queries according to product and technical design (e.g., gentle redirect or clarification that the bot is focused on FFXIV).

### 8.2 Loading and Response

- **Loading state:** After the user submits a query, the interface shows a **loading indicator** while the system gathers results. This is presented as **small text** that says *"Thinking"* and **pulsates from left to right** (or an equivalent subtle animation) so the user knows the request is in progress.
- **Response presentation:** Once the system has a result, the chatbot responds with **its own message bubble** (or equivalent chat message block) containing the answer.
- **Answer style:** Answers must be **succinct and non-verbose**, adding **relevant information** based on the question (e.g., source, patch, or next steps) without unnecessary length.

### 8.3 Per-Message Feedback

- **Placement:** At the **bottom of each generated (assistant) answer**, the UI shows **small icons** for **thumbs up** and **thumbs down**.
- **Behavior:** These controls are **non-intrusive** (visually subdued, small) and support the feedback mechanism described in FR-25 (thumbs up / thumbs down; thumbs down may trigger additional feedback options and a typable box per product design).

### 8.4 Conversation Continuity and Context

- **Continued chat:** The user can **continue the conversation** in the same session with follow-up messages.
- **Context handling:** The agent must support **either**:
  - **Contextual follow-up:** Using previous messages in the conversation as context to refine or extend answers (e.g., "What about for Black Mage?" after a rotation question), or  
  - **Independent asks:** Treating new user input as a **new, standalone question** when appropriate (e.g., a clearly unrelated topic).  
  Product and technical design will define when the system uses conversation history vs. interprets input as an independent query.

### 8.5 New Chat

- **Control:** The UI provides a **"New Chat"** action (e.g., button or menu item) that the user can click at any time.
- **Behavior:** When the user selects "New Chat":
  - The **current chat session is ended** (the existing conversation is no longer active).
  - A **new chat session is started** (fresh conversation, no prior context from the previous session).
  - The exit/unsaved warning in §8.6 applies when initiating a new chat, so the user is reminded that the current release does not save chats.

### 8.6 Exit and Unsaved Chat Warning (Initial Release)

- **Trigger:** When the user **leaves the UI** (e.g., navigates away, closes the tab or window) or **creates a new chat** (§8.5), the system displays a **popup (or equivalent) message**.
- **Message:** The message states: *"Chats are currently not saved for this release. Make sure to manually save anything before exiting."*
- **Scope:** This behavior is for the **initial release** only. A future release will support **saving up to 5 chats** (or as otherwise specified in a later product specification); at that time, the warning and persistence behavior may be updated accordingly.

### 8.7 Dalamud Plugin UX (Post–Initial Release)

When the **Dalamud plugin** is released (§5 Extensibility), the in-game experience differs as follows:

- **Presentation:** The UI is presented as an **in-game popup** (or overlay window) with a **minified version** of the chat interface, optimized for use while playing.
- **Data and API:** When the user asks a question:
  - The plugin may **interpret game data** when available (e.g., current job, location, or inventory) to enrich the query or response.
  - When game data is not available or not applicable, the system **still performs relevant API requests** (e.g., XIVAPI, wikis) to answer the question, consistent with the web client.
- **In-game content as parameters:** The UI must support an **option** (or default behavior) where **in-game content** that the user inserts directly into the chat is treated as **parameters** for the chatbot. Examples include:
  - **Linking items** (e.g., item links from the game) so the bot can use item IDs or names as parameters for queries (e.g., "Where do I get this?" or "What's the BiS for this slot?").
  - **Flags or markers for coordinates** (e.g., waymark or map coordinates pasted or linked in chat) so the bot can use them as parameters (e.g., "What's at these coordinates?" or "What quest is near here?").  
  Technical design will define how in-game links and coordinate data are parsed and passed to the backend or API.

### 7.5 Observability and Feedback

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-25 | User feedback | The system shall provide a **feedback mechanism** (thumbs up / thumbs down) so users can rate responses or conversations; default is **per-message** (technical design may allow per-conversation as an option). **Only the thumbs down choice** shall trigger a dropdown of **2–4 predefined options** (e.g., "Wrong answer," "Outdated," "Missing info," "Other") plus an optional free-text field; submission shall show confirmation and not block the conversation. Thumbs up does not require further input. Feedback shall be stored and **aggregated by query category/topic** so the team can prioritize high-impact areas; storage and retention shall be defined in technical design and comply with privacy expectations. |
| FR-26 | Usage observability | The system shall support **observability** of usage for product and operational decisions: **traffic** (volume, trends), **generalized asks/topics** (e.g., category tags: BiS, relic, rotation, unlock, raid plans, story, settings—aggregated and anonymized), **visit patterns** (how often and when users visit), and **session duration** (how long users engage per visit or session). Data collection, **retention period** for raw vs aggregated data, and privacy treatment (including any geographic or PII constraints) shall be defined in technical design and comply with applicable privacy expectations. |

---

## 9. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Accuracy | Answers must be traceable to defined sources; avoid hallucinated gear sets, rotations, or patch details. **Explicit keywords** (content that would violate platform ToS or community guidelines—e.g., profanity, adult content, harassment): the chatbot shall **not** provide substantive responses; it shall **refuse** with a brief, non-judgmental message (e.g., "I can't help with that") or redirect to guidelines; exact behavior and keyword handling shall be defined in technical design. **When no sourced answer is available**, the system shall respond with a clear, friendly message (e.g., "I couldn't find a sourced answer for that") and, where appropriate, suggest rephrasing or link to a wiki/search. |
| NFR-2 | Recency | Data shall be tagged with patch or "last updated" where applicable. **Update process:** responsibility (e.g., product or data owner), target (e.g., BiS/rotations updated within N days of patch), and how "last updated" is exposed in the UI shall be defined in technical design. |
| NFR-3 | Performance | **Response time target:** first useful token within **5 seconds**, full answer within **15 seconds** for a typical query (e.g., single-turn BiS or rotation query). "Typical" and any exclusions shall be defined in technical design. |
| NFR-4 | Availability | **Target availability:** **99%** for the chat service over a rolling month. Exclusions: planned maintenance, dependency on third-party API outages; exact definition and measurement shall be in technical design. |
| NFR-5 | Legal / ToS | Use of third-party data must comply with site ToS and copyright; prefer linking and attributed summarization over full reproduction. One-time legal review of data sources and attribution process (owner, scope) shall be carried out; any recurring review shall be defined by the business. |
| NFR-6 | Observability | Usage and feedback data shall be captured so the product can report on traffic by generalized topic/category, visit frequency and timing, session duration, and feedback (thumbs up/down); implementation shall respect privacy and retention policy (retention period to be defined in technical design). |
| NFR-7 | Cost-aware design | The system shall be designed for **cost predictability**: cache-first for game data, batch or background refresh where possible, configurable rate limits to third-party APIs. Cost optimizations (e.g., aggressive caching, rate limiting) shall **not** degrade the user-facing experience (e.g., no stale data without a visible "last updated"; no confusing error messages). |

### 9.1 Security, Safety, and Limits (BRD Principles)

The following principles apply at a business level; technical design will implement them.

**Security**

- **Secure transport and storage:** User traffic and any stored data (e.g., feedback, aggregated observability) shall use industry-standard protection (e.g., HTTPS in transit; secure handling of secrets and API keys server-side only). No API keys or credentials shall be exposed to the client.
- **Abuse resistance:** The system shall be designed to resist single-actor abuse (e.g., one user or automated client consuming disproportionate capacity). Rate limiting (FR-27) and, where applicable, abuse detection or mitigation shall be defined in technical design.
- **Scope of use:** ChatXIV is for **FFXIV game information only**. The product does not provide professional advice (e.g., medical, financial, or legal). Any disclaimer or in-product wording to that effect shall be defined by product/copy.

**Safety (content and behavior)**

- **Refusal and scope adherence:** In addition to NFR-1 (refusal for explicit keywords), the system shall **remain within FFXIV scope**: it shall not comply with attempts to obtain non-FFXIV advice, reveal system prompts or internal instructions, or bypass content guidelines (e.g., prompt injection or jailbreak attempts). Refusal shall be brief and non-judgmental; exact behavior to be defined in technical design.
- **User-generated content in feedback:** Free-text feedback (FR-25) may contain inappropriate content. Storage, moderation (if any), and handling of abusive or off-topic feedback shall be defined in technical design and align with content policy (NFR-1). A **report path** (e.g., link or contact for reporting harmful output or abuse of the service) shall be available to users; placement and process to be defined by product.

**Limits and transparency**

- **Rate limits and quotas:** Per FR-27, rate limiting per user/session (or equivalent) protects the backend and third-party APIs. When a user hits a limit, the system shall show a **clear, graceful message** (e.g., "You've reached the limit for now; please try again later") rather than a generic error. Optional usage transparency (e.g., "X queries today") may be exposed for trust and future tiering (§11.1).
- **Data use and expectations:** For the initial release, **chats are not saved** (§8.6). The business shall not use conversation content for training third-party models or sell conversation data. Observability (FR-26) shall **minimize PII** (e.g., no full message text in analytics; aggregate by topic/category only where possible). Retention and exact data flows shall be defined in technical design and comply with privacy expectations.

**Dependencies**

- Third-party APIs and libraries (including any LLM or embedding provider) shall be selected and used in accordance with their terms of service and with consideration for security and privacy. API keys and secrets shall remain server-side and not be exposed to clients.

---

## 10. Data Sources (Reference)

| Data need | Example sources | Notes |
|-----------|-----------------|--------|
| BiS / gearing | The Balance, raid content guides, Etro, Ariyala, **Tomestone.gg** | Define "as of patch" and update process. Tomestone.gg: reference/link only (no public API). |
| Relics | Official + community wikis, structured relic trees | Steps, items, quests per expansion. |
| Rotations | The Balance, job guides, **xivanalysis** (xivanalysis.com) | By job, level, and optionally patch. xivanalysis: parse/rotation feedback from FFLogs reports; reference/link only (no public API). |
| Unlocks | Official guide, wikis (e.g. ConsoleGamesWiki, Fandom FFXIV wiki) | Content → prerequisites → steps; wiki content accessible via MediaWiki API (see §7.3). |
| Patch history | Official patch notes, community summaries | Skill/ability/trait → patch timeline. |
| Raid plans | Raid content guides (e.g., **wtfdig** (wtfdig.info)), etc. | Fight → list of plans + links. wtfdig: strategy guides; reference/link only (no public API). |
| Crafting | **Garland Tools**, wikis, XIVAPI (recipes, items) | Macros, craft level, where to unlock; API or wiki (see §7.3). |
| Settings (in-game UI location) | Official guide, wikis (ConsoleGamesWiki, Fandom FFXIV wiki) | Where to find a setting in the game; wiki content via MediaWiki API (see §7.3). |
| Story progression (quest/NPC location) | XIVAPI (quests), wikis (quest guides) | Quest/NPC location, next-step guidance; present spoiler-safe (location/direction only, no major plot reveals). |
| Logs / rankings / parses | **FFLogs** | Zones, encounters, rankings, parses; API available (see §7.3). |
| **Housing** (future extension) | **PaissaDB**, **XIVHOUSING** (xivhousing.com), **ffxiv-housing-lottery-schedule**; **xiv-housing.com** (link only, no API) | Out of scope for MVP. xiv-housing.com has no documented API; see §7.3 "Housing (future extension)" for possible sources when extending. |

**API-backed sources (see §7.3):** XIVAPI (game data, search, Lodestone, servers, quests), Universalis (market board), FFLogs (raid logs/parses), and optionally Garland Tools (crafting/gathering) and wiki MediaWiki APIs (unlocks, settings location, quest/story progression) will be consumed as clients where applicable. Tomestone.gg, wtfdig, and xivanalysis are reference/link-only (no public API). **Source priority:** When multiple sources exist (e.g., BiS from The Balance vs Tomestone.gg), prefer The Balance for BiS/rotations and cite Tomestone.gg or others as alternative where relevant; technical design will implement consistently. Data strategy (API-first vs scraping vs manual curation), update frequency, caching, and attribution model to be detailed in technical design.

---

## 11. Assumptions and Constraints

### 11.1 Assumptions

- Players have access to a browser; ChatXIV is delivered as a hosted web UI (e.g., in the style of tomestone.gg or wtfdig.info).
- Community sources (The Balance, raid content guides, wikis) remain primary references; ChatXIV aggregates and cites rather than replacing them.
- Users may paste or link character/gear data (e.g., Etro, Teamcraft) for "what to greed?" and similar features; supported formats (Etro link, Teamcraft link/export, Lodestone URL, paste) will be defined in technical design.
- Patch cycles and content cadence follow Square Enix's current release pattern (major/minor patches).
- Observability (usage and feedback) can be implemented in a way that respects user privacy and applicable retention expectations; aggregated metrics (e.g., traffic by topic, visit patterns, session duration, thumbs up/down) are sufficient for product decisions.
- This BRD assumes **no advertisement revenue or ad hosting** for the initial release; advertisements are out of scope unless later specified in a separate BRD (see §4.2, §5 Extensibility).
- **Funding:** MVP is funded as specified in §14–§16 (Pricing and Sustainability); funding source and runway are agreed by the business. Business will provide necessary inputs (e.g., legal review, source ToS documentation, prioritization of query categories, branding/copy) as needed for delivery.
- **User research:** Product may validate top query types and input preferences (e.g., paste vs link) with a target number of players before locking MVP feature set; specifics to be defined by product.
- **Square Enix / game ToS:** Use of ChatXIV and any third-party tools or data is subject to applicable game and platform terms; the project will operate in accordance with community and publisher guidelines.
- **Usage transparency (optional for MVP):** Consider exposing lightweight usage or limits (e.g., "X queries today") in a non-intrusive way to build trust and set expectations for any future tiering; implementation is optional for MVP.
- **Security and identity for MVP:** Initial release may operate without user authentication (anonymous use). Security principles in §9.1 (secure transport, server-side secrets, abuse resistance) still apply; technical design will define how rate limiting and abuse mitigation work without mandatory sign-in.

### 11.2 Constraints

- No direct access to game client or live game state.
- Advertisement-based revenue and ad hosting are out of scope for this BRD unless later specified elsewhere.
- Data freshness depends on third-party sources and internal update pipelines.
- Legal and ToS constraints may limit how much content can be reproduced; attribution and linking are required.

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Stale data** | Wrong BiS, rotations, or unlock steps after patches | Store "as of patch" and "last updated"; define update triggers (e.g., patch day); surface "Last updated for 6.xx" in answers. |
| **Wrong or contested advice** | Community disagreement on BiS or rotations | Cite sources; offer "alternative sources" where relevant; avoid claiming single authority. |
| **Legal / ToS** | Takedowns or restrictions from data owners | Respect fan-site ToS and copyright; link and summarize with attribution; legal review for reproduction. |
| **Over-reliance on one source** | Source disappears or changes format | Document multiple sources per category; design for source-agnostic ingestion where possible. |
| **Third-party API dependency** | Key APIs (XIVAPI, wikis, etc.) unavailable or rate-limited | Cache-first design; fallback behavior (cached response or "source unavailable" message); document rate limits and cost tiers in technical design. |
| **Funding / sustainability** | No user revenue at launch; cost exceeds budget | Define funding source and runway (§16); cost ceiling triggers review; sustainability owner tracks cost and triggers pricing/funding decisions when thresholds are met. |
| **Key person dependency** | Critical knowledge or access concentrated in few people | Document data sources, API contacts, and runbooks; cross-train where feasible. |
| **Cost overrun** | Monthly cost exceeds budget or single API becomes unavailable/expensive | Runbook: if monthly cost exceeds agreed ceiling or a critical API is unavailable, the sustainability owner will (e.g., enable stricter caching, disable optional features, or trigger pricing/funding review) within an agreed number of days; details in operations or technical design. |
| **Advertising (if introduced later)** | UX impact, privacy, or dependency on ad partners | Keep advertisements out of scope for this BRD; any future ad strategy (revenue, hosting) to be defined in a separate BRD with clear UX and privacy treatment. |
| **Abuse or prompt injection** | Bot used to generate off-scope content or bypass guidelines; single actor overwhelms service | Design for scope adherence and refusal (§9.1); rate limiting and abuse mitigation in technical design; report path for users. |
| **Security or data incident** | Credential leak, data exposure, or breach of user trust | Secure transport and storage, server-side-only secrets (§9.1); incident response and user notification process to be defined in operations or technical design. |

---

## 13. Success Criteria and Definition of Done

**Success criteria (targets to be set by product/business):**

- **Adoption:** Number of conversations or unique users (target TBD; e.g., X weekly active users or Y conversations/week).
- **Satisfaction:** User feedback (thumbs up / thumbs down) and qualitative feedback indicating that ChatXIV "reduces research time" and "answers are accurate."
- **Coverage:** Percentage of supported query types (MVP: BiS, raid plans, story progression, unlocks, settings) that return a sourced, relevant answer (target TBD).
- **Operational:** Data freshness (e.g., MVP content updated within N days of patch); uptime meeting NFR-4 (99%).
- **Observability:** Ability to report on traffic by generalized topic/category, visit frequency and timing, session duration, and aggregate feedback scores to guide product and content priorities.

**Definition of done for MVP:** MVP is complete when (1) all Phase 1 query categories (BiS, raid plans, story progression, unlocks, settings) are supported for EN with sourced answers; (2) NFR-3 (performance) and NFR-4 (availability) are met; (3) feedback (FR-25) and observability (FR-26) are live; (4) hosted web UI (FR-24) is usable with first-run/empty state. Additional criteria may be set by product.

**Sign-off:** Scope changes and MVP release approval are the responsibility of the Product Owner (or designated business stakeholder); role/title to be assigned by the project.

---

## 14. Pricing and Business Model

- **User pricing for MVP:** **Free.** No user charge during initial release; no paywalls or dark patterns. Any future monetization will preserve core value and avoid degrading the free experience without clear communication.
- **Revenue at launch:** No user revenue (no ads, no subscriptions, no transactional features per §4.2). Funding for MVP is as specified in §16 Sustainability.
- **Future pricing:** Future pricing (e.g., freemium, subscription, donations) will be re-evaluated when a defined trigger is met (e.g., MAU &gt; 10k, or monthly cost &gt; $X, or runway &lt; 6 months). Decision owner and timeline (e.g., 30 days from trigger) to be assigned by the business; details may be documented in a separate BRD or product specification.

---

## 15. Cost and Sustainability

**Cost elements (to be estimated in technical design or a companion "Cost and Pricing Assumptions" doc):**

- **APIs:** Per-API access (free/paid), rate limits, and estimated monthly cost by usage tier (e.g., XIVAPI, Universalis, FFLogs, wikis); technical design will document assumptions.
- **Infrastructure:** Hosting (e.g., cloud), scaling, redundancy; if LLM/embeddings are used, cost per traffic tier. Architecture (stateless API + cache vs LLM-backed) and estimated infra cost per month by traffic band to be in technical design.
- **Labor:** Patch-day and source-monitoring labor (hours or FTE per patch/year); owner for data updates.
- **Legal:** One-time legal review of data sources and attribution; any recurring review as defined by business.
- **Support / moderation:** Model (e.g., community vs staff) and approach for triaging feedback (FR-25) and content policy (NFR-1); rough cost if applicable.
- **Localization (post-MVP):** Scope (UI only vs answers vs both) and estimated cost per language when Phase 2 is planned.

**Scenario table (optional):** A companion **"ChatXIV Cost and Pricing Assumptions"** doc may hold detailed API/infra assumptions, scenarios (e.g., "5k MAU, free tier → ~$Y/month"), and placeholders for actuals (e.g., quarterly cost vs estimate); the BRD remains the single source of truth for requirements.

---

## 16. Sustainability

- **Runway:** MVP is funded for a defined period (e.g., N months) or until a condition (e.g., adoption threshold) is met; funding source (e.g., internal budget, grant, sponsor, volunteer) to be agreed by the business.
- **Cost ceiling:** When monthly or annual cost exceeds an agreed ceiling (e.g., $X/month), the sustainability owner will trigger a pricing/funding review within an agreed number of days.
- **Owner:** A single role (e.g., Product Owner or Ops Lead) is responsible for cost tracking and sustainability decisions (e.g., triggering pricing/funding review when thresholds are met). Role/title to be assigned by the project.

---

## 17. Roadmap (High Level)

| Phase | Scope | Client | Target date |
|-------|--------|--------|-------------|
| **1 (MVP)** | BiS, raid plans, story progression, unlocks, settings; observability and feedback | Hosted web UI | TBD |
| **2** | Relic, raid gear greed, rotations, patch history, crafting; optional context memory, "my character" | Web UI | TBD |
| **3 (Extensibility)** | Dalamud plugin, image support, localization (EN/DE/FR/JP), optional ads | Per §5 | TBD |

Dates and detailed milestones to be set by product and tracked in project planning.

---

## 18. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-27 | — | Initial BRD from ChatXIV product brainstorm. |
| 1.1 | 2025-02-27 | — | Bump document version to 1.1. |
| 1.2 | 2025-02-27 | — | Add client interface to scope (§4.1) and FR-19 in §7.4 (usable client interface with workable chat). |
| 1.3 | 2025-02-27 | — | Add §5 Extensibility (Dalamud plugin for in-game access post–initial release); clarify §4.2; renumber sections 5–12 to 6–13. Update extra in-scope items. |
| 1.4 | 2025-02-27 | — | Add picture/image support to §5 Extensibility (raid plans, strategy images in chat; attribution per NFR-5). |
| 1.5 | 2025-02-27 | — | Add Story Progression to §4.1; align §7.1 (Crafting, Settings, Story progression), §7.2 (spoiler-safe story), §7.3 (wiki/API for settings and quests); align §9 Data Sources with §4 scope (Crafting, Settings, Story progression). |
| 1.6 | 2025-02-27 | — | Add observability and feedback: scope (§4.1), FR-25/FR-26 (§7.5), NFR-6 (§8), success criteria (§13), stakeholder interest (§6), assumption (§10.1). |
| 1.7 | 2025-02-28 | — | Add §8 User Experience (UX) — detailed specification: entry/input, placeholder, loading (“Thinking” animation), response bubbles, per-message thumbs up/down, conversation context vs independent asks, New Chat, exit/unsaved warning, Dalamud plugin UX (minified popup, game data + API, in-game links/coordinates as params). Renumber sections 9–14. |
| 2.0 | 2025-02-28 | — | Incorporate feedback from BRD-Business-Requester-Review and BRD-Pricing-and-Cost-Analysis: MVP Phase 1/2 table (BiS, raid plans, story, unlocks, settings); definition of done and sign-off; NFRs (explicit keywords, performance 5s/15s, availability 99%, cost-aware NFR-7); Pricing (§14), Cost (§15), Sustainability (§16), Roadmap (§17); backend/API contract, fallback, idempotency/rate limit (FR-27); UX (first-run, feedback options, source presentation, error states, accessibility); assumptions, risks (API dependency, funding, cost overrun); source priority; spoiler example. |
| 2.1 | 2025-02-28 | — | Add §9.1 Security, Safety, and Limits: security (secure transport/storage, abuse resistance, scope-of-use disclaimer); safety (scope adherence, refusal for prompt injection/jailbreak, feedback moderation, report path); limits and transparency (graceful rate-limit messaging, data-use expectations, minimize PII in observability); dependencies (ToS, server-side secrets). Add risks: abuse/prompt injection, security or data incident. Add assumption: security and identity for MVP (anonymous use, §9.1 still applies). |

---

*This BRD is the single source of truth for business requirements for ChatXIV. Technical design, data pipelines, and implementation details will be captured in separate technical specifications.*
