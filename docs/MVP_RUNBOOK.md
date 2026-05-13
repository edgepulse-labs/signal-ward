# PCFA MVP Runbook

## Current MVP

This repository now contains a dependency-free Chrome Manifest V3 extension prototype.

Implemented:

- visible post extraction for X and Threads,
- local analysis through Ollama at `http://localhost:11434`,
- heuristic fallback when Ollama is unavailable,
- local score persistence through `chrome.storage.local`,
- content annotations,
- reversible high-toxicity collapsing,
- side panel metrics and controls,
- local data clearing.

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
- The side panel includes a local data clearing control.

## Known MVP Limits

- Platform DOM selectors are best-effort and may need adjustment as X and Threads change.
- The heuristic scorer is intentionally conservative and is not a replacement for calibrated classifiers.
- Side panel metrics count newly analyzed visible items; they are not yet full attention-time analytics.
- IndexedDB is not yet used; this MVP uses `chrome.storage.local` for simpler extension-only persistence.

## Related Guides

- [Installation and Setup](INSTALLATION.md)
- [Usage Guide](USAGE.md)
- [安裝與設定](INSTALLATION.zh-TW.md)
- [使用指南](USAGE.zh-TW.md)
