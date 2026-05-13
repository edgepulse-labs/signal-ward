# PCFA Focus and Information Classification Plan

## Purpose

PCFA should help users understand what kind of visible feed item they are looking at and how it may affect focus or information intake. Classification is not moderation, fact-checking, or ideology detection. It is a local estimate for personal attention management.

## MVP Content Labels

The first supported content labels are:

| Label           | Meaning                                                                                         | Typical Signals                                                                                | Suggested UI                    |
|-----------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|---------------------------------|
| `ad`            | Commercial promotion or conversion-oriented content.                                            | Discount language, purchase prompts, promo codes, sponsored wording, product trial copy.       | Show as "Ad / 廣告".            |
| `propaganda`    | Persuasive or mobilizing framing that may amplify emotion or group alignment.                   | Slogans, urgent share prompts, enemy framing, low-evidence certainty, repeated talking points. | Show as "Propaganda / 宣傳".    |
| `chitchat`      | Casual, low-stakes social conversation.                                                         | Greetings, jokes, personal small talk, short casual reactions, low evidence needs.             | Show as "Chitchat / 閒聊".      |
| `informational` | Content primarily offering facts, updates, sources, or structured explanation.                  | Links, data, reports, direct observations, evidence language, neutral summaries.               | Show as "Informational / 資訊". |
| `opinion`       | Personal interpretation, preference, or argument without being primarily casual or promotional. | First-person stance, value judgment, interpretation, recommendation without sales framing.     | Show as "Opinion / 意見".       |
| `unknown`       | Not enough observable evidence to classify.                                                     | Very short text, mixed signals, extraction uncertainty.                                        | Show as "Unknown / 未知".       |

For MVP, the UI only needs one primary label. Later versions can add secondary labels.

## Focus Ratings

Focus ratings estimate how much attention pressure a visible item may create.

| Rating             | Range   | Meaning                                                                      |
|--------------------|---------|------------------------------------------------------------------------------|
| `focusCost`        | 0.0-1.0 | How likely the item is to pull attention away from the user's original task. |
| `emotionalLoad`    | 0.0-1.0 | How emotionally activating the item appears to be.                           |
| `interruptiveness` | 0.0-1.0 | How much the item pushes immediate reaction, sharing, buying, or arguing.    |
| `recoveryCost`     | 0.0-1.0 | How hard it may be to return to the previous task after engaging.            |

Initial mapping:

- `ad`: medium focus cost, medium interruptiveness, low-to-medium information value.
- `propaganda`: high emotional load and high recovery cost.
- `chitchat`: low-to-medium focus cost, usually low recovery cost.
- `informational`: variable focus cost, but potentially high information value.
- `opinion`: medium focus cost, variable emotional load.

## Information Intake Ratings

Information ratings estimate whether the item helps the user learn, verify, or decide.

| Rating             | Range   | Meaning                                                                          |
|--------------------|---------|----------------------------------------------------------------------------------|
| `informationValue` | 0.0-1.0 | How much usable information the item appears to provide.                         |
| `evidenceStrength` | 0.0-1.0 | How much visible support, sourcing, or concrete observation appears in the item. |
| `novelty`          | 0.0-1.0 | Whether the item adds new context rather than repeating a slogan or meme.        |
| `actionability`    | 0.0-1.0 | Whether the item gives a clear, useful next step without coercive pressure.      |
| `manipulationRisk` | 0.0-1.0 | Risk that the item pushes reaction more than understanding.                      |

These ratings should remain explanations, not judgments of truth.

## MVP Implementation Notes

Current implementation target:

- Add `classification.primary` to analysis results.
- Supported values: `ad`, `propaganda`, `chitchat`, `informational`, `opinion`, `unknown`.
- Add `classification.confidence` for label confidence.
- Show the primary label in feed annotations and recent signals.
- Keep `propagandaRisk` as a numeric score separate from the `propaganda` content label.

Model prompt requirements:

- Return the primary content type in JSON.
- Do not classify ideology.
- Do not decide political truth.
- Explain only observable signals.

Heuristic fallback requirements:

- Detect obvious ad language.
- Detect slogan-like propaganda signals.
- Detect casual chitchat when content is short and low-evidence.
- Prefer `unknown` when confidence is low.

## Future Labels

Possible later labels:

- `newsUpdate`: event update or breaking news.
- `howTo`: instructional content.
- `personalStory`: first-person experience.
- `question`: direct question or request for help.
- `entertainment`: humor, meme, or leisure content.
- `communityNotice`: local or group announcement.
- `scamRisk`: suspicious promotion, impersonation, or coercive transaction framing.

Do not add too many labels before live validation. A small, stable set is easier to calibrate and explain.

## Acceptance Criteria

- The extension can label visible items as ad, propaganda, or chitchat.
- The label is visible in the compact annotation row.
- The label appears in side panel recent signals.
- The model and heuristic fallback use the same label vocabulary.
- Low-confidence or mixed items can fall back to `unknown`.
- Unit or fixture tests cover at least the label normalization path before expanding the label set.
