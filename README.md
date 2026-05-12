# Personal Cognitive Firewall Assistant

Personal Cognitive Firewall Assistant (PCFA) is a local-first browser assistant for reducing cognitive noise in social media feeds. It analyzes only visible feed content, estimates information-quality and emotional-amplification signals locally, and presents reversible annotations, summaries, and dashboard metrics.

PCFA is not a censorship tool and does not decide political truth. It is an attention-protection and cognitive-observability layer.

## Current MVP

This repository currently contains a dependency-free Chrome Manifest V3 prototype.

Implemented:

- visible post extraction for X and Threads,
- local analysis through Ollama at `http://localhost:11434`,
- local heuristic fallback when Ollama is unavailable,
- toxicity, anger, information-density, propaganda-risk, bot-signal, and coordination-risk estimates,
- reversible high-toxicity collapsing,
- content annotations with explanations,
- side panel metrics and settings,
- local score persistence through `chrome.storage.local`,
- local data clearing,
- raw visible text storage disabled by default.

Not yet complete:

- manual live-site verification,
- calibrated classifier integration,
- IndexedDB persistence,
- daily rollups and attention-time analytics,
- formal test suite,
- TypeScript/Vite migration decision.

## Load the Extension Locally

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

## Optional Ollama Setup

PCFA defaults to the Ollama model name `llama3.2`.

```sh
ollama serve
ollama pull llama3.2
```

If Ollama is unavailable, PCFA falls back to its built-in local heuristic scorer.

## Privacy Boundary

PCFA is designed around local-first constraints:

- It analyzes visible or user-opened content only.
- It does not auto-scroll.
- It does not auto-click.
- It does not expand hidden comments.
- It does not send feed content to cloud services.
- It does not create cross-user analytics.
- It stores scores locally.
- It does not store raw visible text unless the user enables that setting.

## Project Documents

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

