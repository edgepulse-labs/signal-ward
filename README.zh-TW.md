# Personal Cognitive Firewall Assistant

Personal Cognitive Firewall Assistant（PCFA）是一個 local-first 瀏覽器助理，用來降低社群媒體 feed 中的認知噪音。它只分析可見 feed 內容，在本機估計資訊品質與情緒放大訊號，並提供可逆的標註、摘要與 dashboard 指標。

PCFA 不是審查工具，也不判定政治真相。它是一個注意力保護與認知可觀測性層。

## 目前 MVP

這個 repository 目前包含一個打包 WebLLM runtime 的 Chrome Manifest V3 prototype。

已實作：

- X 與 Threads 的可見貼文擷取，
- 預設透過瀏覽器本地端 WebLLM 進行分析，
- 可選擇透過 Ollama、本機 OpenAI-compatible server，或已核准的 OpenAI-compatible endpoint 進行分析，
- 所選模型 runtime 不可用時的本機 heuristic fallback，
- 毒性、憤怒、資訊密度、宣傳風險、bot signal 與 coordination risk 估計，
- 可逆的高毒性內容摺疊，
- 帶有解釋的內容標註，
- 側邊面板 metrics 與 settings，
- 透過 `chrome.storage.local` 本機保存分數，
- 本機 daily rollups 與 retention settings，
- 針對廣告、宣傳、閒聊、資訊、意見與未知項目的內容類型標籤，
- 未來統計資訊分享與聯防建議的 opt-in 設定，兩者預設關閉，
- 本機資料清除，
- 預設不儲存原始可見文字。

尚未完成：

- live site 手動驗證，
- 校準後的 classifier integration，
- IndexedDB persistence，
- attention-time analytics，
- 更完整的 browser-driven test coverage，
- TypeScript/Vite 遷移決策。

## 在本機載入 Extension

請先執行本機驗證指令：

```sh
npm run build
```

1. 開啟 Chrome 或 Chromium。
2. 前往 `chrome://extensions`。
3. 啟用 Developer mode。
4. 點選 "Load unpacked"。
5. 選擇此 repository root：

```text
/home/nier/workspace/signal-ward
```

6. 開啟 X 或 Threads，照常瀏覽。
7. 從 extension toolbar 開啟 PCFA side panel。

## 本機模型設定

PCFA 預設使用瀏覽器本地端 WebLLM，模型為 `Llama-3.2-1B-Instruct-q4f16_1-MLC`。第一次執行會將模型資源下載到瀏覽器快取，並需要啟用 WebGPU 的 Chrome / Chromium profile。

Ollama 仍可作為可選的本機 server provider：

```sh
ollama serve
ollama pull llama3.2
```

如果所選模型 provider 不可用，PCFA 會降級使用內建的本機 heuristic scorer。

若使用 LM Studio、自訂雲端模型 gateway，或其他 OpenAI-compatible server，請在 side panel 選擇 `OpenAI-compatible`，並設定 base URL，例如 `http://localhost:1234/v1`。Extension 明確 allowlist 的遠端 OpenAI-compatible endpoint 也可使用。

## 隱私邊界

PCFA 依照 local-first 約束設計：

- 只分析可見或使用者開啟的內容。
- 不自動捲動。
- 不自動點擊。
- 不展開隱藏留言。
- 預設不將原始 feed 內容送到雲端服務。
- 除非使用者 opt-in 未來統計分享功能，否則不建立跨使用者 analytics。
- 分數儲存在本機。
- 除非使用者啟用設定，否則不儲存原始可見文字。

## 專案文件

- [安裝與設定](docs/INSTALLATION.zh-TW.md)
- [安裝與設定，英文](docs/INSTALLATION.md)
- [使用指南](docs/USAGE.zh-TW.md)
- [使用指南，英文](docs/USAGE.md)
- [真實環境驗證準備](docs/REAL_WORLD_VALIDATION.zh-TW.md)
- [真實環境驗證準備，英文](docs/REAL_WORLD_VALIDATION.md)
- [聯防系統與統計資訊分享規劃](docs/COLLECTIVE_DEFENSE_PLAN.zh-TW.md)
- [聯防系統與統計資訊分享規劃，英文](docs/COLLECTIVE_DEFENSE_PLAN.md)
- [EdgePulse Collector 整合規劃](docs/EDGEPULSE_COLLECTOR_INTEGRATION.zh-TW.md)
- [EdgePulse Collector 整合規劃，英文](docs/EDGEPULSE_COLLECTOR_INTEGRATION.md)
- [專注力與資訊獲取分類規劃](docs/FOCUS_INFORMATION_CLASSIFICATION.zh-TW.md)
- [專注力與資訊獲取分類規劃，英文](docs/FOCUS_INFORMATION_CLASSIFICATION.md)
- [Icon 生成 Prompt](docs/ICON_GENERATION_PROMPT.zh-TW.md)
- [Icon 生成 Prompt，英文](docs/ICON_GENERATION_PROMPT.md)
- [Unit Test 規劃與結果](docs/UNIT_TEST_PLAN_AND_RESULTS.zh-TW.md)
- [Unit Test 規劃與結果，英文](docs/UNIT_TEST_PLAN_AND_RESULTS.md)
- [產品需求文件](docs/PRD.md)
- [產品需求文件，繁體中文](docs/PRD.zh-TW.md)
- [執行規劃](docs/EXECUTION_PLAN.md)
- [執行規劃，繁體中文](docs/EXECUTION_PLAN.zh-TW.md)
- [MVP Runbook](docs/MVP_RUNBOOK.md)

## 開發備註

Execution plan 現在也是專案 task tracker。每次實作工作完成後，請同步更新：

- `docs/EXECUTION_PLAN.md`
- `docs/EXECUTION_PLAN.zh-TW.md`

請保持兩份 checklist 同步，讓英文與繁體中文文件描述同一個專案狀態。
