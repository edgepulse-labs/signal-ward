# PCFA Unit Test 規劃與結果

## 文件狀態

- 日期：2026-05-14
- 範圍：Browser extension unit tests 與輕量本機驗證
- 相關指令：`npm test`、`npm run check`
- 相關檔案：`scripts/unit-tests.js`、`scripts/validate-fixtures.js`、`scripts/validate-extension.js`

## 目標

Unit tests 的目標，是在不需要每次都啟動真實 Chrome runtime 的情況下，維持 browser extension 邏輯可靠。測試套件優先覆蓋可以在 Node.js 中快速執行的純邏輯與小型合約。

目前測試規劃聚焦於：

- settings normalization，
- OpenAI-compatible base URL allowlist 行為，
- feed extraction examples 的 fixture 結構，
- extension manifest 與 JavaScript 語法驗證，
- tracked project files 的格式檢查。

## 測試策略

### 環境變數

開發時期專用的測試設定可以記錄在 `.env.example`，需要時複製成 local-only 的 `.env`。

這樣的設計適合用於需要因機器而異的 endpoints、本機 model ids 或 API keys 的可選測試，但要遵守這些限制：

- pure unit tests 不應依賴 `.env`，
- `.env` 不可提交進版控，
- 會接觸本機或遠端模型 provider 的測試必須明確 opt-in，
- `npm test` 應維持快速、可重現，且可在 offline 狀態安全執行，
- 真實 secrets 不可放進 `.env.example`。

目前可選變數包含：

- `PCFA_TEST_OPENAI_COMPATIBLE_BASE_URL`
- `PCFA_TEST_OPENAI_COMPATIBLE_API_KEY`
- `PCFA_TEST_OPENAI_COMPATIBLE_MODEL`
- `PCFA_TEST_ENABLE_REMOTE_OPENAI_COMPATIBLE`
- `PCFA_TEST_LOCAL_OPENAI_COMPATIBLE_BASE_URL`
- `PCFA_TEST_LOCAL_OPENAI_COMPATIBLE_MODEL`

### Unit Tests

針對不需要 `chrome.*`、DOM APIs 或 live network access 的純邏輯，使用 Node.js 測試。

目前 unit-test 目標：

- `src/settings.js`

已覆蓋行為：

- 接受 `http://localhost:1234/v1`，
- 接受 `localhost:1234/v1`，並自動補上預設 `http://` protocol，
- 接受 `127.0.0.1:1234/v1/`，並移除 trailing slash，
- 接受 IPv6 localhost，例如 `http://[::1]:1234/v1`，
- 接受已核准的遠端 OpenAI-compatible origin：`https://ai.yihua.app`，
- 拒絕未核准的遠端 provider URL，例如 `https://api.openai.com/v1`。

### Fixture Validation

使用 fixture validation 對 feed extraction examples 做穩定、非 live 的檢查。

目前 fixture 目標：

- `fixtures/feed-extraction.json`

已覆蓋行為：

- fixture file 包含 X 與 Threads examples，
- 必要欄位存在，
- expected text、author handle 與 URL fragments 存在於 fixture HTML 中，
- extraction-confidence expectations 已正規化。

### Extension Validation

使用 extension validation 作為手動載入 extension 前的快速 preflight。

目前 validation 目標：

- `manifest.json`
- extension 與 script files 的 JavaScript syntax
- tracked project files 的結尾換行、trailing whitespace 與 indentation
- full check 會一併執行 fixture validation

## 目前指令

執行所有自動化測試：

```sh
npm test
```

執行 extension validation：

```sh
npm run check
```

目前 `npm test` 指令執行：

```sh
node scripts/unit-tests.js && node scripts/validate-fixtures.js
```

## 最新結果

記錄日期：2026-05-14。

| 指令            | 結果 | 備註                                                                |
|-----------------|------|---------------------------------------------------------------------|
| `npm test`      | 通過 | Unit tests passed；fixture examples passed structural validation。    |
| `npm run check` | 通過 | Extension manifest、JavaScript syntax、formatting 與 fixtures passed。 |

## 已知缺口

- 尚未建立 browser-driven unit test harness 來測試 DOM annotation placement。
- 尚未針對 side panel save flows 建立 mocked `chrome.storage.local` tests。
- 尚未針對 `PCFA_UPDATE_SETTINGS` message handling 建立 service-worker integration tests。
- 本報告不包含 live X / Threads selector validation；這些仍由 real-world validation docs 覆蓋。
- 尚未建立 collapsed / expanded annotation panels 的 visual regression tests。

## 下一步測試項目

建議後續新增：

1. 為 `updateSettings` 加入小型 mocked Chrome storage harness。
2. 將 content-script DOM placement helpers 抽成可測模組。
3. 為 i18n fallback 與繁體中文選擇補 unit coverage。
4. 為 OpenAI-compatible provider settings 與 health-check URL construction 加 regression tests。
5. 後續再用 Playwright 或 Chrome extension test tooling 加 browser-level smoke test。

## 通過標準

在將 unit-test coverage 視為足以支援 MVP 維護前，需符合：

- `npm test` 可在 clean checkout 通過。
- `npm run check` 可在 clean checkout 通過。
- Settings normalization 同時包含 accepted 與 rejected URL examples。
- scoring、settings、i18n 或 retention 若新增純 helper，至少要有一個 regression test。
- 不只憑 unit tests 就標記 live browser behavior 完成。
