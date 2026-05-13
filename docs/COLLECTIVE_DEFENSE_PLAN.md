# PCFA Collective Defense and Statistics Sharing Plan

## Purpose

Collective defense is an optional cloud-assisted layer for users who explicitly want to contribute toxic-signal statistics and receive early-collapse suggestions for accounts or posts that have already been identified as repeatedly toxic, coordinated, or bot-like.

All cloud-assisted behavior must be off by default. Nothing should be sent to a collection server unless the user enables the relevant setting.

## User Controls

MVP settings:

- `shareStatsWithServer`: allow the extension to publish aggregated or minimized statistics to a collection server.
- `enableCollectiveDefense`: allow the extension to use server-side collective defense judgments for early folding suggestions.

Defaults:

- `shareStatsWithServer`: `false`
- `enableCollectiveDefense`: `false`

Users must be able to disable either setting at any time. Disabling the setting must stop future cloud-assisted behavior.

## Data Sharing Policy

Statistics sharing should use data minimization.

Allowed by default after opt-in:

- hashed item id,
- platform,
- normalized score bands,
- classification label,
- source type such as heuristic, Ollama, or OpenAI-compatible,
- timestamp rounded to a coarse time bucket,
- author handle hash when needed for repeat-spreader detection.

Not allowed by default:

- raw visible text,
- full URLs,
- API keys,
- user account identifiers,
- browser profile identifiers,
- private browsing history,
- hidden comments or expanded content.

Raw text sharing must require a separate explicit setting if it is ever added.

## Collection Server Role

The collection server may:

- aggregate toxic-signal statistics,
- detect repeated toxic spreader patterns,
- detect likely coordinated or bot-like accounts,
- publish account or post risk recommendations,
- provide signed judgment snapshots to clients.

The collection server must not:

- classify political truth,
- expose individual user browsing behavior,
- require raw text for the default mode,
- create public accusations without review and appeal workflows.

## Early Folding Behavior

When `enableCollectiveDefense` is enabled, the extension may use server judgments to fold content earlier than local-only scoring would.

Candidate early-fold rules:

- account has repeated high-toxicity signals across many opt-in clients,
- account is confirmed as a cognitive-operation bot account,
- post hash appears in a confirmed toxic or coordinated campaign list,
- local score is borderline but server risk is high.

Early folding must remain reversible. The user should always be able to open the original item.

## Suggested Server Judgment Shape

```json
{
  "version": "2026-05-14",
  "generatedAt": "2026-05-14T00:00:00Z",
  "entries": [
    {
      "subjectType": "authorHash",
      "subject": "sha256:...",
      "risk": "repeated-toxic-spreader",
      "confidence": 0.82,
      "recommendedAction": "early-collapse",
      "expiresAt": "2026-06-14T00:00:00Z"
    }
  ],
  "signature": "..."
}
```

## Client Safeguards

The extension should:

- keep cloud features off by default,
- show cloud collaboration status in the privacy panel,
- make server-suggested folds visually distinct from local-only folds,
- store only the minimum server cache needed for operation,
- expire server judgments,
- continue local analysis if the server is unavailable,
- never block, delete, report, or interact with platform content automatically.

## Implementation Phases

### Phase 1: Settings and Documentation

- Add opt-in settings.
- Display cloud collaboration status.
- Document data boundaries and planned server behavior.
- Do not send data yet without a concrete server contract.

### Phase 2: Statistics Publishing

- Add a fixed allowlisted collection endpoint.
- Send minimized statistics only after `shareStatsWithServer` is enabled.
- Add unit tests for payload minimization.
- Add integration tests gated by environment variables.

### Phase 3: Judgment Fetching

- Fetch signed server judgment snapshots only after `enableCollectiveDefense` is enabled.
- Cache judgments locally with expiration.
- Apply early-fold suggestions reversibly.

### Phase 4: Review and Governance

- Add server-side review workflow for bot or campaign labels.
- Add transparency logs.
- Add appeal and correction mechanisms for misclassified accounts.

## Acceptance Criteria

- Cloud settings default to off.
- The privacy panel clearly indicates whether cloud collaboration is enabled.
- No raw text is sent by default.
- No server request happens unless the user explicitly enables the relevant setting.
- Early folds remain reversible.
- Server judgments expire and can be ignored if stale.
