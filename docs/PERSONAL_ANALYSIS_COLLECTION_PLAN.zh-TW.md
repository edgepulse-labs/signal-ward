# PCFA 個人分析資料蒐集規劃

## 目的

這份規劃描述一條 opt-in 資料蒐集路徑：使用者可以用自己的身分，將已分析的貼文與 PCFA 分析結果送到資料蒐集伺服器，同時確保這些紀錄預設只有使用者本人能讀取。

這與公開或群體式的聯防 telemetry 不同。主要使用情境是私人的個人分析封存，用於回顧、匯出、研究筆記與長期自我稽核。

## 預設行為

- 預設關閉。
- 沒有使用者明確 opt-in 就不上傳。
- 沒有已驗證的使用者身分就不上傳。
- 沒有公開讀取路徑。
- 伺服器不可用時，本機分析仍可繼續運作。

## 使用者身分模型

伺服器應使用已驗證的使用者帳號。每筆上傳紀錄只屬於一位使用者。

建議身分欄位：

- `owner_user_id`：穩定的 server-side user id。
- `installation_id`：不透明的 browser-extension installation id。
- `device_label`：可選的使用者自訂裝置標籤。
- `created_by`：MVP 可與 `owner_user_id` 相同。

Extension 不應把使用者的社群平台身分推定為資料蒐集身分。

## 存取控制

所有個人分析紀錄預設必須只能由 owner 讀取。

必要伺服器規則：

- Create：只有已驗證 owner。
- Read：只有 record owner。
- Update/delete：只有 record owner。
- Admin access：預設停用，或只能透過明確且可稽核的 break-glass path。
- Sharing：未來獨立功能，必須要求 per-record 或 per-collection 明確授權。

伺服器不得提供個人紀錄的公開 feed。

## 上傳 Payload

建議 MVP payload：

```json
{
  "schema_version": "pcfa.personal_analysis.v1",
  "client_record_id": "pcfa_...",
  "platform": "x",
  "post_url": "https://x.com/example/status/123",
  "observed_at": "2026-05-14T00:00:00.000Z",
  "analyzed_at": "2026-05-14T00:00:02.000Z",
  "source": "openai-compatible",
  "model": "model-id",
  "scores": {
    "toxicity": 0.12,
    "anger": 0.08,
    "fear": 0.0,
    "hostility": 0.05,
    "informationDensity": 0.4,
    "evidencePresence": 0.2,
    "propagandaRisk": 0.1,
    "botSignal": 0.0,
    "coordinationRisk": 0.0
  },
  "classification": {
    "primary": "opinion",
    "confidence": 0.72
  },
  "confidence": 0.68,
  "explanations": [],
  "summary": "中性的單句摘要",
  "raw_text": null
}
```

原始可見文字應保持可選，且使用獨立控制項。第一版實作除非使用者明確啟用原文上傳，否則應送出 `raw_text: null`。

## 本機 Queue

Extension 應在送出前先將上傳項目排入本機 queue：

- `personalCollectionQueue`：待上傳紀錄。
- `personalCollectionLastAck`：最後伺服器確認點。
- `personalCollectionRetryAfter`：backoff timestamp。

上傳應以 `client_record_id` 保持 idempotent。

## 使用者控制項

未來設定應與聯防設定分開：

- `enablePersonalCollection`：允許私密上傳已分析紀錄。
- `personalCollectionBaseUrl`：allowlisted collection server URL。
- `personalCollectionToken`：bearer token 或 OAuth access token。
- `uploadRawTextToPersonalCollection`：獨立且高摩擦的 raw text opt-in。

Side panel 應顯示：

- personal collection 啟用 / 停用，
- queued record count，
- 最近成功上傳時間，
- 最近上傳錯誤，
- 清除本機 upload queue 控制項。

## 隱私需求

- 個人資料蒐集不代表公開分享。
- 原文上傳必須與分數 / 結果上傳分開控制。
- Token 不可寫入 debug traces。
- Model debug traces 不可自動上傳。
- 使用者必須能刪除 server-side personal records。
- 匯出應提供可攜式 JSON 格式。

## 實作階段

### Phase 1：僅規劃

- 文件化 owner-only collection model。
- 保持目前雲端設定預設關閉。
- 尚不送出個人紀錄。

### Phase 2：Payload Builder

- 從 cached scores 建立 personal analysis payloads。
- 為 payload minimization 加 unit tests。
- 保持 raw text 預設停用。

### Phase 3：Authenticated Upload

- 新增 personal collection endpoint settings。
- 新增本機 upload queue 與 idempotent retry。
- 只有在 `enablePersonalCollection` 啟用後才上傳。

### Phase 4：Private Readback

- 新增 owner-only listing 與 retrieval server API。
- 在本機 UI 加入 upload status 與 server readback diagnostics。
- 加入 delete / export flows。

## 驗收標準

- 預設安裝不發出 personal collection requests。
- 只有已驗證 owner 可以讀取上傳紀錄。
- 未明確 opt-in 時不上傳 raw text。
- 上傳失敗不影響本機分析。
- 重複上傳具 idempotency。
- 使用者可以隨時停用資料蒐集。
