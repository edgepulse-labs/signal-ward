# PCFA 使用指南

PCFA 會在你正常瀏覽時標註可見的 X 與 Threads 貼文。它不會自動捲動、自動點擊、展開隱藏內容，或替你執行平台操作。

## 開始一次瀏覽 Session

1. 在本機載入 extension。
2. 開啟 X 或 Threads。
3. 照常瀏覽。
4. 從 extension toolbar 開啟 PCFA side panel。

可見貼文進入 viewport 時會被分析。重複 DOM 更新會透過本機穩定 item ID 去重。

## 閱讀 Feed 標註

每則已分析貼文可能顯示：

- Toxicity：直接侮辱或攻擊性用語的估計程度。
- Anger：情緒強度估計。
- Info：資訊密度與證據訊號估計。
- Confidence 或 Uncertain：模型與擷取信心。
- Explanation details：估計結果所依據的可觀察理由。

毒性高於 collapse threshold 的貼文會以非破壞方式摺疊。點選 "Show original" 可還原單一項目。

## 使用 Side Panel

Side panel 會顯示：

- 已分析項目數，
- 高毒性項目數，
- 平均毒性，
- 平均資訊密度，
- 帶有來源與信心的 recent signals，
- 各分類平均分數，
- 隱私與合規狀態。

## 調整設定

可用設定：

- 語言：依瀏覽器自動選擇、English，或繁體中文。
- Ollama model：送往 Ollama 的本機模型名稱。
- Collapse threshold：貼文被摺疊的分數門檻。
- Use heuristic mode only：停用 Ollama 呼叫，只使用本機 keyword heuristic。
- Store raw visible text locally：將原始可見貼文文字儲存在本機 Chrome extension storage。
- Retention days：在指定天數後清除本機保存的 scores 與 daily rollups。

調整控制項後，請點選「儲存設定」。語言變更會立即套用到面板，並在儲存設定後保留。

## 閱讀 Daily Rollups

Daily Rollup panel 會摘要今天的本機活動，包括已分析項目數、高毒性項目數、平均情緒暴露估計、平均宣傳風險估計，以及 Ollama 與 heuristic scoring 的比例。

## 檢查 Ollama

在 side panel 的 Ollama 狀態列點選 "Check"。PCFA 會呼叫本機 Ollama tags endpoint，並在可用時顯示可用狀態、延遲與模型名稱。

如果 Ollama 失敗，除非已啟用 heuristic-only mode，分析會自動降級為本機 heuristic scoring。

LM Studio 與其他 OpenAI-compatible local servers 可從 Model provider 控制項選擇。請使用 `http://localhost:1234/v1` 這類本機 base URL；為了維持 local-first 隱私邊界，遠端 provider URL 會被拒絕。

## 清除本機資料

在 Privacy panel 點選 "Clear local scores" 可重設已儲存分數與 session metrics。Settings 會保留。

## 謹慎解讀分數

分數是本機估計，不是 moderation 決策或真偽標籤。PCFA 不判定政治主張是否為真，也不應作為評斷個人或帳號的唯一依據。
