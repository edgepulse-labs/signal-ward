# PCFA 真實環境驗證準備

在將 `docs/EXECUTION_PLAN.zh-TW.md` 中的 live-environment checklist 標記完成前，請使用這份指南。

## 範圍

真實環境驗證包含：

- 在 Chrome / Chromium 載入 unpacked extension，
- 驗證 live X 上的可見貼文擷取，
- 驗證 live Threads 上的可見貼文擷取，
- 檢查 heuristic-only 行為，
- 使用真實本機模型檢查 Ollama-backed analysis，
- 確認瀏覽時仍符合隱私邊界。

不要只因 fixture 結果通過，就把 live validation 任務標記完成。

## 測試 Profile

建議使用獨立 Chrome / Chromium profile。

建議 profile 設定：

- 只登入 X 與 Threads 驗證所需帳號。
- 停用無關 extensions。
- 在 `chrome://extensions` 保持 Developer mode 啟用。
- 保持 extension service worker 與受測分頁的 Chrome DevTools 可用。
- 早期 MVP 驗證請避免使用主要個人瀏覽 session。

## Preflight Checklist

在 repository root 執行：

```sh
npm run build
npm test
```

確認：

- extension 可在本機通過驗證，
- fixtures 通過結構驗證，
- 載入後沒有 Chrome extension errors，
- `manifest.json` host permissions 只限制在 X、Threads 與本機 Ollama。

## 載入 Extension

1. 開啟 `chrome://extensions`。
2. 啟用 Developer mode。
3. 點選 "Load unpacked"。
4. 選擇 repository root：

```text
/home/nier/workspace/signal-ward
```

5. 開啟 extension details page。
6. 確認沒有顯示 load errors。
7. 如需 debug，開啟 service worker inspector。

程式變更後，請在 extension 卡片點 reload，並重新整理已開啟的 X / Threads 分頁。

## Ollama 準備

Heuristic-only 測試不需要 Ollama，但在標記「Ollama 分析已用真實本機模型驗證」完成前，必須做 Ollama 驗證。

啟動 Ollama 並拉取設定中的模型：

```sh
ollama serve
ollama pull llama3.2
```

檢查本機 endpoint：

```sh
curl http://localhost:11434/api/tags
```

在 PCFA side panel 中：

1. 將 Ollama model 設為 `llama3.2`，或另一個已安裝的本機模型。
2. 關閉 heuristic-only mode。
3. 點選 Ollama 狀態列中的 "Check"。
4. 確認顯示模型名稱與延遲。

## LM Studio / OpenAI-Compatible 準備

LM Studio 可以啟動提供 OpenAI-compatible endpoints 的本機 server。常見本機 base URL 是：

```text
http://localhost:1234/v1
```

可從 LM Studio 的 Developer tab 啟動 server，或執行：

```sh
lms server start
```

驗證 server：

```sh
curl http://localhost:1234/v1/models
```

重要 MVP 限制：目前 extension 還不會把分析請求送到 OpenAI-compatible endpoints。它目前只會把 model-backed requests 送到 Ollama 的 `/api/generate` endpoint，並透過 Ollama 的 `/api/tags` endpoint 檢查 health。

本段可用來準備並記錄 LM Studio readiness，但除非 extension 已先加入 OpenAI-compatible provider setting，否則不要只用 LM Studio 結果標記 Ollama-backed validation 完成。

當 provider 實作完成後，請驗證這些設定：

- Provider：`openai-compatible`
- Base URL：`http://localhost:1234/v1`，或你的本機 provider URL
- Model：`/v1/models` 回傳的 model identifier
- API key：若 server 沒有要求真實 key，可用 `lm-studio` 這類本機 placeholder
- Endpoint shape：`/v1/chat/completions` 或 `/v1/responses`

## X 驗證

準備：

- 開啟 `https://x.com`。
- 使用有多則可見貼文的一般 feed 頁面。
- 不使用自動捲動；只允許手動瀏覽。

驗證：

1. 載入或 reload extension 後，重新整理 X 分頁。
2. 確認出現 "PCFA local" marker。
3. 確認可見貼文收到 PCFA annotation panels。
4. 確認標註包含 toxicity、anger、info、confidence 與 explanation details。
5. 確認重複 DOM 更新不會在同一則可見貼文上建立多個 PCFA panels。
6. 確認高毒性範例只會在高於設定 threshold 時摺疊。
7. 在被摺疊項目點選 "Show original"，確認該單一項目保持展開。
8. 開啟 side panel，確認 analyzed counts 與 recent signals 更新。

記錄：

- 日期與時間，
- browser 與版本，
- 測試 URL 形態，
- selectors 是否穩定找到可見貼文，
- author、permalink 或 text extraction 是否有缺漏。

## Threads 驗證

準備：

- 開啟 `https://www.threads.net`。
- 使用有多則可見貼文的頁面。
- 驗證範圍只限可見內容。

驗證：

1. 載入或 reload extension 後，重新整理 Threads 分頁。
2. 確認出現 "PCFA local" marker。
3. 確認可見貼文收到 PCFA annotation panels。
4. 盡可能確認貼文文字沒有被無關控制項污染。
5. 在可見時確認 author 與 permalink extraction。
6. 確認 side panel counts 與 recent signals 更新。
7. 確認 Threads 測試後 X 行為仍維持正常。

記錄：

- 日期與時間，
- browser 與版本，
- 測試 URL 形態，
- selector 穩定性，
- author/permalink 缺口，
- Threads DOM 變更造成 missed 或 noisy extraction 的例子。

## Heuristic Fallback 驗證

可使用其中一種方式：

- 在 side panel 開啟 "Use heuristic mode only"。
- 在 heuristic-only mode 關閉時停止 Ollama。

驗證：

1. 瀏覽可見的 X 或 Threads 貼文。
2. 確認 annotations 仍會出現。
3. 確認 recent signals 顯示來源為 `heuristic`。
4. 確認本機 inference failure 不會破壞瀏覽。

## 隱私驗證

Live testing 時請確認：

- Extension 不自動捲動。
- Extension 不自動點擊。
- Extension 不展開隱藏留言。
- 除非刻意啟用，否則 raw visible text storage 維持關閉。
- Side panel privacy status 顯示預設不儲存 raw visible text。
- 使用 Ollama 時，分析相關 network activity 只連到 `localhost` / `127.0.0.1`。
- 沒有新增 cloud analytics 或 centralized user database calls。

如需手動 privacy review，可使用受測頁面與 extension service worker 的 Chrome DevTools Network tab。

## 資料重設

驗證前後：

1. 開啟 PCFA side panel。
2. 點選 "Clear local scores"。
3. 確認 analyzed counts 重設。

若需要 browser-level clean reset，可在 `chrome://extensions` 移除並重新載入 unpacked extension。

## 建議驗證紀錄

可在本機 note 或 issue 使用這份 template：

```text
日期：
測試者：
Browser/version：
Extension commit：
Ollama model：
OpenAI-compatible base URL：
OpenAI-compatible model：

Chrome load：
X extraction：
Threads extraction：
Ollama available：
Ollama unavailable / heuristic fallback：
Privacy constraints：

Observed issues：
Screenshots or notes：
Checklist items ready to mark complete：
```

只有在對應 live checks 實際通過後，才更新 `docs/EXECUTION_PLAN.md` 與 `docs/EXECUTION_PLAN.zh-TW.md`。
