# PCFA 執行規劃

## 文件狀態

- 版本：v0.1 草案
- 來源：`docs/PRD.md`
- 範圍：MVP Phase 1
- 目標平台：X 與 Threads
- 目標執行環境：Chrome Extension Manifest V3 搭配本機 Ollama 後端

---

## 1. 執行目標

本文件將 Personal Cognitive Firewall Assistant（PCFA）的 PRD 轉化為第一階段本機瀏覽器助理 MVP 的實作路徑。

MVP 必須證明 PCFA 可以：

- 只擷取使用者可見的社群動態內容，
- 在本機分析可見貼文，
- 對認知與資訊品質訊號進行評分，
- 以非破壞方式轉換高噪音動態項目，
- 在側邊面板中呈現透明的解釋，
- 並在不集中化使用者資料的前提下儲存本機分析資料。

目標不是一次完成所有未來的認知分析功能，而是驗證 local-first 架構、瀏覽器擴充功能流程、評分管線，以及使用者體驗契約。

---

## 2. MVP 產品邊界

### 範圍內

- Chrome Extension Manifest V3
- X 與 Threads 的 content scripts
- 可見 DOM 擷取
- 貼文正規化
- 透過 Ollama 進行本機分析
- 毒性、情緒、資訊密度與宣傳風險評分
- 從可見 DOM 擷取基本帳號 metadata
- 非破壞式貼文標註與摺疊
- 側邊面板 dashboard
- 貼文評分與 session 指標的本機儲存
- 透明的評分解釋

### 範圍外

- 自動捲動
- 自動點擊
- 展開隱藏留言
- 雲端爬取
- 跨使用者分析
- 集中式使用者資料庫
- 政治真偽分類
- 自動化平台操作
- Reddit、YouTube、Discord、Instagram、Facebook 與 LinkedIn 支援

---

## 3. 交付策略

PCFA 應先以輕量、可檢查的瀏覽器擴充功能交付，並將智慧分析委派給本機分析服務。

MVP 架構應優先考量：

- 預設保護隱私，
- 清楚的資料邊界，
- 模組化平台 adapter，
- 可替換的本機模型後端，
- 可解釋的評分，
- 以及低風險的 UI 轉換。

實作順序應採取垂直切片：先為 X 建立一條完整的可見貼文流程，再抽象化 adapter 模型並加入 Threads。

---

## 4. 建議技術棧

### 瀏覽器擴充功能

- Framework：Plasmo 或 Vite with React
- Extension format：Chrome Manifest V3
- UI surface：content script overlays 與 Chrome side panel
- Background runtime：service worker
- Messaging：Chrome extension message passing

### 本機分析執行環境

- 初始後端：Ollama HTTP API
- 模型類型：用於摘要與解釋的輕量本機 LLM
- 可選分類器：ONNX Runtime 或 Hugging Face Transformers，用於專門的毒性／情緒分類器

### 本機儲存

- MVP 儲存：extension 內的 IndexedDB
- 未來分析儲存：透過本機 companion service 使用 SQLite 或 DuckDB

IndexedDB 對 extension-only MVP 已經足夠。當多 session analytics 與較重的聚合需求出現時，再導入 SQLite 或 DuckDB。

---

## 5. 系統元件

### 5.1 平台 Adapter Layer

職責：

- 偵測支援的平台頁面，
- 辨識可見 feed 容器，
- 擷取可見貼文節點，
- 在使用者開啟留言時擷取可見留言節點，
- 蒐集可見帳號 metadata，
- 為觀察到的項目指派穩定的本機 ID，
- 並避免收集隱藏或畫面外資料。

初始 adapters：

- `xAdapter`
- `threadsAdapter`

每個 adapter 應提供共同介面：

```ts
interface PlatformAdapter {
  platform: "x" | "threads";
  isSupportedPage(): boolean;
  observeVisibleFeed(onItems: (items: RawFeedItem[]) => void): void;
  extractItem(node: Element): RawFeedItem | null;
}
```

### 5.2 DOM 擷取層

職責：

- 觀察 viewport 可見內容，
- 對 DOM mutation 進行 debounce，
- 去除重複節點，
- 移除無關 UI 文字，
- 保留作者、時間戳、貼文本文、互動數與可見連結，
- 並標記擷取信心值。

限制：

- 不自動捲動。
- 不點擊或展開內容。
- 不將隱藏 DOM 當作使用者可見證據處理。

### 5.3 正規化管線

職責：

- 將原始平台資料轉為 canonical schema，
- 正規化文字，
- 保留平台特定 metadata，
- 以本機 hash 進行去重，
- 並準備分析請求。

建議 canonical shape：

```ts
interface NormalizedFeedItem {
  id: string;
  platform: "x" | "threads";
  url?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  accountSignals?: AccountSignals;
  text: string;
  visibleLinks: string[];
  engagement?: EngagementSignals;
  observedAt: string;
  extractionConfidence: number;
}
```

### 5.4 本機 AI 分析引擎

職責：

- 將正規化後的可見內容送到本機 runtime，
- 要求結構化 JSON 輸出，
- 驗證模型回應，
- 對無效輸出進行 retry 或 graceful degradation，
- 並回傳評分解釋與信心估計。

初始評分類別：

- 毒性分數，
- 憤怒分數，
- 恐懼分數，
- 敵意分數，
- 資訊密度，
- 證據存在性，
- 宣傳風險，
- bot signal，
- coordination risk，
- 以及摘要品質。

### 5.5 評分與解釋層

職責：

- 結合模型輸出與 deterministic heuristics，
- 產生 0.0 到 1.0 的校準分數，
- 附加人類可讀的解釋，
- 呈現訊號貢獻而非結論判決，
- 並區分低信心與低風險。

分數絕不能被呈現為最終真相。它們是本機風險估計與注意力管理提示。

### 5.6 Feed 轉換層

職責：

- 用 score badges 標註貼文，
- 視覺上降低高噪音項目的權重，
- 將高毒性項目摺疊到可復原控制後方，
- 提供簡短的結構化摘要，
- 並保留原始內容的存取權。

所有轉換都必須可由使用者復原。

### 5.7 側邊面板 Dashboard

職責：

- 顯示目前 session 指標，
- 顯示 feed-level toxicity ratio，
- 顯示情緒暴露指標，
- 顯示資訊密度趨勢，
- 列出近期高風險模式，
- 解釋分數如何產生，
- 並提供摺疊門檻的使用者控制。

### 5.8 本機儲存與分析

職責：

- 保存本機 session 摘要，
- 儲存正規化項目的 hash 與分數，
- 追蹤每日聚合指標，
- 預設避免儲存不必要的原始 feed 文字，
- 並提供使用者可控制的資料刪除路徑。

MVP 中，只有在可見解釋或摘要需要時才儲存原始文字。長期保存時優先保留衍生分數與 hash。

---

## 6. 里程碑

### Milestone 0：Repository 與架構設定

交付項目：

- extension project scaffold，
- TypeScript configuration，
- linting and formatting，
- shared domain types，
- local-first data handling 的 architecture decision record，
- 以及開發說明。

驗收標準：

- extension 可在本機 build，
- side panel shell 可開啟，
- content script 可載入測試頁面，
- 且沒有外部 analytics 或 telemetry。

### Milestone 1：X 可見 Feed 擷取

交付項目：

- X adapter，
- viewport-aware DOM observer，
- raw post extraction，
- normalization pipeline，
- duplicate detection，
- extraction debug panel 或 logs。

驗收標準：

- 可見 X 貼文在不自動捲動下被偵測，
- 擷取欄位能一致地正規化，
- 隱藏內容被忽略，
- 且重複 DOM 更新不會建立重複紀錄。

### Milestone 2：本機分析 Runtime 整合

交付項目：

- Ollama client，
- model availability check，
- structured analysis prompt，
- JSON response validator，
- runtime 不可用時的 fallback behavior，
- 以及基本評分輸出。

驗收標準：

- 一則可見貼文可在本機被分析，
- 無效模型輸出被安全處理，
- 沒有原始內容被送到雲端服務，
- 且使用者能看到本機 runtime 狀態。

### Milestone 3：評分、解釋與 UI 標註

交付項目：

- score schema，
- explanation schema，
- score badge UI，
- reversible collapse control，
- summary display，
- 以及使用者可設定的 thresholds。

驗收標準：

- 高毒性貼文可以被摺疊與還原，
- 每個分數都包含簡短解釋，
- UI 不會永久隱藏或刪除內容，
- 且不確定的分數會被標記為 uncertain。

### Milestone 4：側邊面板 Dashboard

交付項目：

- current session metrics，
- feed-level aggregate scores，
- emotional exposure indicators，
- information density summary，
- threshold controls，
- 以及 transparency notes。

驗收標準：

- dashboard 會隨可見貼文分析而更新，
- 聚合指標與已儲存的 item scores 相符，
- 控制項會立即影響內容轉換，
- 且本機模型不可用時 dashboard 仍可使用。

### Milestone 5：Threads Adapter

交付項目：

- Threads platform adapter，
- adapter-specific selectors，
- normalization compatibility checks，
- 以及 platform regression fixtures。

驗收標準：

- 可見 Threads 貼文可被擷取與分析，
- 共用評分與 dashboard code 不需平台特定 branching 即可運作，
- 且 X 行為保持穩定。

### Milestone 6：本機持久化與每日指標

交付項目：

- IndexedDB persistence，
- session rollups，
- daily metric aggregation，
- retention settings，
- 以及本機資料刪除控制。

驗收標準：

- extension reload 後分數仍存在，
- 每日指標在本機產生，
- 使用者可以清除儲存資料，
- 且 retention behavior 有文件化。

### Milestone 7：MVP Hardening

交付項目：

- performance profiling，
- memory usage review，
- false-positive review set，
- privacy review，
- UX review，
- 以及 MVP release checklist。

驗收標準：

- extension 在長 feed 上仍維持 responsive，
- 本機 inference 失敗不會破壞瀏覽，
- privacy constraints 已驗證，
- 且 MVP 可供受控個人使用。

---

## 7. 工作流

### Extension Platform

- project scaffold，
- manifest configuration，
- background service worker，
- content script lifecycle，
- side panel routing，
- extension permissions review。

### Platform Extraction

- X adapter，
- Threads adapter，
- viewport detection，
- mutation observer，
- deduplication，
- extraction confidence。

### Local Intelligence

- Ollama health checks，
- prompt templates，
- structured output validation，
- scoring calibration，
- classifier integration path，
- runtime error handling。

### Product UX

- score badges，
- reversible collapse，
- summaries，
- side panel dashboard，
- threshold controls，
- transparency explanations。

### Privacy and Storage

- local-only persistence，
- retention policy，
- data deletion，
- raw text minimization，
- privacy test checklist。

### Quality and Evaluation

- platform fixture pages，
- score regression examples，
- false-positive review，
- latency measurements，
- memory profiling，
- manual test scripts。

---

## 8. 資料模型草案

### Feed Item Score

```ts
interface FeedItemScore {
  itemId: string;
  model: string;
  analyzedAt: string;
  scores: {
    toxicity: number;
    anger: number;
    fear: number;
    hostility: number;
    informationDensity: number;
    evidencePresence: number;
    propagandaRisk: number;
    botSignal: number;
    coordinationRisk: number;
  };
  confidence: number;
  explanations: ScoreExplanation[];
  summary?: string;
}
```

### Score Explanation

```ts
interface ScoreExplanation {
  category: string;
  contribution: "low" | "medium" | "high";
  reason: string;
  evidence?: string[];
}
```

### Session Metrics

```ts
interface SessionMetrics {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  postsViewed: number;
  postsAnalyzed: number;
  highToxicityPosts: number;
  averageInformationDensity: number;
  emotionalExposureMinutes?: number;
}
```

---

## 9. Prompting 與分類政策

分析 prompt 必須要求結構化 JSON 與中立語言。

模型應被指示：

- 分析修辭與資訊訊號，
- 避免政治真偽判斷，
- 避免意識形態分類，
- 將毒性與不同意見分開，
- 引用可觀察文字訊號，
- 估計信心值，
- 並在證據薄弱時回傳不確定性。

模型不應被要求判定政治主張是否為真。若未來加入 fact checking，必須設計成獨立、由使用者控制、且明確處理來源的功能。

---

## 10. 隱私與合規 Gate

MVP 完成前，需驗證 PCFA：

- 只處理可見或使用者開啟的內容，
- 不自動捲動，
- 不自動點擊，
- 不收集隱藏 DOM 內容，
- 不將原始 feed 內容送到雲端服務，
- 不建立跨使用者分析，
- 資料儲存在本機，
- 提供本機資料刪除，
- 並將所有分數標示為估計值。

若違反以上 gate，應阻擋 release。

---

## 11. 測試計畫

### Unit Tests

- normalization functions，
- score validation，
- threshold logic，
- storage adapters，
- prompt response parsing。

### Integration Tests

- content script to background messaging，
- background to Ollama runtime，
- side panel metric updates，
- storage persistence and reload behavior。

### Manual Tests

- X feed extraction，
- Threads feed extraction，
- local runtime unavailable state，
- high-toxicity collapse and restore，
- low-confidence explanation display，
- data deletion flow。

### Evaluation Tests

- curated post examples，
- expected score ranges，
- false-positive review，
- latency and memory profiling，
- summary usefulness review。

---

## 12. 初始風險

### 平台 DOM 不穩定

X 與 Threads 的 DOM 結構可能經常變動。

緩解方式：

- 將 selectors 隔離在 adapters，
- 盡可能使用 semantic 與 accessibility hints，
- 維護 fixture snapshots，
- 並加入 extraction confidence。

### 本機模型變異

不同本機模型可能回傳不一致的分數。

緩解方式：

- 驗證結構化輸出，
- 將 deterministic heuristics 與 model scoring 分離，
- 記錄模型名稱與版本，
- 並從保守 UI thresholds 開始。

### 過度阻擋或被視為審查

使用者可能將摺疊內容理解為審查。

緩解方式：

- 保持所有轉換可復原，
- 清楚呈現原始內容存取方式，
- 提供 threshold controls，
- 並說明分數是本機估計值。

### 隱私邊界漂移

功能壓力可能推動系統收集更多資料。

緩解方式：

- 維持明確的 compliance gates，
- 文件化禁止行為，
- 並用 local-first rule 審查每個新功能。

### 效能成本

DOM 觀察與本機 inference 可能影響瀏覽體驗。

緩解方式：

- 對 extraction 進行 debounce，
- 只分析可見項目，
- 以本機 content hash 快取分數，
- 並提供 runtime pause controls。

---

## 13. MVP v0.1 Release Criteria

當以下條件成立時，MVP 可供受控個人使用：

- X 與 Threads 可見貼文可在本機分析，
- 高噪音內容可被標註並可逆摺疊，
- 側邊面板指標會依本機分數更新，
- 所有評分都包含解釋與信心值，
- 本機模型失敗時可 graceful degradation，
- 未使用雲端 feed processing，
- 本機資料可被刪除，
- 且 privacy/compliance gates 通過。

---

## 14. 建議實作順序

1. 建立 extension scaffold 與 shared types。
2. 完成 X 可見擷取端到端流程。
3. 為單一貼文加入本機 Ollama 分析。
4. 加入 score validation 與 explanations。
5. 加入 content annotation 與 reversible collapse。
6. 建立 side panel dashboard。
7. 加入 IndexedDB persistence 與 session metrics。
8. 加入 Threads adapter。
9. 進行 privacy、performance 與 UX hardening。
10. 封裝 MVP v0.1，供受控個人使用。

