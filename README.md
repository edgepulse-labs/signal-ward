# Personal Cognitive Firewall Assistant

Personal Cognitive Firewall Assistant (PCFA) is a local-first browser assistant for reducing cognitive noise in social media feeds. It analyzes only visible feed content, estimates information-quality and emotional-amplification signals locally, and presents reversible annotations, summaries, and dashboard metrics.

PCFA is not a censorship tool and does not decide political truth. It is an attention-protection and cognitive-observability layer.

## Current MVP

This repository currently contains a dependency-free Chrome Manifest V3 prototype.

Implemented:

- visible post extraction for X and Threads,
- analysis through Ollama, a local OpenAI-compatible server, or an approved OpenAI-compatible endpoint,
- local heuristic fallback when Ollama is unavailable,
- toxicity, anger, information-density, propaganda-risk, bot-signal, and coordination-risk estimates,
- reversible high-toxicity collapsing,
- content annotations with explanations,
- side panel metrics and settings,
- local score persistence through `chrome.storage.local`,
- local daily rollups and retention settings,
- content type labeling for ads, propaganda, chitchat, informational posts, opinions, and unknown items,
- opt-in settings for future statistics sharing and collective-defense suggestions, both disabled by default,
- local data clearing,
- raw visible text storage disabled by default.

Not yet complete:

- manual live-site verification,
- calibrated classifier integration,
- IndexedDB persistence,
- attention-time analytics,
- broader browser-driven test coverage,
- TypeScript/Vite migration decision.

## Load the Extension Locally

Run the local validation command first:

```sh
npm run build
```

1. Open Chrome or Chromium.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select this repository root:

```text
/home/nier/workspace/signal-ward
```

6. Open X or Threads and browse normally.
7. Open the PCFA side panel from the extension toolbar.

## Optional Local Model Setup

PCFA defaults to the Ollama model name `llama3.2`.

```sh
ollama serve
ollama pull llama3.2
```

If Ollama is unavailable, PCFA falls back to its built-in local heuristic scorer.

For LM Studio or another OpenAI-compatible local server, choose `OpenAI-compatible` in the side panel and set the base URL, for example `http://localhost:1234/v1`. Approved remote OpenAI-compatible endpoints can also be used when explicitly allowlisted by the extension.

## Privacy Boundary

PCFA is designed around local-first constraints:

- It analyzes visible or user-opened content only.
- It does not auto-scroll.
- It does not auto-click.
- It does not expand hidden comments.
- It does not send raw feed content to cloud services by default.
- It does not create cross-user analytics unless the user opts into future statistics sharing features.
- It stores scores locally.
- It does not store raw visible text unless the user enables that setting.

## Project Documents

- [Installation and Setup](docs/INSTALLATION.md)
- [Installation and Setup, Traditional Chinese](docs/INSTALLATION.zh-TW.md)
- [Usage Guide](docs/USAGE.md)
- [Usage Guide, Traditional Chinese](docs/USAGE.zh-TW.md)
- [Real-World Validation Prep](docs/REAL_WORLD_VALIDATION.md)
- [Real-World Validation Prep, Traditional Chinese](docs/REAL_WORLD_VALIDATION.zh-TW.md)
- [Collective Defense Plan](docs/COLLECTIVE_DEFENSE_PLAN.md)
- [Collective Defense Plan, Traditional Chinese](docs/COLLECTIVE_DEFENSE_PLAN.zh-TW.md)
- [EdgePulse Collector Integration](docs/EDGEPULSE_COLLECTOR_INTEGRATION.md)
- [EdgePulse Collector Integration, Traditional Chinese](docs/EDGEPULSE_COLLECTOR_INTEGRATION.zh-TW.md)
- [Focus and Information Classification Plan](docs/FOCUS_INFORMATION_CLASSIFICATION.md)
- [Focus and Information Classification Plan, Traditional Chinese](docs/FOCUS_INFORMATION_CLASSIFICATION.zh-TW.md)
- [Icon Generation Prompt](docs/ICON_GENERATION_PROMPT.md)
- [Icon Generation Prompt, Traditional Chinese](docs/ICON_GENERATION_PROMPT.zh-TW.md)
- [Unit Test Plan and Results](docs/UNIT_TEST_PLAN_AND_RESULTS.md)
- [Unit Test Plan and Results, Traditional Chinese](docs/UNIT_TEST_PLAN_AND_RESULTS.zh-TW.md)
- [Product Requirements Document](docs/PRD.md)
- [Product Requirements Document, Traditional Chinese](docs/PRD.zh-TW.md)
- [Execution Plan](docs/EXECUTION_PLAN.md)
- [Execution Plan, Traditional Chinese](docs/EXECUTION_PLAN.zh-TW.md)
- [MVP Runbook](docs/MVP_RUNBOOK.md)

## Development Notes

The execution plan is now the project task tracker. When implementation work finishes, update both:

- `docs/EXECUTION_PLAN.md`
- `docs/EXECUTION_PLAN.zh-TW.md`

Keep the checkboxes synchronized so English and Traditional Chinese documentation describe the same project state.
