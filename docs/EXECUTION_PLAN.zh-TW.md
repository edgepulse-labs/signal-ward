# PCFA 執行規劃

## 文件狀態

- 版本：v0.4 任務追蹤版
- 來源：`docs/PRD.md`
- 範圍：MVP Phase 1
- 目標平台：X 與 Threads
- 目標執行環境：Chrome Extension Manifest V3 搭配本機 Ollama 後端
- 規則：每次實作工作完成後，都要更新這份 checklist。請保持 `docs/EXECUTION_PLAN.md` 與 `docs/EXECUTION_PLAN.zh-TW.md` 同步。

---

## 1. MVP 目標

建立一個 local-first 瀏覽器助理，只分析可見社群 feed 內容，在本機估計認知與資訊品質訊號，以非破壞方式標註或摺疊高噪音內容，並在側邊面板中顯示透明的 session 指標。

---

## 2. 目前狀態

- [x] 英文 PRD 已存在：`docs/PRD.md`
- [x] 繁體中文 PRD 已存在：`docs/PRD.zh-TW.md`
- [x] 英文執行規劃已存在：`docs/EXECUTION_PLAN.md`
- [x] 繁體中文執行規劃已存在：`docs/EXECUTION_PLAN.zh-TW.md`
- [x] MVP runbook 已存在：`docs/MVP_RUNBOOK.md`
- [x] 不依賴外部套件的 Chrome MV3 prototype 已存在
- [ ] Extension 已在 Chrome / Chromium 手動載入並驗證
- [ ] X 擷取已用 live site 驗證
- [ ] Threads 擷取已用 live site 驗證
- [ ] Ollama 分析已用真實本機模型驗證

---

## 3. 產品邊界 Checklist

### MVP 範圍內

- [x] Chrome Extension Manifest V3
- [x] X 與 Threads 的 content scripts
- [x] 可見 DOM 擷取
- [x] 貼文正規化
- [x] 透過 Ollama 進行本機分析
- [x] Ollama 不可用時的本機 heuristic fallback
- [x] 毒性評分
- [x] 情緒評分
- [x] 資訊密度評分
- [x] 宣傳風險評分
- [x] 從可見 DOM 擷取基本帳號 metadata
- [x] 非破壞式貼文標註
- [x] 可逆的高毒性內容摺疊
- [x] 側邊面板 dashboard
- [x] 透過 `chrome.storage.local` 本機保存分數與 session 指標
- [x] 透明的評分解釋
- [ ] IndexedDB persistence
- [ ] 校準後的 classifier integration
- [ ] 注意力時間 analytics

### MVP 範圍外

- [x] 不自動捲動
- [x] 不自動點擊
- [x] 不展開隱藏留言
- [x] 不雲端爬取
- [x] 不建立集中式使用者資料庫
- [x] 不做跨使用者分析
- [x] 不做政治真偽分類
- [x] 不做自動化平台操作
- [x] 尚不支援 Reddit、YouTube、Discord、Facebook、Instagram、Hacker News 或 LinkedIn

---

## 4. 里程碑 Checklist

### Milestone 0：Repository 與架構設定

- [x] 建立 extension project structure
- [x] 新增 `manifest.json`
- [x] 新增 background service worker
- [x] 新增 content script
- [x] 新增 side panel HTML/CSS/JS
- [x] 新增 MVP runbook
- [x] 保守設定 extension permissions
- [x] 避免外部 analytics 或 telemetry
- [x] 新增 TypeScript configuration
- [x] 新增 linting 與 formatting setup
- [x] 新增 shared domain type definitions
- [x] 新增 local-first data handling 的 architecture decision record

驗收：

- [x] Manifest 可解析為有效 JSON
- [x] JavaScript 檔案通過語法檢查
- [x] Extension 可透過正式 build command 建置
- [ ] Extension 可透過 Chrome "Load unpacked" 乾淨載入

### Milestone 1：X 可見 Feed 擷取

- [x] 偵測 X / Twitter hostnames
- [x] 找出可見 X tweet candidates
- [x] 擷取可見 tweet text
- [x] 可取得時擷取可見 author handle
- [x] 擷取可見 links
- [x] 指派穩定本機 ID
- [x] 去除重複觀察項目
- [x] 對 DOM mutation scan 進行 debounce
- [x] 忽略 viewport 外 candidates
- [ ] 以 live X 驗證 selectors
- [x] 新增 fixture-based regression examples
- [ ] 改善 extraction confidence calibration

驗收：

- [x] 實作不自動捲動
- [x] 實作不自動點擊
- [x] 實作不展開隱藏內容
- [ ] Live X 貼文可穩定偵測
- [ ] 重複 DOM 更新不會建立重複可見標註

### Milestone 2：本機分析 Runtime 整合

- [x] 新增 Ollama HTTP client
- [x] 新增 OpenAI-compatible local provider support
- [x] 新增 model setting，預設 `llama3.2`
- [x] 新增 structured JSON prompt
- [x] 驗證並正規化模型分數
- [x] 新增 Ollama 不可用時的 heuristic fallback
- [x] 隨分數儲存 model/source metadata
- [x] 避免雲端分析呼叫
- [x] 新增明確的 Ollama health check UI
- [ ] 以真實本機 Ollama 模型驗證
- [ ] 以 LM Studio 或其他 OpenAI-compatible local server 驗證
- [x] 新增 malformed model output 的 retry policy

驗收：

- [x] 一個 normalized item 可送入本機分析程式碼
- [x] 模型無效或不可用時會降級為本機 heuristic scoring
- [x] Extension code 不會將原始內容送到雲端服務
- [x] 使用者可清楚看出分數由 Ollama 或 heuristic mode 產生

### Milestone 3：評分、解釋與 UI 標註

- [x] 在 background result objects 中新增 score schema
- [x] 在 background result objects 中新增 explanation schema
- [x] 新增 toxicity badge
- [x] 新增 anger badge
- [x] 新增 information-density badge
- [x] 新增 explanation details UI
- [x] 新增 reversible collapse control
- [x] 新增可設定的 collapse threshold
- [x] 將 heuristic explanations 與 local model explanations 分開標示
- [x] 新增 low-confidence visual state
- [x] 在 side panel 新增 per-category score details
- [x] 新增單一 collapsed item 的 user override

驗收：

- [x] 高毒性項目可被摺疊與還原
- [x] 每個分數都至少包含一則解釋
- [x] UI 不會永久隱藏或刪除內容
- [x] 不確定分數會被明確標示為 uncertain

### Milestone 4：側邊面板 Dashboard

- [x] 新增 side panel shell
- [x] 顯示 analyzed item count
- [x] 顯示 high-toxicity item count
- [x] 顯示 average toxicity
- [x] 顯示 average information density
- [x] 顯示 recent signal list
- [x] 新增 model setting control
- [x] 新增 threshold control
- [x] 新增 heuristic-only mode toggle
- [x] 新增 raw-text storage toggle
- [x] 新增 local score clearing button
- [ ] 新增 emotional exposure time
- [ ] 新增 feed-level outrage amplification ratio
- [ ] 新增 discussion diversity score
- [x] 新增 privacy/compliance status panel

驗收：

- [x] Dashboard 可讀取本機 extension state
- [x] Dashboard 可更新 settings
- [x] Dashboard 可清除本機 score data
- [ ] Dashboard 已在瀏覽 live X / Threads 時驗證

### Milestone 5：Threads Adapter

- [x] 偵測 Threads hostnames
- [x] 新增 best-effort Threads candidate selectors
- [x] 重用 shared normalization path
- [x] 重用 shared scoring and dashboard path
- [ ] 以 live Threads 驗證 selectors
- [x] 新增 Threads fixture-based regression examples
- [ ] 改善 Threads author 與 permalink extraction

驗收：

- [ ] 可見 Threads 貼文可穩定擷取
- [x] Extraction 後，shared scoring code 不需平台特定 branching 即可運作
- [ ] Threads 驗證後，X 行為仍保持穩定

### Milestone 6：本機持久化與每日指標

- [x] 透過 `chrome.storage.local` 本機保存 scores
- [x] 透過 `chrome.storage.local` 本機保存 settings
- [x] 保存基本 session metrics
- [x] 提供本機資料清除控制
- [x] 預設避免儲存原始可見文字
- [ ] 實作 IndexedDB persistence
- [x] 新增 daily rollups
- [x] 新增 retention settings
- [ ] 新增 local analytics export/import

驗收：

- [x] Scores 可透過 local storage 在 extension runtime reload 後保存
- [x] 使用者可以清除已儲存 score data
- [x] 每日指標在本機產生
- [x] Retention behavior 已在 UI 中文件化

### Milestone 7：MVP Hardening

- [x] 對目前 JavaScript 檔案執行語法檢查
- [x] 驗證 `manifest.json`
- [ ] 在 Chrome / Chromium 手動載入 extension
- [ ] 測試 X
- [ ] 測試 Threads
- [ ] 測試 Ollama 可用狀態
- [ ] 測試 Ollama 不可用狀態
- [x] Review extension permissions
- [ ] Profile long-feed performance
- [ ] Review memory usage
- [ ] 建立 false-positive review set
- [ ] 依 PRD constraints 進行 privacy review
- [ ] 準備 MVP release checklist

驗收：

- [ ] Extension 在長 feed 上仍維持 responsive
- [ ] 本機 inference 失敗不會破壞瀏覽
- [ ] Privacy constraints 已手動驗證
- [ ] MVP 可供受控個人使用

---

## 5. 資料模型 Checklist

- [x] Feed item local ID
- [x] Platform field
- [x] 可見時保存 URL field
- [x] 可見時保存 author handle field
- [x] 可見時保存 author display name field
- [x] Visible links list
- [x] Observed timestamp
- [x] Extraction confidence estimate
- [x] Toxicity score
- [x] Anger score
- [x] Fear score
- [x] Hostility score
- [x] Information density score
- [x] Evidence presence score
- [x] Propaganda risk score
- [x] Bot signal score
- [x] Coordination risk score
- [x] Confidence field
- [x] Explanations list
- [x] Optional summary
- [ ] Versioned schema migrations
- [ ] Dedicated account reputation records
- [ ] Daily metric records

---

## 6. 隱私與合規 Gates

- [x] 只處理可見 candidate content
- [x] 不自動捲動
- [x] 不自動點擊
- [x] 不自動展開隱藏內容
- [x] 不將原始 feed 內容送到雲端服務
- [x] 不建立跨使用者 analytics
- [x] Scores 儲存在本機
- [x] 提供本機資料刪除
- [x] 透過 explanations 將 scores 標示為 estimates
- [x] 預設避免儲存原始可見文字
- [ ] 在 side panel 新增可見 privacy status
- [ ] MVP release 前新增 manual privacy review notes

---

## 7. 測試 Checklist

### Static Checks

- [x] `node --check src/background.js`
- [x] `node --check src/content.js`
- [x] `node --check src/sidepanel.js`
- [x] `manifest.json` JSON parse check
- [ ] 新增 automated lint command
- [ ] 新增 automated test command

### Manual Checks

- [ ] 在 Chrome / Chromium 載入 unpacked extension
- [ ] 從 extension action 開啟 side panel
- [ ] 瀏覽 X 並確認 annotations 出現
- [ ] 瀏覽 Threads 並確認 annotations 出現
- [ ] 確認 high-toxicity collapse 可被還原
- [ ] 確認 threshold control 會影響後續 collapse behavior
- [ ] 確認 data clearing 會移除 local scores
- [ ] 確認 raw text toggle 關閉時不儲存原始文字
- [ ] 確認 Ollama 不可用時 heuristic fallback 可運作
- [ ] 確認 Ollama 可用時 Ollama analysis 可運作

---

## 8. 下一步執行任務

- [ ] 在 Chrome / Chromium 手動載入 unpacked extension。
- [ ] 修正手動載入時發現的 manifest、permission 或 side panel 問題。
- [ ] 測試 live X extraction 並調整 selectors。
- [ ] 測試 live Threads extraction 並調整 selectors。
- [ ] 在本機執行 Ollama 並驗證 structured model output。
- [ ] 新增 Ollama vs heuristic mode 的可見 runtime health indicator。
- [ ] 新增 extraction regression tests 用的 fixture pages。
- [ ] 決定繼續維持 dependency-free vanilla JS，或遷移到 TypeScript/Vite。
