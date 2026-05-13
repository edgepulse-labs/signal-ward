# PCFA and EdgePulse Collector Cloud API Integration Plan

## Purpose

This document describes how PCFA can integrate with the sibling `../edgepulse-collector/` project to provide an opt-in statistics collection Cloud API for toxic-signal telemetry and future collective-defense judgments.

The integration must preserve PCFA's default local-first behavior:

- no statistics upload by default,
- no collective-defense lookup by default,
- no raw visible text upload by default,
- no server-assisted folding unless the user explicitly enables it.

## Existing Collector Contract

`../edgepulse-collector/` currently provides a generic feature-ingest API:

- `GET /healthz`
- `POST /v1/edgepulse/features`
- bearer token authentication,
- idempotent storage keyed by `(device_id, row_id)`,
- durable `last_row_id` acknowledgement.

The collector accepts long-format feature rows. PCFA can reuse this model by mapping social-feed analysis statistics into feature rows.

## PCFA Client Settings

Current PCFA settings already include:

- `shareStatsWithServer`: user opt-in for statistics publishing.
- `enableCollectiveDefense`: user opt-in for server-assisted collective defense.

Future settings needed before network upload:

- `collectorBaseUrl`: fixed or user-configured allowlisted collector URL.
- `collectorApiToken`: bearer token for ingest.
- `collectorDeviceId`: opaque, locally generated installation id.
- `collectorLastAckedRowId`: durable upload cursor.
- `collectorNextSequence`: upload batch sequence.

Secrets such as `collectorApiToken` must not be logged or included in exported diagnostics.

## Feature Row Mapping

Each analyzed item can be converted into multiple EdgePulse-style feature rows.

Suggested metrics:

| PCFA Signal            | Collector Metric                 |
|------------------------|----------------------------------|
| toxicity               | `pcfa.score.toxicity`            |
| anger                  | `pcfa.score.anger`               |
| fear                   | `pcfa.score.fear`                |
| hostility              | `pcfa.score.hostility`           |
| information density    | `pcfa.score.information_density` |
| evidence presence      | `pcfa.score.evidence_presence`   |
| propaganda risk        | `pcfa.score.propaganda_risk`     |
| bot signal             | `pcfa.score.bot_signal`          |
| coordination risk      | `pcfa.score.coordination_risk`   |
| content classification | `pcfa.classification.primary`    |
| analysis confidence    | `pcfa.analysis.confidence`       |

Recommended labels:

```text
platform=x,source=openai-compatible,class=propaganda,raw_text=false
```

For classification labels, represent categories as numeric feature values in the first MVP:

- `ad`: `1`
- `propaganda`: `2`
- `chitchat`: `3`
- `informational`: `4`
- `opinion`: `5`
- `unknown`: `0`

## Privacy-Preserving Payload Shape

PCFA should upload coarse statistics rather than raw post content.

Allowed fields:

- opaque `device_id`,
- monotonically increasing `row_id`,
- coarse time window,
- metric name,
- label string with low-cardinality labels,
- normalized numeric score,
- source type,
- content class,
- raw-text sharing flag.

Avoid by default:

- raw visible text,
- full post URL,
- account display name,
- raw author handle,
- browser profile identifier,
- API keys other than the collector bearer token in the header.

If repeat-spreader detection needs account identity, use a salted or server-defined hash of the visible author handle. Do not upload raw handles by default.

## Upload Algorithm

1. Confirm `shareStatsWithServer` is enabled.
2. Confirm `collectorBaseUrl` and `collectorApiToken` are configured.
3. Read locally queued feature rows with `row_id > collectorLastAckedRowId`.
4. Batch rows according to collector limits.
5. `POST /v1/edgepulse/features` with `Authorization: Bearer <token>`.
6. On `accepted: true`, advance `collectorLastAckedRowId` to `last_row_id`.
7. On timeout, network error, or 5xx, keep local rows and retry with backoff.
8. On 400, stop retrying the invalid payload and surface the error in diagnostics.
9. On 401, disable upload until the user fixes the token.

## Collective Defense Judgment API

The current collector API only documents feature ingest. PCFA collective defense needs an additional read path in a later collector version.

Proposed endpoint:

```http
GET /v1/pcfa/judgments?since=<version>
Authorization: Bearer <token>
```

Response:

```json
{
  "version": "2026-05-14T00:00:00Z",
  "generated_at": 1778299928,
  "entries": [
    {
      "subject_type": "author_hash",
      "subject": "sha256:...",
      "risk": "repeated-toxic-spreader",
      "confidence": 0.82,
      "recommended_action": "early-collapse",
      "expires_at": 1780978328
    }
  ]
}
```

This API is not implemented in PCFA yet and should remain disabled until the collector has a stable contract.

## Security Requirements

- Use HTTPS in production.
- Require bearer token authentication.
- Never log bearer tokens.
- Keep uploads opt-in.
- Keep raw text out of default payloads.
- Maintain idempotency with `(device_id, row_id)`.
- Use exponential backoff and jitter.
- Cap batch size and request body size.
- Keep server judgments expiring and reversible on the client.

## Implementation Phases

### Phase 1: Documentation and Settings

- Keep opt-in settings visible in PCFA.
- Document the EdgePulse Collector integration.
- Do not send data yet.

### Phase 2: Local Queue and Payload Builder

- Add a local statistics queue.
- Convert PCFA analysis results into EdgePulse feature rows.
- Add unit tests for payload minimization.
- Add `.env`-gated integration tests.

### Phase 3: Authenticated Upload

- Add collector URL and token settings.
- Upload only when `shareStatsWithServer` is enabled.
- Respect `last_row_id` acknowledgement.

### Phase 4: Collective Defense Read Path

- Add judgment snapshot endpoint to collector.
- Fetch only when `enableCollectiveDefense` is enabled.
- Apply early-collapse suggestions reversibly.

## Acceptance Criteria

- Default install performs no collector requests.
- Enabling statistics sharing is required before upload.
- Upload payload contains no raw text by default.
- Failed uploads do not lose local queued rows.
- Collector acknowledgement controls local cursor advancement.
- Collective defense suggestions cannot permanently hide content.
