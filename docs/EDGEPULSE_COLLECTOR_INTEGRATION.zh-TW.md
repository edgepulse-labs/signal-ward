# PCFA 與 EdgePulse Collector Cloud API 整合規劃

## 目的

這份文件描述 PCFA 如何與 sibling 專案 `../edgepulse-collector/` 整合，提供 opt-in 的統計資訊收集 Cloud API，用於有毒訊號 telemetry 與未來聯防判斷。

整合必須保留 PCFA 預設 local-first 行為：

- 預設不上傳統計資訊，
- 預設不查詢聯防判斷，
- 預設不上傳原始可見文字，
- 除非使用者明確啟用，否則不使用伺服器輔助摺疊。

## 既有 Collector Contract

`../edgepulse-collector/` 目前提供通用 feature-ingest API：

- `GET /healthz`
- `POST /v1/edgepulse/features`
- bearer token authentication，
- 以 `(device_id, row_id)` 做 idempotent storage，
- durable `last_row_id` acknowledgement。

Collector 接收 long-format feature rows。PCFA 可以重用這個模型，將社群 feed 分析統計映射成 feature rows。

## PCFA Client 設定

目前 PCFA 已有：

- `shareStatsWithServer`：使用者 opt-in 統計資訊發佈。
- `enableCollectiveDefense`：使用者 opt-in 伺服器輔助聯防。

正式上傳前仍需要的未來設定：

- `collectorBaseUrl`：固定或使用者設定的 allowlisted collector URL。
- `collectorApiToken`：ingest 使用的 bearer token。
- `collectorDeviceId`：本機產生的不透明 installation id。
- `collectorLastAckedRowId`：durable upload cursor。
- `collectorNextSequence`：upload batch sequence。

`collectorApiToken` 這類 secrets 不可寫入 log，也不可包含在匯出的 diagnostics 中。

## Feature Row 映射

每個已分析項目可以轉換成多筆 EdgePulse-style feature rows。

建議 metrics：

| PCFA 訊號  | Collector Metric                 |
|------------|----------------------------------|
| 毒性       | `pcfa.score.toxicity`            |
| 憤怒       | `pcfa.score.anger`               |
| 恐懼       | `pcfa.score.fear`                |
| 敵意       | `pcfa.score.hostility`           |
| 資訊密度   | `pcfa.score.information_density` |
| 證據存在   | `pcfa.score.evidence_presence`   |
| 宣傳風險   | `pcfa.score.propaganda_risk`     |
| 機器人訊號 | `pcfa.score.bot_signal`          |
| 協同風險   | `pcfa.score.coordination_risk`   |
| 內容分類   | `pcfa.classification.primary`    |
| 分析信心   | `pcfa.analysis.confidence`       |

建議 labels：

```text
platform=x,source=openai-compatible,class=propaganda,raw_text=false
```

分類標籤在 MVP 可先以 numeric feature value 表示：

- `ad`：`1`
- `propaganda`：`2`
- `chitchat`：`3`
- `informational`：`4`
- `opinion`：`5`
- `unknown`：`0`

## 隱私保護 Payload 形狀

PCFA 應上傳粗粒度統計，而不是原始貼文內容。

允許欄位：

- opaque `device_id`，
- 單調遞增 `row_id`，
- 粗粒度 time window，
- metric name，
- 低 cardinality label string，
- normalized numeric score，
- source type，
- content class，
- raw-text sharing flag。

預設避免：

- 原始可見文字，
- 完整貼文 URL，
- 帳號 display name，
- 原始 author handle，
- browser profile identifier，
- 除 header 中 collector bearer token 以外的 API keys。

如果 repeat-spreader detection 需要帳號身份，應使用 visible author handle 的 salted 或 server-defined hash。預設不要上傳 raw handles。

## 上傳演算法

1. 確認 `shareStatsWithServer` 已啟用。
2. 確認 `collectorBaseUrl` 與 `collectorApiToken` 已設定。
3. 讀取本機 queued feature rows，其中 `row_id > collectorLastAckedRowId`。
4. 依 collector limits 組 batch。
5. 以 `Authorization: Bearer <token>` 呼叫 `POST /v1/edgepulse/features`。
6. 收到 `accepted: true` 後，將 `collectorLastAckedRowId` 推進到 `last_row_id`。
7. 遇到 timeout、network error 或 5xx，保留本機 rows 並 backoff 重試。
8. 遇到 400，停止重送 invalid payload，並在 diagnostics 顯示錯誤。
9. 遇到 401，停止上傳直到使用者修正 token。

## 聯防判斷 API

目前 collector API 只記錄 feature ingest。PCFA 聯防需要未來 collector 版本新增 read path。

提議 endpoint：

```http
GET /v1/pcfa/judgments?since=<version>
Authorization: Bearer <token>
```

Response：

```json
{
  "version": "2026-05-14T00:00:00Z",
  "generated_at": 1778299928,
  "entries": [
    {
      "subject_type": "author_hash",
      "subject": "sha256:...",
      "risk": "repeated-toxic-spreader",
      "confidence": 0.82,
      "recommended_action": "early-collapse",
      "expires_at": 1780978328
    }
  ]
}
```

這個 API 尚未在 PCFA 實作，應等 collector contract 穩定後再啟用。

## 安全需求

- Production 使用 HTTPS。
- 要求 bearer token authentication。
- 永遠不記錄 bearer tokens。
- 上傳維持 opt-in。
- 預設 payload 不包含 raw text。
- 以 `(device_id, row_id)` 維持 idempotency。
- 使用 exponential backoff 與 jitter。
- 限制 batch size 與 request body size。
- Server judgments 在 client 端必須會過期，且摺疊必須可逆。

## 實作階段

### Phase 1：文件與設定

- 保留 PCFA opt-in settings。
- 文件化 EdgePulse Collector 整合。
- 尚不送出資料。

### Phase 2：本機 Queue 與 Payload Builder

- 新增本機統計 queue。
- 將 PCFA analysis results 轉成 EdgePulse feature rows。
- 為 payload minimization 加 unit tests。
- 加入以 `.env` gate 的 integration tests。

### Phase 3：Authenticated Upload

- 新增 collector URL 與 token settings。
- 只有在 `shareStatsWithServer` 啟用時上傳。
- 遵守 `last_row_id` acknowledgement。

### Phase 4：聯防 Read Path

- 在 collector 加入 judgment snapshot endpoint。
- 只有在 `enableCollectiveDefense` 啟用時 fetch。
- 以可逆方式套用 early-collapse suggestions。

## 驗收標準

- 預設安裝不發出 collector requests。
- 必須啟用統計資訊分享才會上傳。
- 預設 upload payload 不包含 raw text。
- 上傳失敗不會遺失本機 queued rows。
- Collector acknowledgement 控制本機 cursor 推進。
- 聯防建議不可永久隱藏內容。
