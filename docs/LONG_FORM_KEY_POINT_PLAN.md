# PCFA Long-Form Key Point Plan

## Purpose

PCFA should help users handle long posts and article-like feed items by extracting a single sentence that states the main point. The goal is not to replace the original text, but to provide a fast reading aid before the user decides whether to expand, read, or skip.

## Product Behavior

For long visible items, PCFA should show:

```text
Key point: <one concise sentence>
```

The key point should appear in the expanded PCFA details first. A later UI pass may optionally show it as a compact inline row when the item is long enough.

## Long-Form Detection

Treat an item as long-form when any condition is true:

- visible text length is at least 280 characters,
- visible text has at least 70 words,
- visible text spans at least 4 sentence-like segments,
- the platform item contains a link preview or article-style block and enough visible text.

Short posts should continue to use the current optional summary behavior.

## Output Contract

Extend model output with:

```json
{
  "keyPoint": "One concise sentence with the main point."
}
```

Rules:

- exactly one sentence,
- neutral wording,
- no political truth judgment,
- no new facts not present in visible text,
- no moralizing or moderation language,
- max 180 characters for Traditional Chinese, max 220 characters for English.

If the model does not return `keyPoint`, PCFA can use `summary` as fallback. If neither exists, omit the key point row.

## Prompt Update

Add an instruction:

```text
If the visible text is long, write keyPoint as one concise sentence that captures the main point. Do not add facts not present in the text.
```

Keep the existing JSON schema and add `keyPoint` as an optional field first. After validation is stable, make it required for model providers that support JSON schema.

## UI Placement

Expanded PCFA details should order information as:

1. Key point, if present.
2. Summary, if present and different from key point.
3. Explanations.
4. Fallback/debug notices.

The compact row should remain focused on scores, classification, confidence, and reanalyze control.

## Caching

Store `keyPoint` in the cached analysis result with the same item id as scores. Reuse it from browser extension storage and only regenerate it when:

- the user clicks reanalyze,
- model provider/model changes and cached result is no longer compatible,
- prompt/schema version changes.

Add `analysisSchemaVersion` to future cache entries before making key-point behavior required.

## Privacy

Key-point extraction uses the same privacy boundary as existing analysis:

- local Ollama or approved OpenAI-compatible endpoint only,
- no additional hidden content extraction,
- no upload to collection servers unless a separate opt-in feature later includes it,
- raw text storage remains controlled by the existing setting.

## Tests

Recommended tests:

- unit test `normalizeModelOutput` preserves `keyPoint`,
- unit test long-form detector threshold behavior,
- fixture with a long Threads post,
- fixture with a long X post,
- regression test that short posts do not require `keyPoint`,
- UI smoke check that expanded details show key point before summary.

## Implementation Phases

### Phase 1: Schema and Model Output

- Add `keyPoint` to `AnalysisResult`.
- Add optional `keyPoint` to JSON schema.
- Normalize and truncate `keyPoint`.

### Phase 2: UI

- Display key point in expanded PCFA details.
- Add i18n labels for `Key point` / `重點`.

### Phase 3: Detection and Prompt Tuning

- Add `isLongForm` helper.
- Ask for `keyPoint` only or especially when long-form detection is true.
- Tune prompt against X and Threads examples.

### Phase 4: Tests and Fixtures

- Add long-form fixtures.
- Add unit tests for normalization and long-form detection.
- Add manual validation notes for real X and Threads pages.
