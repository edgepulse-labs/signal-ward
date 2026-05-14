# PCFA 長篇重點擷取規劃

## 目的

PCFA 應協助使用者處理長篇貼文與類文章 feed 項目，直接擷取出一句話重點。目標不是取代原文，而是在使用者決定是否展開、閱讀或跳過之前，提供快速閱讀輔助。

## 產品行為

對長篇可見項目，PCFA 應顯示：

```text
重點：<一句精簡重點>
```

重點應優先顯示在 PCFA 展開細節中。後續 UI 版本可在項目足夠長時，選擇把重點放在精簡 inline row。

## 長篇判定

符合任一條件時，視為 long-form：

- 可見文字至少 280 個字元，
- 可見文字至少 70 個 words，
- 可見文字包含至少 4 個類句子段落，
- 平台項目包含 link preview 或 article-style block，且有足夠可見文字。

短貼文維持目前 optional summary 行為。

## 輸出合約

擴充模型輸出：

```json
{
  "keyPoint": "用一句話寫出主要重點。"
}
```

規則：

- 必須剛好一句話，
- 採中性措辭，
- 不判斷政治真偽，
- 不加入可見文字中沒有的新事實，
- 不加入道德化或 moderation 語氣，
- 繁體中文最多 180 字元，英文最多 220 字元。

如果模型沒有回傳 `keyPoint`，PCFA 可以用 `summary` 作為 fallback。若兩者都沒有，則省略重點列。

## Prompt 更新

加入指令：

```text
If the visible text is long, write keyPoint as one concise sentence that captures the main point. Do not add facts not present in the text.
```

先保留現有 JSON schema，並把 `keyPoint` 作為 optional field。驗證穩定後，再針對支援 JSON schema 的 model provider 將其設為 required。

## UI 位置

PCFA 展開細節的排序應為：

1. 重點，如果存在。
2. 摘要，如果存在且與重點不同。
3. 說明。
4. Fallback / debug notices。

精簡列仍維持顯示 scores、classification、confidence 與 reanalyze control。

## 快取

使用與 scores 相同的 item id，將 `keyPoint` 存入 cached analysis result。從 browser extension storage 重用，只有在以下情況重新產生：

- 使用者點選重新分析，
- model provider / model 變更，且 cached result 不再相容，
- prompt / schema version 變更。

在將 key-point 行為改成 required 前，後續 cache entries 應加入 `analysisSchemaVersion`。

## 隱私

重點擷取使用與既有分析相同的隱私邊界：

- 只使用本機 Ollama 或已核准的 OpenAI-compatible endpoint，
- 不額外擷取隱藏內容，
- 除非未來有獨立 opt-in 功能，否則不送到資料蒐集伺服器，
- raw text storage 仍由既有設定控制。

## 測試

建議測試：

- unit test 確認 `normalizeModelOutput` 保留 `keyPoint`，
- unit test 覆蓋 long-form detector threshold 行為，
- 新增長篇 Threads fixture，
- 新增長篇 X fixture，
- regression test 確認短貼文不要求 `keyPoint`，
- UI smoke check 確認展開細節中重點顯示在摘要前。

## 實作階段

### Phase 1：Schema 與模型輸出

- 在 `AnalysisResult` 加入 `keyPoint`。
- 在 JSON schema 加入 optional `keyPoint`。
- 正規化並截斷 `keyPoint`。

### Phase 2：UI

- 在 PCFA 展開細節顯示重點。
- 加入 `Key point` / `重點` 的 i18n label。

### Phase 3：Detection 與 Prompt 調校

- 新增 `isLongForm` helper。
- 只在或特別在 long-form detection 為 true 時要求 `keyPoint`。
- 用 X 與 Threads examples 調校 prompt。

### Phase 4：Tests 與 Fixtures

- 新增 long-form fixtures。
- 為 normalization 與 long-form detection 補 unit tests。
- 為真實 X 與 Threads 頁面加入手動驗證紀錄。
