# PCFA Usage Guide

PCFA annotates visible X, Threads, and Facebook posts while you browse normally. It does not auto-scroll, auto-click, expand hidden content, or take platform actions.

## Start a Session

1. Load the extension locally.
2. Open X, Threads, or Facebook.
3. Browse normally.
4. Open the PCFA side panel from the extension toolbar.

Visible posts are analyzed when they enter the viewport. Repeated DOM updates are deduplicated by a local stable item ID.

## Read Feed Annotations

Each analyzed post can show:

- Toxicity: estimated direct insult or aggressive wording level.
- Anger: estimated emotional intensity.
- Info: estimated information density and evidence signal.
- Confidence or Uncertain: model and extraction confidence.
- Explanation details: observable reasons for the estimate.

High-toxicity posts above the collapse threshold are collapsed non-destructively. Use "Show original" to restore a collapsed item.

Analyzed posts are cached in browser extension storage. PCFA reuses the cached result instead of calling the model again when the same post is seen later. Use the circular arrow button on the right side of the PCFA row to force a fresh analysis for that post.

## Use the Side Panel

The side panel shows:

- analyzed item count,
- high-toxicity item count,
- average toxicity,
- average information density,
- recent signals with source and confidence,
- per-category score averages,
- platform comparison for X, Threads, and Facebook toxicity / anger,
- privacy and compliance status.

## Adjust Settings

Available settings:

- Language: automatic browser-language selection, English, or Traditional Chinese.
- Model provider: WebLLM by default, with Ollama and OpenAI-compatible providers available as user-selected options.
- Model: WebLLM model id, Ollama model name, or OpenAI-compatible model id.
- WebLLM temperature / max tokens: browser-local inference parameters.
- Toxicity collapse threshold: toxicity score where posts are collapsed by default.
- Anger collapse threshold: anger score where posts are collapsed by default.
- Collapse confirmed ads by default: collapses posts that the platform already labels as ads.
- Use heuristic mode only: disables model calls and uses local keyword heuristics.
- Store raw visible text locally: stores raw visible post text in local Chrome extension storage.
- Store model debug traces locally: records recent raw model responses, parsed JSON, normalized scores, and fallback errors for debugging.
- Report wrong analysis: stores a local-only feedback report for the analyzed item.
- Help publish anonymous statistics to a server: opt-in cloud collaboration setting, off by default.
- Enable collective defense suggestions: opt-in server-assisted early-folding setting, off by default.
- Retention days: prunes locally stored scores and daily rollups after the selected number of days.

Click "Save settings" after changing controls. Language changes apply immediately in the panel and are stored when settings are saved.

Cloud collaboration settings are disabled by default. They should only send or receive server data after the user explicitly enables them and a collection server contract is implemented.

## Debug Model Responses

If WebLLM, OpenAI-compatible, or Ollama analysis appears to return all-zero scores, enable "Store model debug traces locally", save settings, reload the feed, and inspect the Model Debug panel.

The debug panel shows:

- raw model message content,
- parsed JSON when parsing succeeds,
- normalized scores used by PCFA,
- HTTP status and response shape,
- fallback errors when model output cannot be parsed.

Debug traces are stored only in local extension storage and can be cleared from the Model Debug panel.

## Read Daily Rollups

The Daily Rollup panel summarizes today's local activity, including analyzed item count, high-toxicity count, average emotional exposure estimate, average propaganda-risk estimate, and the split between WebLLM, Ollama, OpenAI-compatible, and heuristic scoring.

## Check Model Provider

In the side panel, click "Check" in the provider status row. For WebLLM, PCFA loads the browser-local model and reports readiness. For Ollama, PCFA calls the local tags endpoint and reports availability, latency, and model names when available.

If the selected provider fails, analysis automatically falls back to local heuristic scoring unless heuristic-only mode is already enabled.

LM Studio, custom cloud model gateways, and other OpenAI-compatible servers are selectable from the Model provider control. Use a local base URL such as `http://localhost:1234/v1` for local servers. Only explicitly allowlisted remote OpenAI-compatible origins are accepted; other remote provider URLs are rejected to preserve the local-first privacy boundary.

## Clear Local Data

Click "Clear local scores" in the Privacy panel to reset stored scores and session metrics. Settings are preserved.

## Interpret Scores Carefully

Scores are local estimates, not moderation decisions or truth labels. PCFA does not decide whether a political claim is true, and it should not be used as the sole basis for judging a person or account.
