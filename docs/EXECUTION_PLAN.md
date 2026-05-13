# PCFA Execution Plan

## Document Status

- Version: v0.4 Task Tracker
- Source: `docs/PRD.md`
- Scope: MVP Phase 1
- Target platforms: X and Threads
- Target runtime: Chrome Extension Manifest V3 with a local Ollama backend
- Rule: update this checklist whenever implementation work finishes. Keep `docs/EXECUTION_PLAN.md` and `docs/EXECUTION_PLAN.zh-TW.md` synchronized.

---

## 1. MVP Objective

Build a local-first browser assistant that analyzes only visible social feed content, estimates cognitive and information-quality signals locally, annotates or collapses noisy content non-destructively, and shows transparent session metrics in a side panel.

---

## 2. Current Status

- [x] PRD exists in English: `docs/PRD.md`
- [x] PRD exists in Traditional Chinese: `docs/PRD.zh-TW.md`
- [x] Execution plan exists in English: `docs/EXECUTION_PLAN.md`
- [x] Execution plan exists in Traditional Chinese: `docs/EXECUTION_PLAN.zh-TW.md`
- [x] MVP runbook exists: `docs/MVP_RUNBOOK.md`
- [x] Dependency-free Chrome MV3 prototype exists
- [ ] Extension has been manually loaded and verified in Chrome / Chromium
- [ ] X extraction has been verified against the live site
- [ ] Threads extraction has been verified against the live site
- [ ] Ollama analysis has been verified with a real local model

---

## 3. Product Boundary Checklist

### In Scope

- [x] Chrome Extension Manifest V3
- [x] Content scripts for X and Threads
- [x] Visible DOM extraction
- [x] Post normalization
- [x] Local analysis through Ollama
- [x] Heuristic local fallback when Ollama is unavailable
- [x] Toxicity scoring
- [x] Emotion scoring
- [x] Information density scoring
- [x] Propaganda-risk scoring
- [x] Basic account metadata capture from visible DOM
- [x] Non-destructive post annotation
- [x] Reversible high-toxicity collapsing
- [x] Side panel dashboard
- [x] Local score and session metric persistence through `chrome.storage.local`
- [x] Transparent scoring explanations
- [ ] IndexedDB persistence
- [ ] Calibrated classifier integration
- [ ] Attention-time analytics

### Out of Scope for MVP

- [x] No auto-scrolling
- [x] No auto-clicking
- [x] No hidden comment expansion
- [x] No cloud scraping
- [x] No centralized user database
- [x] No cross-user analytics
- [x] No political truth classification
- [x] No automated platform actions
- [x] No support yet for Reddit, YouTube, Discord, Facebook, Instagram, Hacker News, or LinkedIn

---

## 4. Milestone Checklist

### Milestone 0: Repository and Architecture Setup

- [x] Create extension project structure
- [x] Add `manifest.json`
- [x] Add background service worker
- [x] Add content script
- [x] Add side panel HTML/CSS/JS
- [x] Add MVP runbook
- [x] Configure extension permissions conservatively
- [x] Avoid external analytics or telemetry
- [x] Add TypeScript configuration
- [x] Add linting and formatting setup
- [x] Add shared domain type definitions
- [x] Add architecture decision record for local-first data handling

Acceptance:

- [x] Manifest parses as valid JSON
- [x] JavaScript files pass syntax checks
- [x] Extension builds through a formal build command
- [ ] Extension loads cleanly through Chrome "Load unpacked"

### Milestone 1: X Visible Feed Extraction

- [x] Detect X / Twitter hostnames
- [x] Find visible X tweet candidates
- [x] Extract visible tweet text
- [x] Extract visible author handle when available
- [x] Extract visible links
- [x] Assign local stable IDs
- [x] Deduplicate observed items
- [x] Debounce DOM mutation scans
- [x] Ignore off-viewport candidates
- [ ] Verify selectors against live X
- [x] Add fixture-based regression examples
- [ ] Improve extraction confidence calibration

Acceptance:

- [x] Implementation does not auto-scroll
- [x] Implementation does not auto-click
- [x] Implementation does not expand hidden content
- [ ] Live X posts are detected reliably
- [ ] Repeated DOM updates do not create duplicate visible annotations

### Milestone 2: Local Analysis Runtime Integration

- [x] Add Ollama HTTP client
- [x] Add model setting with default `llama3.2`
- [x] Add structured JSON prompt
- [x] Validate and normalize model scores
- [x] Add heuristic fallback for unavailable Ollama
- [x] Store model/source metadata with scores
- [x] Avoid cloud analysis calls
- [x] Add explicit Ollama health check UI
- [ ] Verify with a real local Ollama model
- [x] Add retry policy for malformed model output

Acceptance:

- [x] One normalized item can be sent to local analysis code
- [x] Invalid or unavailable model path degrades to local heuristic scoring
- [x] No raw content is sent to cloud services by the extension code
- [x] User can clearly see whether Ollama or heuristic mode produced the score

### Milestone 3: Scoring, Explanation, and UI Annotation

- [x] Add score schema in background result objects
- [x] Add explanation schema in background result objects
- [x] Add toxicity badge
- [x] Add anger badge
- [x] Add information-density badge
- [x] Add explanation details UI
- [x] Add reversible collapse control
- [x] Add configurable collapse threshold
- [x] Label heuristic explanations separately from local model explanations
- [x] Add low-confidence visual state
- [x] Add per-category score details in side panel
- [x] Add user override for a single collapsed item

Acceptance:

- [x] High-toxicity items can be collapsed and restored
- [x] Every score includes at least one explanation
- [x] UI does not permanently hide or delete content
- [x] Uncertain scores are explicitly labeled as uncertain

### Milestone 4: Side Panel Dashboard

- [x] Add side panel shell
- [x] Show analyzed item count
- [x] Show high-toxicity item count
- [x] Show average toxicity
- [x] Show average information density
- [x] Show recent signal list
- [x] Add model setting control
- [x] Add threshold control
- [x] Add heuristic-only mode toggle
- [x] Add raw-text storage toggle
- [x] Add local score clearing button
- [ ] Add emotional exposure time
- [ ] Add feed-level outrage amplification ratio
- [ ] Add discussion diversity score
- [x] Add privacy/compliance status panel

Acceptance:

- [x] Dashboard can read local extension state
- [x] Dashboard can update settings
- [x] Dashboard can clear local score data
- [ ] Dashboard has been verified while browsing live X / Threads

### Milestone 5: Threads Adapter

- [x] Detect Threads hostnames
- [x] Add best-effort Threads candidate selectors
- [x] Reuse shared normalization path
- [x] Reuse shared scoring and dashboard path
- [ ] Verify selectors against live Threads
- [x] Add Threads fixture-based regression examples
- [ ] Improve author and permalink extraction for Threads

Acceptance:

- [ ] Visible Threads posts are extracted reliably
- [x] Shared scoring code works without platform-specific branching after extraction
- [ ] X behavior remains stable after Threads verification

### Milestone 6: Local Persistence and Daily Metrics

- [x] Persist scores locally through `chrome.storage.local`
- [x] Persist settings locally through `chrome.storage.local`
- [x] Persist basic session metrics
- [x] Provide local data clearing control
- [x] Avoid storing raw visible text by default
- [ ] Implement IndexedDB persistence
- [x] Add daily rollups
- [x] Add retention settings
- [ ] Add export/import for local analytics

Acceptance:

- [x] Scores can survive extension runtime reload through local storage
- [x] Users can clear stored score data
- [x] Daily metrics are generated locally
- [x] Retention behavior is documented in the UI

### Milestone 7: MVP Hardening

- [x] Run syntax checks for current JavaScript files
- [x] Validate `manifest.json`
- [ ] Manually load extension in Chrome / Chromium
- [ ] Test on X
- [ ] Test on Threads
- [ ] Test with Ollama available
- [ ] Test with Ollama unavailable
- [x] Review extension permissions
- [ ] Profile long-feed performance
- [ ] Review memory usage
- [ ] Build false-positive review set
- [ ] Run privacy review against PRD constraints
- [ ] Prepare MVP release checklist

Acceptance:

- [ ] Extension remains responsive on long feeds
- [ ] Local inference failures do not break browsing
- [ ] Privacy constraints are verified manually
- [ ] MVP is ready for controlled personal use

---

## 5. Data Model Checklist

- [x] Feed item local ID
- [x] Platform field
- [x] URL field when visible
- [x] Author handle field when visible
- [x] Author display name field when visible
- [x] Visible links list
- [x] Observed timestamp
- [x] Extraction confidence estimate
- [x] Toxicity score
- [x] Anger score
- [x] Fear score
- [x] Hostility score
- [x] Information density score
- [x] Evidence presence score
- [x] Propaganda risk score
- [x] Bot signal score
- [x] Coordination risk score
- [x] Confidence field
- [x] Explanations list
- [x] Optional summary
- [ ] Versioned schema migrations
- [ ] Dedicated account reputation records
- [ ] Daily metric records

---

## 6. Privacy and Compliance Gates

- [x] Process only visible candidate content
- [x] Do not auto-scroll
- [x] Do not auto-click
- [x] Do not auto-expand hidden content
- [x] Do not send raw feed content to cloud services
- [x] Do not create cross-user analytics
- [x] Store scores locally
- [x] Offer local data deletion
- [x] Label scores as estimates through explanations
- [x] Avoid storing raw visible text by default
- [ ] Add visible privacy status in side panel
- [ ] Add manual privacy review notes before MVP release

---

## 7. Testing Checklist

### Static Checks

- [x] `node --check src/background.js`
- [x] `node --check src/content.js`
- [x] `node --check src/sidepanel.js`
- [x] `manifest.json` JSON parse check
- [ ] Add automated lint command
- [ ] Add automated test command

### Manual Checks

- [ ] Load unpacked extension in Chrome / Chromium
- [ ] Open side panel from extension action
- [ ] Browse X and confirm annotations appear
- [ ] Browse Threads and confirm annotations appear
- [ ] Confirm high-toxicity collapse can be restored
- [ ] Confirm threshold control affects future collapse behavior
- [ ] Confirm data clearing removes local scores
- [ ] Confirm raw text is not stored when the toggle is off
- [ ] Confirm heuristic fallback works when Ollama is unavailable
- [ ] Confirm Ollama analysis works when Ollama is available

---

## 8. Next Execution Tasks

- [ ] Manually load the unpacked extension in Chrome / Chromium.
- [ ] Fix any manifest, permission, or side panel loading issues found during manual load.
- [ ] Test X live extraction and adjust selectors.
- [ ] Test Threads live extraction and adjust selectors.
- [ ] Run Ollama locally and verify structured model output.
- [ ] Add a visible runtime health indicator for Ollama vs heuristic mode.
- [ ] Add fixture pages for extraction regression tests.
- [ ] Decide whether to keep dependency-free vanilla JS or migrate to TypeScript/Vite.
