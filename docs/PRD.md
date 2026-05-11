# Personal Cognitive Firewall Assistant (PCFA)

## Product Requirements Document (PRD)

### Version

* v0.1 Draft

### Status

* Planning / Architecture Definition

### Author

* Pod-01 Nier <pod01.nier@gmail.com>

---

# 1. Product Vision

Personal Cognitive Firewall Assistant (PCFA) is a local-first AI-powered browser assistant designed to improve human information quality, reduce emotional pollution, and transform high-noise social media feeds into structured, analyzable, statistically meaningful information.

The system acts as:

* an information firewall,
* an attention protection layer,
* a cognitive observability platform,
* and a personal information intelligence assistant.

Rather than censoring content, PCFA:

* detects amplification patterns,
* identifies emotional manipulation,
* estimates account credibility risks,
* quantifies information quality,
* and reorganizes information into readable analytical summaries.

The primary design principle is:

> Reduce cognitive pollution without suppressing free access to information.

---

# 2. Core Philosophy

## PCFA DOES NOT

* determine political truth,
* censor opinions,
* enforce ideology,
* hide disagreement,
* or manipulate user beliefs.

## PCFA DOES

* reduce emotional amplification,
* expose statistical distortion,
* detect suspicious coordination,
* summarize discussion structures,
* and protect human attention from algorithmic exploitation.

---

# 3. Problem Statement

Modern social platforms optimize for:

* engagement,
* emotional activation,
* outrage,
* conflict,
* retention,
* and attention capture.

As a result:

* emotionally extreme content becomes overrepresented,
* hostile discourse appears statistically dominant,
* bot networks amplify narratives,
* and users lose the ability to perceive actual information distributions.

Users currently lack tooling for:

* measuring information quality,
* detecting emotional manipulation,
* estimating narrative amplification,
* understanding discussion topology,
* and preserving cognitive bandwidth.

---

# 4. Product Goals

## Primary Goals

### G1 — Reduce Cognitive Noise

Lower exposure to:

* emotionally manipulative content,
* repetitive outrage,
* low-information discussions,
* attack-driven engagement loops.

---

### G2 — Increase Information Density

Promote:

* evidence-backed discussion,
* structured argumentation,
* statistical representation,
* and meaningful summaries.

---

### G3 — Quantify Information Quality

Generate measurable indicators for:

* toxicity,
* emotional intensity,
* information density,
* bot likelihood,
* propaganda risk,
* coordination behavior.

---

### G4 — Build Personal Cognitive Analytics

Allow users to observe:

* attention usage,
* emotional exposure,
* feed composition,
* and information quality trends over time.

---

# 5. Product Scope

---

# Phase 1 — Local Browser Assistant (MVP)

## In Scope

* Browser Extension
* Local AI processing
* Social feed DOM analysis
* Emotional scoring
* Toxicity detection
* Feed summarization
* Statistical dashboards
* Local-only storage

## Out of Scope

* Cloud scraping
* Centralized user database
* Cross-user analytics
* Platform automation
* Auto-scrolling
* Background harvesting
* Political classification

---

# 6. Supported Platforms

Initial target platforms:

* Facebook
* Threads
* X
* Instagram

Future:

* Reddit
* YouTube comments
* Discord
* Hacker News
* LinkedIn

---

# 7. System Architecture

```text
Browser Feed
    ↓
Content Script
    ↓
DOM Extraction Layer
    ↓
Normalization Pipeline
    ↓
Local AI Analysis Engine
    ↓
Scoring + Classification
    ↓
Feed Transformation Layer
    ↓
Dashboard / Side Panel
```

---

# 8. Technical Architecture

---

# 8.1 Frontend

## Browser Extension

Recommended:

* Chrome Extension Manifest V3

Possible frameworks:

* React
* Plasmo
* Vite
* Tauri (future desktop app)

Modules:

* Content Script
* Side Panel UI
* Background Service Worker

---

# 8.2 Backend (Local)

## Local AI Runtime

Supported:

* Ollama
* llama.cpp
* LM Studio
* ONNX Runtime
* vLLM (future)

---

# 8.3 Local Database

Recommended:

* SQLite
* DuckDB

Stores:

* local scores
* account metadata
* session analytics
* historical trends

---

# 9. Core Functional Modules

---

# 9.1 Content Extraction Engine

## Responsibilities

* Extract visible feed content
* Extract comments
* Extract account metadata
* Detect visible viewport changes

## Constraints

ONLY process:

* currently visible DOM,
* user-opened content,
* user-visible comments.

DO NOT:

* auto-scroll,
* auto-click,
* auto-expand hidden content.

---

# 9.2 NLP Analysis Engine

## Analysis Categories

### Emotional Analysis

* anger
* fear
* hostility
* humiliation
* aggression

### Toxicity Analysis

* insult
* harassment
* hate speech
* dehumanization

### Information Analysis

* evidence presence
* source references
* argument structure
* factual density

### Propaganda Indicators

* slogan repetition
* emotional bait
* narrative amplification
* coordinated framing

---

# 9.3 Account Reputation Engine

## Metrics

```json
{
  "trust_score": 0.74,
  "toxicity_score": 0.18,
  "bot_probability": 0.23,
  "coordination_risk": 0.14,
  "originality_score": 0.81
}
```

## Features Used

* posting frequency
* repost ratio
* linguistic repetition
* synchronization timing
* account age
* engagement anomalies

---

# 9.4 Feed Transformation Engine

## Functions

* collapse toxic content
* summarize discussion
* remove emotional exaggeration
* convert threads into structured summaries

---

# 9.5 Cognitive Dashboard

## Daily Metrics

Examples:

| Metric                    | Value |
| ------------------------- | ----- |
| Total Posts Viewed        | 381   |
| High Toxicity Posts       | 74    |
| Rational Discussions      | 41    |
| Emotional Exposure Time   | 18m   |
| Information Density Score | 0.61  |

---

# 10. Scoring System

---

# 10.1 Post-Level Scores

```json
{
  "toxicity_score": 0.83,
  "anger_score": 0.72,
  "information_density": 0.19,
  "propaganda_risk": 0.41,
  "bot_signal": 0.27
}
```

---

# 10.2 Feed-Level Scores

Examples:

* feed toxicity ratio
* outrage amplification ratio
* information entropy
* discussion diversity score

---

# 11. User Experience Design

---

# 11.1 Non-Destructive Design

PCFA should:

* collapse,
* summarize,
* annotate,
* or visually de-emphasize content.

NOT:

* permanently hide,
* censor,
* or delete content.

---

# 11.2 Transparency

All scores should explain:

* WHY content received a score,
* WHAT signals contributed,
* and HOW confidence was estimated.

---

# 12. Privacy & Security

---

# Core Principle

## Local-first Architecture

All sensitive processing should remain local whenever possible.

---

# Data Handling Rules

## Allowed

* local analysis
* local storage
* local summarization

## Avoid

* centralized raw feed collection
* cloud storage of personal feeds
* third-party behavioral profiling

---

# 13. Compliance Constraints

---

# Allowed Model

```text
User browsing
→ visible content extraction
→ local analysis
→ local transformation
```

---

# Disallowed Model

```text
Automated scraping
→ auto scrolling
→ hidden data extraction
→ mass harvesting
```

---

# 14. Future Roadmap

---

# Phase 2

## Multi-session intelligence

* long-term feed trends
* narrative evolution analysis
* emotional exposure history

---

# Phase 3

## Cognitive Health Analytics

Track:

* outrage exposure,
* doomscrolling behavior,
* emotional overload patterns,
* attention fragmentation.

---

# Phase 4

## Edge AI Cognitive Observatory

Potential integration:

* OpenWrt
* Raspberry Pi
* local edge inference
* personal AI observability systems

---

# 15. Suggested AI Models

## NLP / LLM

* Qwen
* Gemma
* Llama
* Mistral

## Classification

* RoBERTa
* DeBERTa
* DistilBERT

---

# 16. Suggested Open Source Components

## Browser Extension

* Plasmo

## NLP

* HuggingFace Transformers
* ONNX Runtime

## Graph Analysis

* Neo4j
* graph-tool
* NetworkX

## Local Storage

* SQLite
* DuckDB

---

# 17. Success Metrics

## Technical

* local inference latency
* extension memory usage
* false positive rate
* summarization quality

## User Metrics

* reduced emotional exposure
* increased high-information reading ratio
* reduced doomscrolling duration
* improved perceived information quality

---

# 18. Ethical Principles

PCFA must remain:

* politically neutral,
* transparent,
* user-controlled,
* explainable,
* and privacy-preserving.

The system should assist users in understanding information environments, not deciding beliefs on their behalf.

---

# 19. Initial MVP Deliverables

## MVP v0.1

### Features

* DOM extraction
* visible post analysis
* toxicity scoring
* side panel dashboard
* post collapsing
* structured summaries

### Platforms

* X
* Threads

### Runtime

* Chrome Extension
* Ollama local backend

---

# 20. Long-Term Vision

PCFA aims to become:

> A personal cognitive operating layer for the AI era.

Future information systems may require:

* cognitive firewalls,
* attention observability,
* narrative analytics,
* and emotional pollution reduction

as fundamental digital infrastructure.
