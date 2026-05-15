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

已分析貼文會快取在瀏覽器 extension storage 中。之後再次看到同一則貼文時，PCFA 會重用快取結果，不會再次呼叫模型。若要強制重新分析單一貼文，請點選 PCFA 列最右側的圓形箭頭按鈕。

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
- Model provider：預設使用 WebLLM，也可由使用者選擇 Ollama 或 OpenAI-compatible provider。
- Model：WebLLM model id、Ollama model name，或 OpenAI-compatible model id。
- WebLLM temperature / max tokens：瀏覽器本地端 inference 參數。
- Toxicity collapse threshold：毒性分數高於此門檻時預設收疊。
- Anger collapse threshold：憤怒分數高於此門檻時預設收疊。
- 已確認廣告預設收疊：平台已標示為廣告的貼文會預設收疊。
- Use heuristic mode only：停用模型呼叫，只使用本機 keyword heuristic。
- Store raw visible text locally：將原始可見貼文文字儲存在本機 Chrome extension storage。
- Store model debug traces locally：記錄最近的模型原始回應、解析後 JSON、正規化分數與 fallback 錯誤，供除錯使用。
- 回報判斷錯誤：針對已分析項目在本機儲存一筆 feedback report。
- 協助發佈匿名統計資訊到伺服器：可選的雲端協作設定，預設關閉。
- 啟用聯防摺疊建議：可選的伺服器輔助提早摺疊設定，預設關閉。
- Retention days：在指定天數後清除本機保存的 scores 與 daily rollups。

調整控制項後，請點選「儲存設定」。語言變更會立即套用到面板，並在儲存設定後保留。

雲端協作設定預設關閉。只有在使用者明確啟用，且資料蒐集伺服器合約完成後，才應送出或接收伺服器資料。

## 除錯模型回應

如果 WebLLM、OpenAI-compatible 或 Ollama 分析看起來全部回傳 0 分，請啟用「在本機儲存模型除錯紀錄」、儲存設定、重新整理 feed，然後查看 Model Debug / 模型除錯面板。

除錯面板會顯示：

- 模型原始 message content，
- 成功解析時的 JSON，
- PCFA 實際使用的正規化分數，
- HTTP 狀態與回應結構，
- 模型輸出無法解析時的 fallback 錯誤。

除錯紀錄只會儲存在擴充功能本機儲存中，並可從模型除錯面板清除。

## 閱讀 Daily Rollups

Daily Rollup panel 會摘要今天的本機活動，包括已分析項目數、高毒性項目數、平均情緒暴露估計、平均宣傳風險估計，以及 WebLLM、Ollama、OpenAI-compatible 與 heuristic scoring 的比例。

## 檢查模型提供者

在 side panel 的 provider 狀態列點選 "Check"。若選擇 WebLLM，PCFA 會載入瀏覽器本地端模型並顯示就緒狀態。若選擇 Ollama，PCFA 會呼叫本機 Ollama tags endpoint，並在可用時顯示可用狀態、延遲與模型名稱。

如果所選 provider 失敗，除非已啟用 heuristic-only mode，分析會自動降級為本機 heuristic scoring。

LM Studio、自訂雲端模型 gateway 與其他 OpenAI-compatible servers 可從 Model provider 控制項選擇。本機 server 請使用 `http://localhost:1234/v1` 這類本機 base URL。只有明確 allowlist 的遠端 OpenAI-compatible origin 會被接受；其他遠端 provider URL 會被拒絕，以維持 local-first 隱私邊界。

## 清除本機資料

在 Privacy panel 點選 "Clear local scores" 可重設已儲存分數與 session metrics。Settings 會保留。

## 謹慎解讀分數

分數是本機估計，不是 moderation 決策或真偽標籤。PCFA 不判定政治主張是否為真，也不應作為評斷個人或帳號的唯一依據。
