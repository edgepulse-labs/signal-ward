# PCFA Personal Analysis Collection Plan

## Purpose

This plan describes an opt-in collection path where a user can publish analyzed posts and PCFA analysis results to a data collection server under their own identity, while keeping the records readable only by that same user.

This is distinct from public collective-defense telemetry. The primary use case is a private personal archive for review, export, research notes, and longitudinal self-audit.

## Default Behavior

- Off by default.
- No upload without explicit user opt-in.
- No upload without an authenticated user identity.
- No public read path.
- Local analysis continues to work if the server is unavailable.

## User Identity Model

The server should use an authenticated user account. Each uploaded record is owned by exactly one user.

Recommended identity properties:

- `owner_user_id`: stable server-side user id.
- `installation_id`: opaque browser-extension installation id.
- `device_label`: optional user-managed label.
- `created_by`: same as `owner_user_id` for MVP.

The extension should never infer the user's social-platform identity as the collection identity.

## Access Control

All personal analysis records must enforce owner-only reads by default.

Required server rules:

- Create: authenticated owner only.
- Read: record owner only.
- Update/delete: record owner only.
- Admin access: disabled by default or audited through an explicit break-glass path.
- Sharing: separate future feature requiring explicit per-record or per-collection grants.

The server must not expose a public feed of personal records.

## Upload Payload

Recommended MVP payload:

```json
{
  "schema_version": "pcfa.personal_analysis.v1",
  "client_record_id": "pcfa_...",
  "platform": "x",
  "post_url": "https://x.com/example/status/123",
  "observed_at": "2026-05-14T00:00:00.000Z",
  "analyzed_at": "2026-05-14T00:00:02.000Z",
  "source": "openai-compatible",
  "model": "model-id",
  "scores": {
    "toxicity": 0.12,
    "anger": 0.08,
    "fear": 0.0,
    "hostility": 0.05,
    "informationDensity": 0.4,
    "evidencePresence": 0.2,
    "propagandaRisk": 0.1,
    "botSignal": 0.0,
    "coordinationRisk": 0.0
  },
  "classification": {
    "primary": "opinion",
    "confidence": 0.72
  },
  "confidence": 0.68,
  "explanations": [],
  "summary": "Neutral one-sentence summary",
  "raw_text": null
}
```

Raw visible text should remain optional and separately controlled. The first implementation should upload `raw_text: null` unless the user explicitly enables raw-text upload.

## Local Queue

The extension should queue uploads locally before sending:

- `personalCollectionQueue`: pending records.
- `personalCollectionLastAck`: last server acknowledgement.
- `personalCollectionRetryAfter`: backoff timestamp.

Uploads should be idempotent by `client_record_id`.

## User Controls

Future settings should be separate from collective-defense settings:

- `enablePersonalCollection`: allow private upload of analyzed records.
- `personalCollectionBaseUrl`: allowlisted collection server URL.
- `personalCollectionToken`: bearer token or OAuth access token.
- `uploadRawTextToPersonalCollection`: separate high-friction opt-in.

The side panel should show:

- personal collection enabled/disabled,
- queued record count,
- last successful upload time,
- last upload error,
- clear local upload queue control.

## Privacy Requirements

- Personal collection must not imply public sharing.
- Raw text upload must be separate from score/result upload.
- Tokens must not be written to debug traces.
- Model debug traces must not be uploaded automatically.
- The user must be able to delete server-side personal records.
- Export should be available in a portable JSON format.

## Implementation Phases

### Phase 1: Plan Only

- Document owner-only collection model.
- Keep current cloud settings off by default.
- Do not send personal records yet.

### Phase 2: Payload Builder

- Build personal analysis payloads from cached scores.
- Add unit tests for payload minimization.
- Keep raw text disabled by default.

### Phase 3: Authenticated Upload

- Add personal collection endpoint settings.
- Add local upload queue and idempotent retry.
- Upload only after `enablePersonalCollection` is enabled.

### Phase 4: Private Readback

- Add server API for owner-only listing and retrieval.
- Add local UI for upload status and server readback diagnostics.
- Add delete/export flows.

## Acceptance Criteria

- Default install sends no personal collection requests.
- Only the authenticated owner can read uploaded records.
- Raw text is not uploaded without explicit opt-in.
- Upload failures do not block local analysis.
- Repeated uploads are idempotent.
- User can disable collection at any time.
