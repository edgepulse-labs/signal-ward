# ADR 0001: Local-First Data Handling

## Status

Accepted for MVP Phase 1.

## Context

PCFA analyzes social feed content that is visible in the user's browser. The MVP must preserve user trust by avoiding cloud analysis, hidden scraping, automated platform actions, or centralized analytics.

## Decision

- The extension analyzes only DOM content that is currently visible to the user.
- Raw visible text is not stored by default.
- Scores, explanations, settings, and session metrics are stored in `chrome.storage.local`.
- Ollama calls are restricted to `localhost` / `127.0.0.1`.
- If Ollama is unavailable or returns malformed output after one retry, analysis falls back to local heuristic scoring.
- The side panel must show whether heuristic mode or Ollama produced local scores and expose local data clearing.

## Consequences

This keeps the MVP dependency-light and privacy-preserving, but it limits cross-device history, calibrated model quality, and long-term analytics until a later IndexedDB and retention design is implemented.
