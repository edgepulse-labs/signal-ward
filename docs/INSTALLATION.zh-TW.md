# PCFA 安裝與設定

這份指南說明 MVP Chrome / Chromium extension 的本機安裝方式。

## 需求

- 可啟用 extension developer mode 的 Chrome 或 Chromium。
- Node.js 18 或更新版本，用來執行本機驗證指令。
- 可選：Ollama，用於本機模型分析。

目前 MVP 不需要安裝 npm dependencies。

## 驗證 Extension

在 repository root 執行：

```sh
npm run build
```

此指令會驗證：

- `manifest.json` 結構與 Manifest V3 版本，
- extension JavaScript 檔案語法，
- source 與文件檔案的基本格式。

## 載入 Chrome 或 Chromium

1. 開啟 Chrome 或 Chromium。
2. 前往 `chrome://extensions`。
3. 啟用 Developer mode。
4. 點選 "Load unpacked"。
5. 選擇 repository root：

```text
/home/nier/workspace/signal-ward
```

6. 確認 extension 清單中出現 "Personal Cognitive Firewall Assistant"。
7. 如需更快開啟 side panel，可將 extension 釘選到工具列。

## 設定 Ollama

Ollama 是可選的。如果 Ollama 不可用，PCFA 會使用內建的本機 heuristic scorer。

安裝並啟動 Ollama，然後拉取預設模型：

```sh
ollama serve
ollama pull llama3.2
```

PCFA 會將本機模型請求送到：

```text
http://localhost:11434
```

開啟 PCFA side panel，點選 Ollama 狀態列中的 "Check" 來確認連線。

## 建議初始設定

- Ollama model：`llama3.2`
- Collapse threshold：`72%`
- Heuristic-only mode：關閉，除非你不想呼叫 Ollama。
- Store raw visible text locally：關閉。

預設不儲存原始可見文字。分數與最小化 item metadata 會儲存在 `chrome.storage.local`。

## 修改程式後更新

編輯 extension 檔案後：

1. 執行 `npm run build`。
2. 開啟 `chrome://extensions`。
3. 點選 PCFA extension 卡片上的 reload 按鈕。
4. 重新整理已開啟的 X 或 Threads 分頁。

## 疑難排解

如果 extension 沒有出現，請執行 `npm run build`，並檢查 Chrome extension error panel。

如果沒有任何貼文被標註，請重新整理 X 或 Threads 分頁，並確認網址符合 manifest 中設定的 host permissions。

如果 Ollama 顯示不可用，請確認 `ollama serve` 正在執行，且 `http://localhost:11434/api/tags` 可在本機回應。

Live X / Threads 與 Ollama 驗證準備請見[真實環境驗證準備](REAL_WORLD_VALIDATION.zh-TW.md)。
