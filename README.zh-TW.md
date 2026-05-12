# Personal Cognitive Firewall Assistant

Personal Cognitive Firewall Assistant（PCFA）是一個 local-first 瀏覽器助理，用來降低社群媒體 feed 中的認知噪音。它只分析可見 feed 內容，在本機估計資訊品質與情緒放大訊號，並提供可逆的標註、摘要與 dashboard 指標。

PCFA 不是審查工具，也不判定政治真相。它是一個注意力保護與認知可觀測性層。

## 目前 MVP

這個 repository 目前包含一個不依賴外部套件的 Chrome Manifest V3 prototype。

已實作：

- X 與 Threads 的可見貼文擷取，
- 透過 `http://localhost:11434` 連接 Ollama 進行本機分析，
- Ollama 不可用時的本機 heuristic fallback，
- 毒性、憤怒、資訊密度、宣傳風險、bot signal 與 coordination risk 估計，
- 可逆的高毒性內容摺疊，
- 帶有解釋的內容標註，
- 側邊面板 metrics 與 settings，
- 透過 `chrome.storage.local` 本機保存分數，
- 本機資料清除，
- 預設不儲存原始可見文字。

尚未完成：

- live site 手動驗證，
- 校準後的 classifier integration，
- IndexedDB persistence，
- daily rollups 與 attention-time analytics，
- 正式測試套件，
- TypeScript/Vite 遷移決策。

## 在本機載入 Extension

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

## 可選 Ollama 設定

PCFA 預設使用 Ollama model name `llama3.2`。

```sh
ollama serve
ollama pull llama3.2
```

如果 Ollama 不可用，PCFA 會降級使用內建的本機 heuristic scorer。

## 隱私邊界

PCFA 依照 local-first 約束設計：

- 只分析可見或使用者開啟的內容。
- 不自動捲動。
- 不自動點擊。
- 不展開隱藏留言。
- 不將 feed 內容送到雲端服務。
- 不建立跨使用者 analytics。
- 分數儲存在本機。
- 除非使用者啟用設定，否則不儲存原始可見文字。

## 專案文件

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

