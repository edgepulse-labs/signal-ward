# PCFA Unit Test Plan and Results

## Document Status

- Date: 2026-05-14
- Scope: Browser extension unit tests and lightweight local validation
- Related commands: `npm test`, `npm run check`
- Related files: `scripts/unit-tests.js`, `scripts/validate-fixtures.js`, `scripts/validate-extension.js`

## Goals

Unit tests should keep browser-extension logic reliable without requiring a live Chrome runtime for every change. The test suite should prioritize pure logic and small contracts that can run quickly in Node.js.

The current test plan focuses on:

- settings normalization,
- OpenAI-compatible base URL allowlist behavior,
- fixture structure for feed extraction examples,
- extension manifest and JavaScript syntax validation,
- formatting checks for tracked project files.

## Test Strategy

### Environment Variables

Development-only test settings can be documented in `.env.example` and copied to a local `.env` file when needed.

This is appropriate for optional tests that need machine-specific endpoints, local model ids, or API keys, with these constraints:

- pure unit tests must not require `.env`,
- `.env` must not be committed,
- tests that contact local or remote model providers must be explicit opt-in,
- `npm test` should stay fast, deterministic, and safe to run offline,
- real secrets must stay out of `.env.example`.

Current optional variables include:

- `PCFA_TEST_OPENAI_COMPATIBLE_BASE_URL`
- `PCFA_TEST_OPENAI_COMPATIBLE_API_KEY`
- `PCFA_TEST_OPENAI_COMPATIBLE_MODEL`
- `PCFA_TEST_ENABLE_REMOTE_OPENAI_COMPATIBLE`
- `PCFA_TEST_LOCAL_OPENAI_COMPATIBLE_BASE_URL`
- `PCFA_TEST_LOCAL_OPENAI_COMPATIBLE_MODEL`

### Unit Tests

Use Node.js tests for pure logic that does not need `chrome.*`, DOM APIs, or live network access.

Current unit-test target:

- `src/settings.js`

Covered behavior:

- accepts `http://localhost:1234/v1`,
- accepts `localhost:1234/v1` by adding the default `http://` protocol,
- accepts `127.0.0.1:1234/v1/` and removes trailing slash,
- accepts IPv6 localhost such as `http://[::1]:1234/v1`,
- accepts the approved remote OpenAI-compatible origin `https://ai.yihua.app`,
- rejects unapproved remote provider URLs such as `https://api.openai.com/v1`.

### Fixture Validation

Use fixture validation for stable, non-live checks of feed extraction examples.

Current fixture target:

- `fixtures/feed-extraction.json`

Covered behavior:

- fixture file includes examples for X and Threads,
- required fields are present,
- expected text, author handle, and URL fragments exist in fixture HTML,
- extraction-confidence expectations are normalized.

### Extension Validation

Use extension validation as a fast preflight before loading the extension manually.

Current validation target:

- `manifest.json`
- JavaScript syntax for extension and script files
- line endings, trailing whitespace, and indentation for tracked project files
- fixture validation as part of the full check

## Current Commands

Run all automated tests:

```sh
npm test
```

Run extension validation:

```sh
npm run check
```

The current `npm test` command runs:

```sh
node scripts/unit-tests.js && node scripts/validate-fixtures.js
```

## Latest Results

Recorded on 2026-05-14.

| Command         | Result | Notes                                                                   |
|-----------------|--------|-------------------------------------------------------------------------|
| `npm test`      | Passed | Unit tests passed; fixture examples passed structural validation.       |
| `npm run check` | Passed | Extension manifest, JavaScript syntax, formatting, and fixtures passed. |

## Known Gaps

- No browser-driven unit test harness yet for DOM annotation placement.
- No mocked `chrome.storage.local` tests yet for side panel save flows.
- No service-worker integration tests yet for `PCFA_UPDATE_SETTINGS` message handling.
- No live X / Threads selector validation in this report; those remain covered by real-world validation docs.
- No visual regression tests yet for collapsed and expanded annotation panels.

## Next Test Additions

Recommended next steps:

1. Add a small mocked Chrome storage harness for `updateSettings`.
2. Extract content-script DOM placement helpers into a testable module.
3. Add unit coverage for i18n fallback and Traditional Chinese selection.
4. Add regression tests for OpenAI-compatible provider settings and health-check URL construction.
5. Add a browser-level smoke test later with Playwright or Chrome extension test tooling.

## Pass Criteria

Before marking unit-test coverage as acceptable for MVP maintenance:

- `npm test` passes from a clean checkout.
- `npm run check` passes from a clean checkout.
- Settings normalization includes both accepted and rejected URL examples.
- Any new pure helper introduced for scoring, settings, i18n, or retention has at least one regression test.
- Live browser behavior is not marked complete from unit tests alone.
