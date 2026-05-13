# PCFA 聯防系統與統計資訊分享規劃

## 目的

聯防系統是一個可選的雲端輔助層，提供給明確選擇參與的使用者。使用者可協助提供有毒訊號統計，也可接收伺服器端的提早摺疊建議，用於總是散布有毒訊息、協同行為明顯，或已確認為認知作戰機器人的帳號與貼文。

所有需要雲端輔助的行為都必須預設關閉。除非使用者啟用相關設定，否則不應向資料蒐集伺服器送出任何資料。

## 使用者控制項

MVP 設定：

- `shareStatsWithServer`：允許 extension 將彙總或最小化後的統計資訊發佈到資料蒐集伺服器。
- `enableCollectiveDefense`：允許 extension 使用伺服器端聯防判斷，提供提早摺疊建議。

預設值：

- `shareStatsWithServer`：`false`
- `enableCollectiveDefense`：`false`

使用者必須能隨時關閉任一設定。關閉後必須停止未來的雲端輔助行為。

## 資料分享政策

統計分享應採資料最小化。

使用者 opt-in 後，預設可分享：

- hashed item id，
- platform，
- 正規化後的 score bands，
- classification label，
- source type，例如 heuristic、Ollama 或 OpenAI-compatible，
- 四捨五入到粗略時間區間的 timestamp，
- 若需要偵測重複散布者，可使用 author handle hash。

預設不可分享：

- 原始可見文字，
- 完整 URLs，
- API keys，
- 使用者帳號識別資訊，
- browser profile identifiers，
- 私人瀏覽紀錄，
- 隱藏留言或展開後內容。

如果未來要加入 raw text sharing，必須是另一個獨立且明確的設定。

## 資料蒐集伺服器角色

資料蒐集伺服器可以：

- 聚合有毒訊號統計，
- 偵測重複有毒訊息散布模式，
- 偵測可能的協同或機器人帳號，
- 發佈帳號或貼文風險建議，
- 提供 signed judgment snapshots 給 client。

資料蒐集伺服器不應：

- 判定政治真偽，
- 暴露單一使用者瀏覽行為，
- 在預設模式要求 raw text，
- 在沒有 review 與 appeal workflows 的情況下做公開指控。

## 提早摺疊行為

當 `enableCollectiveDefense` 啟用時，extension 可使用伺服器判斷，比本機分數更早摺疊內容。

候選提早摺疊規則：

- 帳號在多個 opt-in clients 中反覆出現高毒性訊號，
- 帳號已確認為認知作戰機器人帳號，
- 貼文 hash 出現在已確認的有毒或協同活動清單，
- 本機分數接近門檻，但伺服器風險高。

提早摺疊必須可逆。使用者必須永遠可以打開原始項目。

## 建議伺服器判斷格式

```json
{
  "version": "2026-05-14",
  "generatedAt": "2026-05-14T00:00:00Z",
  "entries": [
    {
      "subjectType": "authorHash",
      "subject": "sha256:...",
      "risk": "repeated-toxic-spreader",
      "confidence": 0.82,
      "recommendedAction": "early-collapse",
      "expiresAt": "2026-06-14T00:00:00Z"
    }
  ],
  "signature": "..."
}
```

## Client 安全機制

Extension 應該：

- 保持雲端功能預設關閉，
- 在 privacy panel 顯示雲端協作狀態，
- 讓伺服器建議摺疊與本機摺疊在視覺上可區分，
- 僅儲存運作所需的最小 server cache，
- 讓 server judgments 過期，
- server 不可用時仍繼續本機分析，
- 永遠不自動封鎖、刪除、檢舉或替使用者操作平台內容。

## 實作階段

### Phase 1：設定與文件

- 新增 opt-in settings。
- 顯示雲端協作狀態。
- 文件化資料邊界與伺服器行為規劃。
- 在具體 server contract 前，不送出資料。

### Phase 2：統計發佈

- 新增固定 allowlisted collection endpoint。
- 只有在 `shareStatsWithServer` 啟用後，才送出最小化統計。
- 為 payload minimization 增加 unit tests。
- 加入以環境變數 gate 的 integration tests。

### Phase 3：判斷下載

- 只有在 `enableCollectiveDefense` 啟用後，才下載 signed server judgment snapshots。
- 將 judgments 以過期時間快取在本機。
- 以可逆方式套用提早摺疊建議。

### Phase 4：審查與治理

- 為 bot 或 campaign labels 加入 server-side review workflow。
- 加入 transparency logs。
- 為誤分類帳號加入 appeal 與 correction mechanisms。

## 驗收標準

- 雲端設定預設關閉。
- Privacy panel 清楚顯示雲端協作是否啟用。
- 預設不送出 raw text。
- 除非使用者明確啟用相關設定，否則不發出 server request。
- 提早摺疊仍可逆。
- Server judgments 會過期，且 stale 時可被忽略。
