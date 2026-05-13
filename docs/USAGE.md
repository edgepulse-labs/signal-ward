# PCFA Usage Guide

PCFA annotates visible X and Threads posts while you browse normally. It does not auto-scroll, auto-click, expand hidden content, or take platform actions.

## Start a Session

1. Load the extension locally.
2. Open X or Threads.
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

## Use the Side Panel

The side panel shows:

- analyzed item count,
- high-toxicity item count,
- average toxicity,
- average information density,
- recent signals with source and confidence,
- per-category score averages,
- privacy and compliance status.

## Adjust Settings

Available settings:

- Language: automatic browser-language selection, English, or Traditional Chinese.
- Ollama model: local model name sent to Ollama.
- Collapse threshold: score level where posts are collapsed.
- Use heuristic mode only: disables Ollama calls and uses local keyword heuristics.
- Store raw visible text locally: stores raw visible post text in local Chrome extension storage.
- Help publish anonymous statistics to a server: opt-in cloud collaboration setting, off by default.
- Enable collective defense suggestions: opt-in server-assisted early-folding setting, off by default.
- Retention days: prunes locally stored scores and daily rollups after the selected number of days.

Click "Save settings" after changing controls. Language changes apply immediately in the panel and are stored when settings are saved.

Cloud collaboration settings are disabled by default. They should only send or receive server data after the user explicitly enables them and a collection server contract is implemented.

## Read Daily Rollups

The Daily Rollup panel summarizes today's local activity, including analyzed item count, high-toxicity count, average emotional exposure estimate, average propaganda-risk estimate, and the split between Ollama and heuristic scoring.

## Check Ollama

In the side panel, click "Check" in the Ollama status row. PCFA calls the local Ollama tags endpoint and reports availability, latency, and model names when available.

If Ollama fails, analysis automatically falls back to local heuristic scoring unless heuristic-only mode is already enabled.

LM Studio and other OpenAI-compatible local servers are selectable from the Model provider control. Use a local base URL such as `http://localhost:1234/v1`. Only explicitly allowlisted remote OpenAI-compatible origins are accepted; other remote provider URLs are rejected to preserve the local-first privacy boundary.

## Clear Local Data

Click "Clear local scores" in the Privacy panel to reset stored scores and session metrics. Settings are preserved.

## Interpret Scores Carefully

Scores are local estimates, not moderation decisions or truth labels. PCFA does not decide whether a political claim is true, and it should not be used as the sole basis for judging a person or account.
