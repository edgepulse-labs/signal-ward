# PCFA MVP Runbook

## Current MVP

This repository now contains a dependency-free Chrome Manifest V3 extension prototype.

Implemented:

- visible post extraction for X and Threads,
- analysis through Ollama, a local OpenAI-compatible server, or an approved OpenAI-compatible endpoint,
- heuristic fallback when Ollama is unavailable,
- local score persistence through `chrome.storage.local`,
- local daily rollups and retention settings,
- content annotations,
- reversible high-toxicity collapsing,
- side panel metrics and controls,
- local data clearing.
- opt-in cloud collaboration settings for future statistics sharing and collective defense, disabled by default.

## Load Locally

Run the local validation command before loading the unpacked extension:

```sh
npm run build
```

1. Open Chrome or Chromium.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Choose "Load unpacked".
5. Select the repository root: `/home/nier/workspace/signal-ward`.
6. Open X or Threads and browse normally.
7. Open the PCFA side panel from the extension toolbar.

## Optional Ollama Setup

PCFA defaults to the Ollama model name `llama3.2`.

Run a local model before browsing:

```sh
ollama serve
ollama pull llama3.2
```

If Ollama is unavailable, the MVP uses the built-in local heuristic scorer.

## Privacy Notes

- The content script only scans visible viewport candidates.
- It does not auto-scroll, auto-click, or expand hidden content.
- Raw visible text is not stored by default.
- Scores and minimal item metadata are stored locally in Chrome extension storage.
- Cloud statistics sharing and collective defense are disabled by default.
- The side panel includes a local data clearing control.

## Known MVP Limits

- Platform DOM selectors are best-effort and may need adjustment as X and Threads change.
- The heuristic scorer is intentionally conservative and is not a replacement for calibrated classifiers.
- Side panel metrics count newly analyzed visible items; they are not yet full attention-time analytics.
- IndexedDB is not yet used; this MVP uses `chrome.storage.local` for simpler extension-only persistence.

## Related Guides

- [Installation and Setup](INSTALLATION.md)
- [Usage Guide](USAGE.md)
- [Real-World Validation Prep](REAL_WORLD_VALIDATION.md)
- [Collective Defense Plan](COLLECTIVE_DEFENSE_PLAN.md)
- [EdgePulse Collector Integration](EDGEPULSE_COLLECTOR_INTEGRATION.md)
- [Icon Generation Prompt](ICON_GENERATION_PROMPT.md)
- [安裝與設定](INSTALLATION.zh-TW.md)
- [使用指南](USAGE.zh-TW.md)
- [真實環境驗證準備](REAL_WORLD_VALIDATION.zh-TW.md)
