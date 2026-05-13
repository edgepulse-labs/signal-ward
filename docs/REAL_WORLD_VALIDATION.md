# PCFA Real-World Validation Prep

Use this guide before marking live-environment checklist items as complete in `docs/EXECUTION_PLAN.md`.

## Scope

Real-world validation covers:

- loading the unpacked extension in Chrome / Chromium,
- verifying visible post extraction on live X,
- verifying visible post extraction on live Threads,
- checking heuristic-only behavior,
- checking Ollama-backed analysis with a real local model,
- confirming that privacy constraints still hold while browsing.

Do not mark live validation tasks complete from fixture results alone.

## Test Profile

Use a separate Chrome / Chromium profile when possible.

Recommended profile setup:

- Sign in only to the accounts needed for X and Threads validation.
- Disable unrelated extensions.
- Keep Developer mode enabled at `chrome://extensions`.
- Keep Chrome DevTools available for the extension service worker and the tested tab.
- Avoid using personal primary browsing sessions for early MVP validation.

## Preflight Checklist

From the repository root:

```sh
npm run build
npm test
```

Confirm:

- the extension validates locally,
- fixtures pass structural validation,
- there are no Chrome extension errors after loading,
- `manifest.json` host permissions are limited to X, Threads, and local Ollama.

## Load the Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the repository root:

```text
/home/nier/workspace/signal-ward
```

5. Open the extension details page.
6. Confirm no load errors are shown.
7. Open the service worker inspector if debugging is needed.

After code changes, click reload on the extension card and refresh any open X / Threads tabs.

## Ollama Prep

Ollama validation is optional for heuristic-only testing but required before marking "Ollama analysis has been verified with a real local model" complete.

Start Ollama and pull the configured model:

```sh
ollama serve
ollama pull llama3.2
```

Check the local endpoint:

```sh
curl http://localhost:11434/api/tags
```

In the PCFA side panel:

1. Set Ollama model to `llama3.2`, or another locally installed model.
2. Turn heuristic-only mode off.
3. Click "Check" in the Ollama status row.
4. Confirm that model names and latency appear.

## LM Studio / OpenAI-Compatible Prep

LM Studio can run a local server with OpenAI-compatible endpoints. Its common local base URL is:

```text
http://localhost:1234/v1
```

Start the LM Studio server from the Developer tab, or run:

```sh
lms server start
```

Verify the server:

```sh
curl http://localhost:1234/v1/models
```

Important MVP limitation: this extension does not yet send analysis requests to OpenAI-compatible endpoints. It currently sends model-backed requests only to Ollama's `/api/generate` endpoint and checks health through Ollama's `/api/tags` endpoint.

Use this section to prepare and record LM Studio readiness, but do not mark Ollama-backed validation complete from LM Studio alone unless the extension has first gained an OpenAI-compatible provider setting.

When that provider exists, validate these settings:

- Provider: `openai-compatible`
- Base URL: `http://localhost:1234/v1`, or your local provider URL
- Model: the model identifier from `/v1/models`
- API key: local placeholder such as `lm-studio`, unless the server requires a real key
- Endpoint shape: `/v1/chat/completions` or `/v1/responses`

## X Validation

Prepare:

- Open `https://x.com`.
- Use a normal feed page with several visible posts.
- Keep auto-scrolling off; only manual browsing is allowed.

Validate:

1. Refresh the X tab after loading or reloading the extension.
2. Confirm the "PCFA local" marker appears.
3. Confirm visible posts receive PCFA annotation panels.
4. Confirm annotations include toxicity, anger, info, confidence, and explanation details.
5. Confirm repeated DOM updates do not create multiple PCFA panels on the same visible post.
6. Confirm high-toxicity examples collapse only when above the configured threshold.
7. Click "Show original" on a collapsed item and confirm that single item remains expanded.
8. Open the side panel and confirm analyzed counts and recent signals update.

Record:

- date and time,
- browser and version,
- tested URL shape,
- whether selectors found visible posts reliably,
- any missing author, permalink, or text extraction issues.

## Threads Validation

Prepare:

- Open `https://www.threads.net`.
- Use a page with several visible posts.
- Keep validation to visible content only.

Validate:

1. Refresh the Threads tab after loading or reloading the extension.
2. Confirm the "PCFA local" marker appears.
3. Confirm visible posts receive PCFA annotation panels.
4. Confirm post text is not polluted by unrelated controls where possible.
5. Confirm author and permalink extraction when visible.
6. Confirm side panel counts and recent signals update.
7. Confirm X behavior still works after Threads testing.

Record:

- date and time,
- browser and version,
- tested URL shape,
- selector reliability,
- author/permalink gaps,
- examples where Threads DOM changes caused missed or noisy extraction.

## Heuristic Fallback Validation

Use one of these paths:

- Turn on "Use heuristic mode only" in the side panel.
- Stop Ollama while heuristic-only mode is off.

Validate:

1. Browse visible X or Threads posts.
2. Confirm annotations still appear.
3. Confirm recent signals show `heuristic` as the source.
4. Confirm local inference failures do not break browsing.

## Privacy Validation

During live testing, confirm:

- The extension does not auto-scroll.
- The extension does not auto-click.
- The extension does not expand hidden comments.
- Raw visible text storage remains off unless deliberately enabled.
- The side panel privacy status says raw visible text is not stored by default.
- Network activity for analysis goes only to `localhost` / `127.0.0.1` when Ollama is used.
- No cloud analytics or centralized user database calls are introduced.

Use Chrome DevTools Network tab on the tested page and the extension service worker if a manual privacy review is needed.

## Data Reset

Before and after validation runs:

1. Open the PCFA side panel.
2. Click "Clear local scores".
3. Confirm analyzed counts reset.

For a clean browser-level reset, remove and reload the unpacked extension from `chrome://extensions`.

## Suggested Validation Log

Use this template in a local note or issue:

```text
Date:
Tester:
Browser/version:
Extension commit:
Ollama model:
OpenAI-compatible base URL:
OpenAI-compatible model:

Chrome load:
X extraction:
Threads extraction:
Ollama available:
Ollama unavailable / heuristic fallback:
Privacy constraints:

Observed issues:
Screenshots or notes:
Checklist items ready to mark complete:
```

Only update `docs/EXECUTION_PLAN.md` and `docs/EXECUTION_PLAN.zh-TW.md` after the matching live checks have actually passed.
