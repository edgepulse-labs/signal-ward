# Personal Cognitive Firewall Assistant（PCFA）

## 產品需求文件（PRD）

### 版本

* v0.1 草案

### 狀態

* 規劃中 / 架構定義

### 作者

* Pod-01 Nier <pod01.nier@gmail.com>

---

# 1. 產品願景

Personal Cognitive Firewall Assistant（PCFA）是一個 local-first、由 AI 驅動的瀏覽器助理，旨在提升人類接收資訊的品質、降低情緒污染，並將高噪音的社群媒體 feed 轉換為結構化、可分析、具統計意義的資訊。

此系統扮演以下角色：

* 資訊防火牆，
* 注意力保護層，
* 認知可觀測性平台，
* 以及個人資訊智慧助理。

PCFA 並非審查內容，而是：

* 偵測放大模式，
* 識別情緒操弄，
* 估計帳號可信度風險，
* 量化資訊品質，
* 並將資訊重新組織為可閱讀的分析摘要。

主要設計原則是：

> 在不壓制自由取得資訊的前提下，降低認知污染。

---

# 2. 核心哲學

## PCFA 不會

* 判定政治真相，
* 審查觀點，
* 強制推行意識形態，
* 隱藏不同意見，
* 或操弄使用者信念。

## PCFA 會

* 降低情緒放大，
* 揭露統計扭曲，
* 偵測可疑協同，
* 摘要討論結構，
* 並保護人類注意力免於演算法剝削。

---

# 3. 問題陳述

現代社群平台針對以下目標最佳化：

* 互動，
* 情緒激活，
* 憤怒與激憤，
* 衝突，
* 留存，
* 以及注意力捕獲。

因此：

* 情緒極端內容被過度呈現，
* 敵意言論看似在統計上占主導地位，
* bot 網路放大敘事，
* 而使用者失去感知真實資訊分布的能力。

使用者目前缺乏工具來：

* 衡量資訊品質，
* 偵測情緒操弄，
* 估計敘事放大，
* 理解討論拓撲，
* 並保存認知頻寬。

---

# 4. 產品目標

## 主要目標

### G1 — 降低認知噪音

降低接觸以下內容的程度：

* 情緒操弄內容，
* 重複性的憤怒內容，
* 低資訊量討論，
* 以攻擊驅動的互動循環。

---

### G2 — 提升資訊密度

促進：

* 有證據支持的討論，
* 結構化論證，
* 統計代表性，
* 以及有意義的摘要。

---

### G3 — 量化資訊品質

產生可量測指標，用於：

* 毒性，
* 情緒強度，
* 資訊密度，
* bot 可能性，
* 宣傳風險，
* 協同行為。

---

### G4 — 建立個人認知分析

允許使用者觀察：

* 注意力使用情形，
* 情緒暴露，
* feed 組成，
* 以及資訊品質隨時間的趨勢。

---

# 5. 產品範圍

---

# Phase 1 — 本機瀏覽器助理（MVP）

## 範圍內

* 瀏覽器擴充功能
* 本機 AI 處理
* 社群 feed DOM 分析
* 情緒評分
* 毒性偵測
* Feed 摘要
* 統計 dashboard
* 僅限本機儲存

## 範圍外

* 雲端爬取
* 集中式使用者資料庫
* 跨使用者分析
* 平台自動化
* 自動捲動
* 背景收集
* 政治分類

---

# 6. 支援平台

初始目標平台：

* Facebook
* Threads
* X
* Instagram

未來：

* Reddit
* YouTube comments
* Discord
* Hacker News
* LinkedIn

---

# 7. 系統架構

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

# 8. 技術架構

---

# 8.1 Frontend

## 瀏覽器擴充功能

建議：

* Chrome Extension Manifest V3

可能的 frameworks：

* React
* Plasmo
* Vite
* Tauri（未來 desktop app）

模組：

* Content Script
* Side Panel UI
* Background Service Worker

---

# 8.2 Backend（本機）

## 本機 AI Runtime

支援：

* Ollama
* llama.cpp
* LM Studio
* ONNX Runtime
* vLLM（未來）

---

# 8.3 本機資料庫

建議：

* SQLite
* DuckDB

儲存：

* 本機分數
* 帳號 metadata
* session analytics
* 歷史趨勢

---

# 9. 核心功能模組

---

# 9.1 內容擷取引擎

## 職責

* 擷取可見 feed 內容
* 擷取留言
* 擷取帳號 metadata
* 偵測可見 viewport 變化

## 限制

只處理：

* 目前可見 DOM，
* 使用者開啟的內容，
* 使用者可見的留言。

不要：

* 自動捲動，
* 自動點擊，
* 自動展開隱藏內容。

---

# 9.2 NLP 分析引擎

## 分析類別

### 情緒分析

* 憤怒
* 恐懼
* 敵意
* 羞辱
* 攻擊性

### 毒性分析

* 侮辱
* 騷擾
* 仇恨言論
* 去人性化

### 資訊分析

* 證據存在性
* 來源引用
* 論證結構
* 事實密度

### 宣傳指標

* 口號重複
* 情緒誘餌
* 敘事放大
* 協同框架

---

# 9.3 帳號聲譽引擎

## 指標

```json
{
  "trust_score": 0.74,
  "toxicity_score": 0.18,
  "bot_probability": 0.23,
  "coordination_risk": 0.14,
  "originality_score": 0.81
}
```

## 使用特徵

* 發文頻率
* 轉貼比例
* 語言重複性
* 同步時間
* 帳號年齡
* 互動異常

---

# 9.4 Feed 轉換引擎

## 功能

* 摺疊有毒內容
* 摘要討論
* 移除情緒誇張
* 將 threads 轉換為結構化摘要

---

# 9.5 認知 Dashboard

## 每日指標

範例：

| 指標                    | 數值 |
| ----------------------- | ---- |
| 已檢視貼文總數          | 381  |
| 高毒性貼文              | 74   |
| 理性討論                | 41   |
| 情緒暴露時間            | 18m  |
| 資訊密度分數            | 0.61 |

---

# 10. 評分系統

---

# 10.1 貼文層級分數

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

# 10.2 Feed 層級分數

範例：

* feed toxicity ratio
* outrage amplification ratio
* information entropy
* discussion diversity score

---

# 11. 使用者體驗設計

---

# 11.1 非破壞式設計

PCFA 應該：

* 摺疊，
* 摘要，
* 標註，
* 或在視覺上降低內容權重。

不應該：

* 永久隱藏，
* 審查，
* 或刪除內容。

---

# 11.2 透明性

所有分數都應解釋：

* 內容為何得到該分數，
* 哪些訊號造成影響，
* 以及信心值如何估計。

---

# 12. 隱私與安全

---

# 核心原則

## Local-first 架構

所有敏感處理都應盡可能留在本機。

---

# 資料處理規則

## 允許

* 本機分析
* 本機儲存
* 本機摘要

## 避免

* 集中化原始 feed 收集
* 個人 feed 的雲端儲存
* 第三方行為 profiling

---

# 13. 合規限制

---

# 允許模型

```text
User browsing
→ visible content extraction
→ local analysis
→ local transformation
```

---

# 不允許模型

```text
Automated scraping
→ auto scrolling
→ hidden data extraction
→ mass harvesting
```

---

# 14. 未來路線圖

---

# Phase 2

## Multi-session intelligence

* 長期 feed 趨勢
* 敘事演化分析
* 情緒暴露歷史

---

# Phase 3

## 認知健康分析

追蹤：

* 憤怒暴露，
* doomscrolling 行為，
* 情緒過載模式，
* 注意力碎片化。

---

# Phase 4

## Edge AI Cognitive Observatory

潛在整合：

* OpenWrt
* Raspberry Pi
* 本機 edge inference
* 個人 AI observability systems

---

# 15. 建議 AI 模型

## NLP / LLM

* Qwen
* Gemma
* Llama
* Mistral

## 分類

* RoBERTa
* DeBERTa
* DistilBERT

---

# 16. 建議開源元件

## 瀏覽器擴充功能

* Plasmo

## NLP

* HuggingFace Transformers
* ONNX Runtime

## 圖分析

* Neo4j
* graph-tool
* NetworkX

## 本機儲存

* SQLite
* DuckDB

---

# 17. 成功指標

## 技術

* 本機 inference latency
* extension memory usage
* false positive rate
* summarization quality

## 使用者指標

* 降低情緒暴露
* 提高高資訊量閱讀比例
* 降低 doomscrolling 時長
* 改善感知資訊品質

---

# 18. 倫理原則

PCFA 必須保持：

* 政治中立，
* 透明，
* 使用者可控制，
* 可解釋，
* 並保護隱私。

系統應協助使用者理解資訊環境，而不是代替使用者決定信念。

---

# 19. 初始 MVP 交付項目

## MVP v0.1

### 功能

* DOM 擷取
* 可見貼文分析
* 毒性評分
* 側邊面板 dashboard
* 貼文摺疊
* 結構化摘要

### 平台

* X
* Threads

### Runtime

* Chrome Extension
* Ollama local backend

---

# 20. 長期願景

PCFA 旨在成為：

> AI 時代的個人認知作業層。

未來資訊系統可能需要：

* 認知防火牆，
* 注意力可觀測性，
* 敘事分析，
* 以及情緒污染降低

作為基礎數位設施。

