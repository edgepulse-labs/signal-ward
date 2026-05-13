# PCFA 專注力與資訊獲取分類規劃

## 目的

PCFA 應協助使用者理解目前看到的 feed item 屬於哪一種內容，以及它可能如何影響專注力與資訊獲取。分類不是 moderation、事實查核，也不是意識形態判定，而是用於個人注意力管理的本機估計。

## MVP 內容標籤

第一階段支援的內容標籤：

| 標籤            | 意義                                        | 常見訊號                                          | 建議 UI       |
|-----------------|---------------------------------------------|---------------------------------------------------|---------------|
| `ad`            | 商業推廣或導向轉換的內容。                   | 折扣語言、購買提示、優惠碼、贊助語句、產品試用文案。   | 顯示為「廣告」。 |
| `propaganda`    | 可能放大情緒或群體認同的說服、動員式框架。    | 口號、急迫轉發、敵我框架、低證據高確定語氣、重複話術。 | 顯示為「宣傳」。 |
| `chitchat`      | 低風險的日常社交閒聊。                       | 問候、玩笑、個人小事、短反應、低證據需求內容。         | 顯示為「閒聊」。 |
| `informational` | 主要提供事實、更新、來源或結構化說明。         | 連結、數據、報告、直接觀察、證據語言、中性摘要。        | 顯示為「資訊」。 |
| `opinion`       | 個人解讀、偏好或論點，且不主要屬於閒聊或推銷。 | 第一人稱立場、價值判斷、解讀、非銷售式推薦。          | 顯示為「意見」。 |
| `unknown`       | 可觀察資訊不足，無法穩定分類。                | 文字過短、訊號混雜、擷取信心不足。                   | 顯示為「未知」。 |

MVP 只需要顯示一個 primary label。後續版本可再加入 secondary labels。

## 專注力評比

專注力評比用來估計可見項目可能造成多少注意力壓力。

| 評比               | 範圍    | 意義                                    |
|--------------------|---------|-----------------------------------------|
| `focusCost`        | 0.0-1.0 | 此項目把使用者從原本任務拉走的可能性。   |
| `emotionalLoad`    | 0.0-1.0 | 內容呈現出的情緒活化程度。               |
| `interruptiveness` | 0.0-1.0 | 內容推動立即反應、轉發、購買或爭辯的程度。 |
| `recoveryCost`     | 0.0-1.0 | 接觸後回到原任務可能需要的恢復成本。     |

初始對應：

- `ad`：中等 focus cost、中等 interruptiveness、低到中等 information value。
- `propaganda`：高 emotional load 與高 recovery cost。
- `chitchat`：低到中等 focus cost，通常 recovery cost 較低。
- `informational`：focus cost 不固定，但可能有較高 information value。
- `opinion`：中等 focus cost，emotional load 視內容而定。

## 資訊獲取評比

資訊評比用來估計內容是否協助使用者學習、查證或決策。

| 評比               | 範圍    | 意義                                     |
|--------------------|---------|------------------------------------------|
| `informationValue` | 0.0-1.0 | 內容看起來提供多少可用資訊。              |
| `evidenceStrength` | 0.0-1.0 | 內容中可見的支持、來源或具體觀察程度。     |
| `novelty`          | 0.0-1.0 | 內容是否提供新脈絡，而不是重複口號或迷因。 |
| `actionability`    | 0.0-1.0 | 內容是否提供清楚、有用且非脅迫式的下一步。 |
| `manipulationRisk` | 0.0-1.0 | 內容推動反應多於理解的風險。              |

這些評比應作為說明，而不是對真偽的判定。

## MVP 實作備註

目前實作目標：

- 在 analysis results 中加入 `classification.primary`。
- 支援值：`ad`、`propaganda`、`chitchat`、`informational`、`opinion`、`unknown`。
- 加入 `classification.confidence` 表示標籤信心。
- 在 feed annotations 與 recent signals 顯示 primary label。
- 保留 `propagandaRisk` 作為數值分數，並與 `propaganda` 內容標籤分開。

模型 prompt 要求：

- 在 JSON 中回傳 primary content type。
- 不分類意識形態。
- 不判定政治真偽。
- 只解釋可觀察訊號。

啟發式 fallback 要求：

- 偵測明顯廣告語言。
- 偵測口號式宣傳訊號。
- 在內容短且低證據時偵測日常閒聊。
- 低信心時優先回到 `unknown`。

## 未來可擴充標籤

後續可能加入：

- `newsUpdate`：事件更新或 breaking news。
- `howTo`：教學或操作說明。
- `personalStory`：第一人稱經驗。
- `question`：直接問題或求助。
- `entertainment`：幽默、迷因或休閒內容。
- `communityNotice`：社群或地方公告。
- `scamRisk`：可疑推廣、冒名或脅迫式交易框架。

在 live validation 前不要加入太多標籤。小而穩定的標籤集合比較容易校準與解釋。

## 驗收標準

- Extension 能將可見項目標示為廣告、宣傳或閒聊。
- 標籤會顯示在精簡 annotation row。
- 標籤會顯示在 side panel recent signals。
- 模型與 heuristic fallback 使用同一組標籤詞彙。
- 低信心或混合訊號項目可回到 `unknown`。
- 擴充標籤集合前，unit 或 fixture tests 至少要覆蓋 label normalization path。
