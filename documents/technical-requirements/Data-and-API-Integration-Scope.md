# ChatXIV — Data and API Integration Scope (Technical Summary)

**Based on:** BRD §4.1, §7.3, §10  
**Focus:** MVP query categories, primary sources, ingestion, caching, fallback, attribution.

---

## 1. MVP Query Categories → Primary Source → Ingestion → Cache

| Category | Primary source | Ingestion method | Cache TTL / invalidation | "As of patch" / notes |
|----------|----------------|------------------|---------------------------|------------------------|
| **BiS / gearing** | **The Balance** (preferred per BRD §10) | **Manual curation** or **scrape** (no public API). Option: curated list of job/fight → link + short summary + optional "as of patch" from maintainer. | Long TTL (e.g. 7–14 days); **invalidate on patch day** + manual refresh trigger. Store `last_updated` and `patch_version` with each entry. | **Gap:** The Balance has no public API. Need product/legal: (1) manual data entry vs. scraping ToS, (2) who maintains "as of patch" and update SLA (e.g. within N days of patch). |
| **BiS / gearing (reference)** | **Tomestone.gg**, **Fanbyte** | **Reference/link only** (no public API). Tomestone: gear planning. Fanbyte: job guides, rotations, patch-dated content (e.g. 6.5). Return link + short signpost; **linking only**, no ingestion. | N/A (link-only). | Cite as alternative; no ingestion. |
| **BiS / gearing (gear resolution)** | **Etro** | **API** (`https://etro.gg/api/docs/`) for **user-provided gear set URLs** (Phase 2 "what to greed"); for MVP BiS, Etro can be cited when Balance guides embed Etro links. **BiS sites (Balance, Tomestone, Fanbyte, etc.) commonly use Etro to display gear**; resolving Etro links (see §2.6) is relevant whenever we cite or surface BiS. No bulk BiS ingestion from Etro. | If resolving user Etro link: short TTL (e.g. 1 h) or no cache (on-demand). | Etro API exists; MVP uses as reference/link. Resolve via **gearsets read** by ID. |
| **Raid plans** | **WTFDIG** (primary), **YouTube**, **raidplans.io** | **Priority:** (1) Retrieve from **WTFDIG** when possible (curated list or integration). (2) Else links to **YouTube** (with timestamp when possible) or **raidplans.io**. Linking to wtfdig approved. | List refresh: manual or batch (e.g. weekly); TTL 7 days. Invalidate on patch. | Product decision: WTFDIG first; fallback YouTube (timestamp) / raidplans.io. |
| **Story progression (MSQ)** | **XIVAPI** (quests) + **wiki** (MediaWiki) | **XIVAPI**: `/search` (indexes=Quest), `Quest/{id}` for quest metadata/location. **Wiki**: MediaWiki `action=query` / `action=parse` for quest guide pages (spoiler-safe excerpts: location, NPC, direction only). | Quest metadata: 24–72 h TTL; invalidate on patch. Wiki excerpts: 24–48 h TTL. | Tag answer "Spoiler-safe; location/direction only" (FR-14). Store source + "Last updated" from wiki or patch. |
| **Unlocks** | **Wikis** (ConsoleGamesWiki, Fandom FFXIV) | **MediaWiki API**: `action=query`, `action=parse`, search. **Excerpt when possible** (with attribution); linking in addition. Unlock pages → steps + links. | 24–48 h TTL; invalidate on patch or manual. | Product decision: excerpt allowed. Store source wiki + page + optional "last edited" from API. |
| **Settings** (in-game UI location) | **Wikis** (ConsoleGamesWiki, Fandom) | **MediaWiki API**: search for setting name → page(s); **excerpt when possible** (with attribution). Return short instructions + link. | 24–48 h TTL; invalidate on patch (UI can change). | Cite wiki + optional "last updated." |

**Summary of ingestion types for MVP:**

- **API:** XIVAPI (game data, search, quests, servers), MediaWiki (wikis), Etro (user gear-set URL only, Phase 2).
- **Scrape:** Not recommended for The Balance without legal/product approval; alternative is **manual curation**.
- **Manual/curated:** BiS (The Balance), raid plans (wtfdig + any other known guides list).

---

## 2. APIs to Integrate — Endpoints and Rate Limits

### 2.1 XIVAPI (xivapi.com)

| Need | Endpoints | Notes |
|------|-----------|--------|
| Game data (items, actions, jobs) | `GET /{content-type}/{id}` e.g. `/Item/1675`, `/Action/...`, `/ClassJob/...` | FR-15; language param below. |
| Search / lookup | `GET /search?string=...&indexes=Quest,Item,BNpcName,...` | FR-16. Indexes include Quest, Item, Action, InstanceContent, ENpcResident, etc. |
| Content listing | `GET /content` | List content types. |
| Quests | `GET /Quest/{id}`; search via `indexes=Quest` | Story progression (MSQ), NPC/location. |
| Servers / DCs | `GET /servers`, `GET /servers/dc` | FR-20. |
| Language (FR-19) | Query param `?language=fr` (or `en`, `ja`, `de`) | All relevant endpoints support `language`. |

**Rate limits (assumptions; XIVAPI docs do not publish exact numbers):**

- **Without key:** Per-IP rate limiting; suitable for frontend/low volume.
- **With API key:** Recommended for server-side. **Working assumption:** Cap at **50 requests per second** (server-side) unless XIVAPI documents otherwise; implement configurable throttle and backoff.

**Base URL:** `https://xivapi.com`

---

### 2.2 MediaWiki API (wikis)

| Wiki | Base URL | API endpoint | Use for MVP |
|------|----------|--------------|-------------|
| **FFXIV Wiki (ConsoleGamesWiki)** | https://ffxiv.consolegameswiki.com | https://ffxiv.consolegameswiki.com/mediawiki/api.php | Unlocks, settings, story/quest guides. |
| **FFXIV Wiki (Fandom)** | https://ffxiv.fandom.com | https://ffxiv.fandom.com/api.php | Unlocks, settings, quest/story. |
| **Final Fantasy Wiki (Fandom)** | https://finalfantasy.fandom.com | https://finalfantasy.fandom.com/api.php | Optional; broader FF; some FFXIV content. |

**Actions to use:**

- `action=query` — page content, revisions, search (e.g. `list=search`, `prop=revisions`, `rvprop=content`).
- `action=parse` — render page to HTML/text for excerpts.
- Search — `action=query&list=search&srsearch=...` for finding pages by setting name or unlock topic.

**Rate limits and policy:**

- No single standard; each wiki sets its own. **Best practice:** Identify client via `User-Agent`; respect `robots.txt`; serial requests; honor 429 and `Retry-After`.
- **Technical design:** Configurable rate limit (e.g. 1 req/s per wiki), exponential backoff on 429/5xx.

---

### 2.3 Other APIs (MVP vs Phase 2)

| API | MVP use | Phase 2 |
|-----|---------|---------|
| **Etro** (etro.gg/api) | Optional: resolve user-provided gear set URL for citation (see §2.6). | Ingest gear set for "what to greed?" |
| **Universalis** | No (market data). | Market-aware answers. |
| **Garland Tools** | No. | Crafting (BRD §7.3). |
| **Teamcraft** | No. | Crafting lists, gear export. |
| **FFLogs** | No. | Logs, parses, encounter metadata. |
| **Housing** (PaissaDB, XIVHOUSING, lottery schedule) | No. | Future extension; see §2.5. |

---

### 2.5 Housing (future extension)

Housing information (lottery schedules, plot availability, ward/district data) is **out of scope for MVP**. When extending to housing in a later phase, the following sources may be evaluated.

| Source | Purpose | Access / notes |
|--------|---------|----------------|
| **xiv-housing.com** | Housing lottery tracker (plots by region/datacenter) | **No public API documented.** Use as reference/link only (e.g. "when is the next lottery?"). |
| **FFXIV_PaissaDB** (e.g. [zhudotexe/FFXIV_PaissaDB](https://github.com/zhudotexe/FFXIV_PaissaDB)) | Companion API for PaissaHouse plugin; housing plot data | GitHub; API for plugin use; evaluate for plot/ward data. |
| **XIVHOUSING** (xivhousing.com) | Historical housing data, Free Company census, plot distribution by patch/datacenter | Different site from xiv-housing.com; check site for API or data access. |
| **ffxiv-housing-lottery-schedule** (e.g. [yoshiori/ffxiv-housing-lottery-schedule](https://github.com/yoshiori/ffxiv-housing-lottery-schedule)) | Housing lottery schedule | GitHub (e.g. Ruby); schedule data; evaluate for lottery timing. |

Technical design for a housing extension will specify ingestion (API vs scrape vs manual), caching, and attribution per source.

---

### 2.6 Etro (gear set resolution)

BiS guides and sites (The Balance, Tomestone.gg, Fanbyte, etc.) typically use **Etro** to display gear sets. When a user provides an Etro gear set URL (e.g. `https://etro.gg/gearset/<id>`) or when we cite a BiS source that embeds Etro links, resolve the set via the Etro API.

| Need | Endpoint | Notes |
|------|----------|--------|
| Resolve gear set by URL | **gearsets read** (path param `id`) | Parse gearset ID from URL; call API to retrieve job, slots, melds, food, etc. Per [Etro API docs](https://etro.gg/api/docs/). |
| Optional (Phase 2) | **gearsets bis** | Public BiS list; use only if needed and within Etro’s terms. |

**Base URL:** `https://etro.gg` · **API docs:** `https://etro.gg/api/docs/`  
**Rate limit:** Not specified in public docs; use conservative throttle and backoff on 429/5xx.

---

## 3. Caching and Fallback

### 3.1 Per-category cache strategy

| Category | TTL (suggestion) | Invalidation |
|----------|------------------|--------------|
| BiS / gearing (curated) | 7–14 days | Patch day; manual "refresh" trigger. |
| Raid plans (curated list) | 7 days | Patch day; manual. |
| Story progression (XIVAPI + wiki) | Quest: 24–72 h; wiki: 24–48 h | Patch day. |
| Unlocks (wiki) | 24–48 h | Patch day; manual. |
| Settings (wiki) | 24–48 h | Patch day. |
| XIVAPI game data (items, actions, jobs) | 24–72 h | Patch day. |

**Cache-first:** All answers served from cache when fresh; background or on-demand refresh to stay within TTL and invalidation rules (BRD: cost predictability, NFR-7).

### 3.2 Fallback when source is down

- **Rule:** If primary source (XIVAPI or wiki) is unavailable:
  - **If cached response exists and age < N hours** (e.g. N = 24): serve cached response and **show notice**: e.g. "Source temporarily unavailable; showing cached data as of [date/time]. Retry later for latest."
  - **Else:** Return clear message: **"This source is temporarily unavailable. Please try again later."** Optional: suggest retry or link to source.
- **Technical design:** N configurable (e.g. 12–24 h); same pattern for each integrated source (XIVAPI, each wiki).

### 3.3 Rate limiting and backoff

- **To third-party APIs:** Configurable cap (e.g. requests per minute per source); queue or throttle when at limit.
- **Backoff:** On 429 or 5xx: exponential backoff (e.g. 1s, 2s, 4s…) with max retries; then treat as "source unavailable" and apply fallback above.
- **User-facing:** Per FR-27: rate limit per user/session on ChatXIV side; when user is rate-limited, show: "You've reached the limit for now; please try again later."

---

## 4. Source Attribution and Legal

### 4.1 Attribution format (FR-12, NFR-5)

- **Every data-backed answer must include:**
  - **Source name** (e.g. "The Balance", "ConsoleGamesWiki", "XIVAPI").
  - **Patch or last-updated** where applicable (e.g. "patch 6.5", "last updated 2025-02-15").
- **Optional:** Link to source (e.g. Balance job page, wiki unlock page, wtfdig guide).
- **Storage:** Per answer or per curated entry store at least: `source_name`, `source_url` (optional), `patch_or_date`, `last_updated` (our cache timestamp).

**Display (per TRD):** Clickable "Source" with ▼ at bottom of each assistant message; on click, dropdown lists sources (name, patch/last-updated, optional link); arrow toggles to ▲; chat may scale. Unintrusive.

### 4.2 Legal / ToS (NFR-5)

- **Prefer:** Linking + short attributed summarization; avoid full reproduction of third-party content.
- **One-time legal review** of data sources and attribution process (owner, scope); recurring review as defined by business.
- **Gaps for product/legal input:**
  - **The Balance:** No public API; scraping vs manual curation; ToS for reproduction/summaries and "as of patch" responsibility.
  - **wtfdig / Tomestone.gg / Fanbyte:** Use as reference/link only; confirm no objection to being listed and linked.
  - **Wikis:** MediaWiki API use and robots.txt per wiki; extent of excerpting vs linking.

---

## 5. Gaps and Open Points

| Gap | Owner | Action |
|-----|--------|--------|
| The Balance has no public API | Product / legal | **Recommendation:** Manual curation for MVP; scraping only after ToS/legal review. Define owner for BiS and "as of patch" and SLA. |
| XIVAPI rate limit | Technical | **Assumption:** 50 req/s; configurable throttle and backoff. Confirm with provider if needed. |
| MediaWiki rate limits per wiki | Technical | Check each wiki's policy/robots.txt; set conservative defaults (e.g. 1 req/s) and User-Agent. |
| Raid plans | Product | **Resolved:** WTFDIG first; else YouTube (timestamp when possible) or raidplans.io. |
| Attribution UI | Product / copy | **Resolved:** Clickable "Source" dropdown per message (see TRD TR-10, TR-23). Copy for "Cached; source temporarily unavailable" in technical design. |
| Housing (future extension) | Product / technical | Out of scope for MVP. When extending: evaluate PaissaDB, XIVHOUSING (xivhousing.com), ffxiv-housing-lottery-schedule; xiv-housing.com has no documented API (reference/link only). See §2.5. |

---

## 6. Summary Tables (Quick Reference)

### (a) Category → source → ingestion → cache

| Category | Primary source | Ingestion | Cache TTL | Invalidation |
|----------|----------------|-----------|-----------|--------------|
| BiS | The Balance | Manual (or scrape if approved) | 7–14 d | Patch + manual |
| BiS ref | Tomestone.gg, Fanbyte, Etro | Link only (Tomestone, Fanbyte) / Etro API for user URL | — / 1 h | — |
| Raid plans | WTFDIG (primary); YouTube, raidplans.io | WTFDIG when possible; else links (YouTube w/ timestamp, raidplans.io) | 7 d | Patch + manual |
| Story (MSQ) | XIVAPI + wiki | API + MediaWiki query/parse | 24–72 h / 24–48 h | Patch |
| Unlocks | ConsoleGamesWiki, Fandom | MediaWiki query/parse | 24–48 h | Patch |
| Settings | ConsoleGamesWiki, Fandom | MediaWiki search/parse | 24–48 h | Patch |
| **Housing** (future) | PaissaDB, XIVHOUSING, ffxiv-housing-lottery-schedule; xiv-housing.com (link only) | Out of scope for MVP; see §2.5 for sources when extending. | — | — |

### (b) API endpoints and rate limits

| API | Endpoints (MVP) | Rate limit assumption |
|-----|-----------------|------------------------|
| XIVAPI | `/search`, `/{content}/{id}`, `/content`, `/Quest/*`, `/servers`, `/servers/dc`; `?language=fr` (en, ja, de, fr) | 50 req/s (working assumption); key server-side; configurable throttle + backoff |
| MediaWiki | `action=query`, `action=parse`, search; base URLs per wiki above | Conservative (e.g. 1 req/s/wiki); 429 + backoff |
| Etro | `gearsets read` (id); base https://etro.gg, docs https://etro.gg/api/docs/ | Optional MVP; conservative throttle + backoff |

### (c) Fallback and errors

| Situation | Behavior |
|-----------|----------|
| Source down, cache age < N h | Serve cache + notice "Showing cached data as of …" |
| Source down, no cache or cache stale | "Source temporarily unavailable. Please try again later." (+ optional link) |
| User rate-limited | "You've reached the limit for now; please try again later." |
| 429 / 5xx from API | Exponential backoff; then treat as source down |

### (d) Attribution format and UI

- **Display:** Clickable **"Source"** with down arrow (▼) at bottom of each assistant message (with thumbs up/down). On click: dropdown with list of sources; arrow toggles to ▲; chat may scale.
- **Per-source fields:** source name (required), patch/last-updated (when applicable), link (optional). Stored: `source_name`, `source_url`, `patch_or_date`, `last_updated`.

---

*This document is a technical summary for scoping. Technical design will specify exact endpoints, config keys, cache keys, and implementation details.*
