# PCFA Execution Plan

## Document Status

- Version: v0.1 Draft
- Source: `docs/PRD.md`
- Scope: MVP Phase 1
- Target platforms: X and Threads
- Target runtime: Chrome Extension Manifest V3 with a local Ollama backend

---

## 1. Execution Objective

This plan turns the Personal Cognitive Firewall Assistant (PCFA) PRD into an implementation path for the first local browser assistant MVP.

The MVP must prove that PCFA can:

- extract only user-visible social feed content,
- analyze visible posts locally,
- score cognitive and information quality signals,
- transform noisy feed items non-destructively,
- show transparent explanations in a side panel,
- and store local analytics without centralizing user data.

The goal is not to build every future cognitive analytics feature. The goal is to validate the local-first architecture, the browser extension workflow, the scoring pipeline, and the user experience contract.

---

## 2. MVP Product Boundary

### In Scope

- Chrome Extension Manifest V3
- Content scripts for X and Threads
- Visible DOM extraction
- Post normalization
- Local analysis through Ollama
- Toxicity, emotion, information density, and propaganda-risk scoring
- Basic account metadata capture from visible DOM
- Non-destructive post annotation and collapsing
- Side panel dashboard
- Local persistence for post scores and session metrics
- Transparent scoring explanations

### Out of Scope

- Auto-scrolling
- Auto-clicking
- Hidden comment expansion
- Cloud scraping
- Cross-user analytics
- Centralized user database
- Political truth classification
- Automated platform actions
- Reddit, YouTube, Discord, Instagram, Facebook, and LinkedIn support

---

## 3. Delivery Strategy

PCFA should be delivered as a thin, inspectable browser extension first, with intelligence delegated to a local analysis service.

The MVP architecture should optimize for:

- privacy by default,
- clear data boundaries,
- modular platform adapters,
- replaceable local model backends,
- explainable scoring,
- and low-risk UI transformations.

Implementation should proceed vertically: build one complete visible-post flow for X first, then generalize the adapter model and add Threads.

---

## 4. Proposed Technical Stack

### Browser Extension

- Framework: Plasmo or Vite with React
- Extension format: Chrome Manifest V3
- UI surfaces: content script overlays and Chrome side panel
- Background runtime: service worker
- Messaging: Chrome extension message passing

### Local Analysis Runtime

- Initial backend: Ollama HTTP API
- Model class: compact local LLM for summarization and explanation
- Optional classifiers: ONNX Runtime or Hugging Face Transformers for specialized toxicity/emotion classifiers

### Local Storage

- MVP storage: IndexedDB inside the extension
- Future analytics storage: SQLite or DuckDB through a local companion service

IndexedDB is sufficient for the extension-only MVP. SQLite or DuckDB should be introduced when multi-session analytics and heavier aggregation become necessary.

---

## 5. System Components

### 5.1 Platform Adapter Layer

Responsibilities:

- detect supported platform pages,
- identify visible feed containers,
- extract visible post nodes,
- extract visible comment nodes when opened by the user,
- collect visible account metadata,
- assign stable local IDs for observed items,
- and avoid hidden or off-screen data collection.

Initial adapters:

- `xAdapter`
- `threadsAdapter`

Each adapter should expose a shared interface:

```ts
interface PlatformAdapter {
  platform: "x" | "threads";
  isSupportedPage(): boolean;
  observeVisibleFeed(onItems: (items: RawFeedItem[]) => void): void;
  extractItem(node: Element): RawFeedItem | null;
}
```

### 5.2 DOM Extraction Layer

Responsibilities:

- observe viewport-visible content,
- debounce DOM mutations,
- deduplicate repeated nodes,
- strip irrelevant UI text,
- preserve author, timestamp, post body, engagement counts, and visible links,
- and mark extraction confidence.

Constraints:

- Do not auto-scroll.
- Do not click or expand content.
- Do not process hidden DOM as user-visible evidence.

### 5.3 Normalization Pipeline

Responsibilities:

- convert raw platform data into a canonical schema,
- normalize text,
- preserve platform-specific metadata,
- hash content locally for deduplication,
- and prepare analysis requests.

Suggested canonical shape:

```ts
interface NormalizedFeedItem {
  id: string;
  platform: "x" | "threads";
  url?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  accountSignals?: AccountSignals;
  text: string;
  visibleLinks: string[];
  engagement?: EngagementSignals;
  observedAt: string;
  extractionConfidence: number;
}
```

### 5.4 Local AI Analysis Engine

Responsibilities:

- send normalized visible content to the local runtime,
- request structured JSON outputs,
- validate model responses,
- retry or degrade gracefully on invalid output,
- and return score explanations with confidence estimates.

Initial score categories:

- toxicity score,
- anger score,
- fear score,
- hostility score,
- information density,
- evidence presence,
- propaganda risk,
- bot signal,
- coordination risk,
- and summary quality.

### 5.5 Scoring and Explanation Layer

Responsibilities:

- combine model outputs with deterministic heuristics,
- produce calibrated scores from 0.0 to 1.0,
- attach human-readable explanations,
- show signal contribution rather than verdicts,
- and distinguish between low confidence and low risk.

Scores must never be presented as final truth. They are local risk estimates and attention-management hints.

### 5.6 Feed Transformation Layer

Responsibilities:

- annotate posts with score badges,
- visually de-emphasize high-noise items,
- collapse high-toxicity items behind a reversible control,
- provide short structured summaries,
- and preserve access to original content.

All transformations must be reversible by the user.

### 5.7 Side Panel Dashboard

Responsibilities:

- show current session metrics,
- show feed-level toxicity ratio,
- show emotional exposure indicators,
- show information density trends,
- list recent high-risk patterns,
- explain how scores are generated,
- and provide user controls for collapse thresholds.

### 5.8 Local Storage and Analytics

Responsibilities:

- persist local session summaries,
- store normalized item hashes and scores,
- track daily aggregate metrics,
- avoid storing unnecessary raw feed text by default,
- and provide a user-controlled data deletion path.

For MVP, store raw text only when required for visible explanations or summaries. Prefer derived scores and hashes for longer retention.

---

## 6. Milestones

### Milestone 0: Repository and Architecture Setup

Deliverables:

- extension project scaffold,
- TypeScript configuration,
- linting and formatting,
- shared domain types,
- architecture decision record for local-first data handling,
- and development instructions.

Acceptance criteria:

- extension builds locally,
- side panel shell opens,
- content script loads on test pages,
- and no external analytics or telemetry is present.

### Milestone 1: X Visible Feed Extraction

Deliverables:

- X adapter,
- viewport-aware DOM observer,
- raw post extraction,
- normalization pipeline,
- duplicate detection,
- extraction debug panel or logs.

Acceptance criteria:

- visible X posts are detected without auto-scrolling,
- extracted fields are normalized consistently,
- hidden content is ignored,
- and repeated DOM updates do not create duplicate records.

### Milestone 2: Local Analysis Runtime Integration

Deliverables:

- Ollama client,
- model availability check,
- structured analysis prompt,
- JSON response validator,
- fallback behavior for unavailable runtime,
- and basic scoring output.

Acceptance criteria:

- one visible post can be analyzed locally,
- invalid model output is handled safely,
- no raw content is sent to cloud services,
- and the user can see local runtime status.

### Milestone 3: Scoring, Explanation, and UI Annotation

Deliverables:

- score schema,
- explanation schema,
- score badge UI,
- reversible collapse control,
- summary display,
- and user-configurable thresholds.

Acceptance criteria:

- high-toxicity posts can be collapsed and restored,
- every score includes a short explanation,
- the UI does not permanently hide or delete content,
- and uncertain scores are labeled as uncertain.

### Milestone 4: Side Panel Dashboard

Deliverables:

- current session metrics,
- feed-level aggregate scores,
- emotional exposure indicators,
- information density summary,
- threshold controls,
- and transparency notes.

Acceptance criteria:

- dashboard updates as visible posts are analyzed,
- aggregate metrics match stored item scores,
- controls affect content transformations immediately,
- and the dashboard remains usable when the local model is unavailable.

### Milestone 5: Threads Adapter

Deliverables:

- Threads platform adapter,
- adapter-specific selectors,
- normalization compatibility checks,
- and platform regression fixtures.

Acceptance criteria:

- visible Threads posts are extracted and analyzed,
- shared scoring and dashboard code works without platform-specific branching,
- and X behavior remains stable.

### Milestone 6: Local Persistence and Daily Metrics

Deliverables:

- IndexedDB persistence,
- session rollups,
- daily metric aggregation,
- retention settings,
- and local data deletion control.

Acceptance criteria:

- scores survive extension reloads,
- daily metrics are generated locally,
- users can clear stored data,
- and retention behavior is documented.

### Milestone 7: MVP Hardening

Deliverables:

- performance profiling,
- memory usage review,
- false-positive review set,
- privacy review,
- UX review,
- and MVP release checklist.

Acceptance criteria:

- extension remains responsive on long feeds,
- local inference failures do not break browsing,
- privacy constraints are verified,
- and the MVP is ready for controlled personal use.

---

## 7. Workstreams

### Extension Platform

- project scaffold,
- manifest configuration,
- background service worker,
- content script lifecycle,
- side panel routing,
- extension permissions review.

### Platform Extraction

- X adapter,
- Threads adapter,
- viewport detection,
- mutation observer,
- deduplication,
- extraction confidence.

### Local Intelligence

- Ollama health checks,
- prompt templates,
- structured output validation,
- scoring calibration,
- classifier integration path,
- runtime error handling.

### Product UX

- score badges,
- reversible collapse,
- summaries,
- side panel dashboard,
- threshold controls,
- transparency explanations.

### Privacy and Storage

- local-only persistence,
- retention policy,
- data deletion,
- raw text minimization,
- privacy test checklist.

### Quality and Evaluation

- platform fixture pages,
- score regression examples,
- false-positive review,
- latency measurements,
- memory profiling,
- manual test scripts.

---

## 8. Data Model Draft

### Feed Item Score

```ts
interface FeedItemScore {
  itemId: string;
  model: string;
  analyzedAt: string;
  scores: {
    toxicity: number;
    anger: number;
    fear: number;
    hostility: number;
    informationDensity: number;
    evidencePresence: number;
    propagandaRisk: number;
    botSignal: number;
    coordinationRisk: number;
  };
  confidence: number;
  explanations: ScoreExplanation[];
  summary?: string;
}
```

### Score Explanation

```ts
interface ScoreExplanation {
  category: string;
  contribution: "low" | "medium" | "high";
  reason: string;
  evidence?: string[];
}
```

### Session Metrics

```ts
interface SessionMetrics {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  postsViewed: number;
  postsAnalyzed: number;
  highToxicityPosts: number;
  averageInformationDensity: number;
  emotionalExposureMinutes?: number;
}
```

---

## 9. Prompting and Classification Policy

The analysis prompt must require structured JSON and neutral language.

The model should be instructed to:

- analyze rhetorical and informational signals,
- avoid political truth judgments,
- avoid ideology classification,
- separate toxicity from disagreement,
- cite observable text signals,
- estimate confidence,
- and return uncertainty when evidence is weak.

The model should not be asked to determine whether a political claim is true. If fact checking is ever added, it must be designed as a separate user-controlled feature with explicit source handling.

---

## 10. Privacy and Compliance Gates

Before MVP completion, verify that PCFA:

- processes only visible or user-opened content,
- does not auto-scroll,
- does not auto-click,
- does not collect hidden DOM content,
- does not send raw feed content to cloud services,
- does not create cross-user analytics,
- stores data locally,
- offers local data deletion,
- and labels all scores as estimates.

These gates should block release if violated.

---

## 11. Testing Plan

### Unit Tests

- normalization functions,
- score validation,
- threshold logic,
- storage adapters,
- prompt response parsing.

### Integration Tests

- content script to background messaging,
- background to Ollama runtime,
- side panel metric updates,
- storage persistence and reload behavior.

### Manual Tests

- X feed extraction,
- Threads feed extraction,
- local runtime unavailable state,
- high-toxicity collapse and restore,
- low-confidence explanation display,
- data deletion flow.

### Evaluation Tests

- curated post examples,
- expected score ranges,
- false-positive review,
- latency and memory profiling,
- summary usefulness review.

---

## 12. Initial Risks

### Platform DOM Instability

X and Threads DOM structures may change frequently.

Mitigation:

- isolate selectors in adapters,
- use semantic and accessibility hints where possible,
- maintain fixture snapshots,
- and add extraction confidence.

### Local Model Variability

Different local models may return inconsistent scores.

Mitigation:

- validate structured output,
- separate deterministic heuristics from model scoring,
- record model name and version,
- and start with conservative UI thresholds.

### Overblocking or Perceived Censorship

Users may interpret collapsed content as censorship.

Mitigation:

- keep all transformations reversible,
- show original content access clearly,
- provide threshold controls,
- and explain that scores are local estimates.

### Privacy Boundary Drift

Feature pressure may push toward broader collection.

Mitigation:

- maintain explicit compliance gates,
- document forbidden behaviors,
- and review every new feature against the local-first rule.

### Performance Cost

DOM observation and local inference may affect browsing.

Mitigation:

- debounce extraction,
- analyze only visible items,
- cache scores by local content hash,
- and provide runtime pause controls.

---

## 13. Release Criteria for MVP v0.1

The MVP is ready for controlled personal use when:

- X and Threads visible posts can be analyzed locally,
- high-noise content can be annotated and reversibly collapsed,
- side panel metrics update from local scores,
- all scoring includes explanations and confidence,
- local model failures degrade gracefully,
- no cloud feed processing is used,
- local data can be deleted,
- and privacy/compliance gates pass.

---

## 14. Recommended Implementation Order

1. Scaffold extension and shared types.
2. Build X visible extraction end to end.
3. Add local Ollama analysis for one post.
4. Add score validation and explanations.
5. Add content annotation and reversible collapse.
6. Build the side panel dashboard.
7. Add IndexedDB persistence and session metrics.
8. Add Threads adapter.
9. Run privacy, performance, and UX hardening.
10. Package MVP v0.1 for controlled personal use.

