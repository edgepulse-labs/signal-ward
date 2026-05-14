const elements = {
  runtimeStatus: document.querySelector("#runtimeStatus"),
  postsAnalyzed: document.querySelector("#postsAnalyzed"),
  highToxicityPosts: document.querySelector("#highToxicityPosts"),
  averageToxicity: document.querySelector("#averageToxicity"),
  averageInfo: document.querySelector("#averageInfo"),
  language: document.querySelector("#language"),
  modelProvider: document.querySelector("#modelProvider"),
  model: document.querySelector("#model"),
  modelOptions: document.querySelector("#modelOptions"),
  webLlmProgressWrap: document.querySelector("#webLlmProgressWrap"),
  webLlmProgress: document.querySelector("#webLlmProgress"),
  webLlmProgressText: document.querySelector("#webLlmProgressText"),
  webLlmTemperature: document.querySelector("#webLlmTemperature"),
  webLlmMaxTokens: document.querySelector("#webLlmMaxTokens"),
  openaiBaseUrl: document.querySelector("#openaiBaseUrl"),
  openaiApiKey: document.querySelector("#openaiApiKey"),
  toxicityThreshold: document.querySelector("#toxicityThreshold"),
  thresholdValue: document.querySelector("#thresholdValue"),
  angerThreshold: document.querySelector("#angerThreshold"),
  angerThresholdValue: document.querySelector("#angerThresholdValue"),
  retentionDays: document.querySelector("#retentionDays"),
  collapseAds: document.querySelector("#collapseAds"),
  analysisMode: document.querySelector("#analysisMode"),
  storeRawText: document.querySelector("#storeRawText"),
  modelDebugMode: document.querySelector("#modelDebugMode"),
  shareStatsWithServer: document.querySelector("#shareStatsWithServer"),
  enableCollectiveDefense: document.querySelector("#enableCollectiveDefense"),
  checkOllama: document.querySelector("#checkOllama"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  ollamaDetail: document.querySelector("#ollamaDetail"),
  saveSettings: document.querySelector("#saveSettings"),
  clearData: document.querySelector("#clearData"),
  clearModelDebug: document.querySelector("#clearModelDebug"),
  recentList: document.querySelector("#recentList"),
  categoryDetails: document.querySelector("#categoryDetails"),
  dailyRollup: document.querySelector("#dailyRollup"),
  modelDebugList: document.querySelector("#modelDebugList"),
  privacyStatus: document.querySelector("#privacyStatus")
};
const i18n = globalThis.PCFA_I18N;
let translator = i18n.createTranslator(i18n.AUTO_LANGUAGE);
let webLlmStatusPoll = null;

document.addEventListener("DOMContentLoaded", init);
elements.toxicityThreshold.addEventListener("input", () => {
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
});
elements.angerThreshold.addEventListener("input", () => {
  elements.angerThresholdValue.textContent = formatPercent(Number(elements.angerThreshold.value));
});
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearData.addEventListener("click", clearData);
elements.clearModelDebug.addEventListener("click", clearModelDebug);
elements.checkOllama.addEventListener("click", checkOllama);
elements.modelProvider.addEventListener("change", () => {
  const provider = elements.modelProvider.value;
  elements.model.value = defaultModelForProvider(provider);
  syncProviderControls();
  loadModelOptions();
});
elements.language.addEventListener("change", () => {
  applyLanguage(elements.language.value);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.metrics || changes.scores || changes.settings)) {
    refreshState();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "PCFA_WEBLLM_STATUS_CHANGED") {
    renderWebLlmProgress(message.status);
  }
});

function init() {
  renderLanguageOptions();
  refreshState();
}

function refreshState() {
  chrome.runtime.sendMessage({ type: "PCFA_GET_STATE" }, (response) => {
    if (!response?.ok) {
      elements.runtimeStatus.textContent = t("statusUnavailable");
      return;
    }
    render(response.state);
  });
}

function render(state) {
  const metrics = state.metrics || {};
  const settings = state.settings || {};
  const scores = Object.values(state.scores || {});
  const analyzed = metrics.postsAnalyzed || 0;

  const provider = settings.modelProvider || "webllm";
  applyLanguage(settings.language || "auto");
  elements.language.value = settings.language || "auto";
  elements.runtimeStatus.textContent =
    settings.analysisMode === "heuristic" ? t("statusHeuristic") : providerLabel(provider);
  elements.postsAnalyzed.textContent = String(analyzed);
  elements.highToxicityPosts.textContent = String(metrics.highToxicityPosts || 0);
  elements.averageToxicity.textContent = formatPercent(analyzed ? metrics.totalToxicity / analyzed : 0);
  elements.averageInfo.textContent = formatPercent(analyzed ? metrics.totalInformationDensity / analyzed : 0);
  elements.modelProvider.value = provider;
  elements.model.value = settings.model || defaultModelForProvider(provider);
  elements.webLlmTemperature.value = settings.webLlmTemperature ?? 0;
  elements.webLlmMaxTokens.value = settings.webLlmMaxTokens ?? 700;
  elements.openaiBaseUrl.value = settings.openaiBaseUrl || "http://localhost:1234/v1";
  elements.openaiApiKey.value = settings.openaiApiKey || "lm-studio";
  elements.toxicityThreshold.value = settings.toxicityThreshold ?? 0.72;
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
  elements.angerThreshold.value = settings.angerThreshold ?? 0.8;
  elements.angerThresholdValue.textContent = formatPercent(Number(elements.angerThreshold.value));
  elements.retentionDays.value = settings.retentionDays ?? 30;
  elements.collapseAds.checked = Boolean(settings.collapseAds);
  elements.analysisMode.checked = settings.analysisMode === "heuristic";
  elements.storeRawText.checked = Boolean(settings.storeRawText);
  elements.modelDebugMode.checked = Boolean(settings.modelDebugMode);
  elements.shareStatsWithServer.checked = Boolean(settings.shareStatsWithServer);
  elements.enableCollectiveDefense.checked = Boolean(settings.enableCollectiveDefense);
  syncProviderControls();
  loadModelOptions();

  renderRecent(scores);
  renderCategories(scores);
  renderDailyRollup(state.dailyRollups || {});
  renderModelDebug(state.modelDebugTraces || []);
  renderPrivacyStatus(state, scores);
}

function renderLanguageOptions() {
  elements.language.innerHTML = "";
  for (const [value, labelKey] of i18n.LANGUAGE_OPTIONS) {
    const option = document.createElement("option");
    option.value = value;
    option.dataset.i18n = labelKey;
    option.textContent = t(labelKey);
    elements.language.append(option);
  }
}

function applyLanguage(preference) {
  translator = i18n.createTranslator(preference);
  document.documentElement.lang = translator.language;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  for (const option of elements.language.options) {
    option.textContent = t(option.dataset.i18n);
  }
  syncProviderControls();
}

function renderRecent(scores) {
  elements.recentList.innerHTML = "";
  const recent = scores
    .sort((left, right) => String(right.analyzedAt).localeCompare(String(left.analyzedAt)))
    .slice(0, 8);

  if (!recent.length) {
    const empty = document.createElement("div");
    empty.className = "recent-empty";
    empty.textContent = t("noRecentPosts");
    elements.recentList.append(empty);
    return;
  }

  for (const score of recent) {
    const item = document.createElement("div");
    item.className = "recent-item";
    const title = document.createElement("strong");
    title.textContent = t("recentTitle", {
      platform: score.platform || "feed",
      source: score.source || t("statusLocal").toLowerCase(),
      toxicity: formatPercent(score.scores.toxicity)
    });
    const detail = document.createElement("span");
    detail.textContent = t("recentDetail", {
      confidence: formatPercent(score.confidence),
      contentType: contentClassLabel(score.classification?.primary),
      reason: score.explanations?.[0]?.reason || t("localEstimateRecorded")
    });
    item.append(title, detail);
    elements.recentList.append(item);
  }
}

function renderCategories(scores) {
  elements.categoryDetails.innerHTML = "";
  const categories = [
    ["toxicity", t("categoryToxicity")],
    ["anger", t("categoryAnger")],
    ["fear", t("categoryFear")],
    ["hostility", t("categoryHostility")],
    ["informationDensity", t("categoryInformationDensity")],
    ["evidencePresence", t("categoryEvidencePresence")],
    ["propagandaRisk", t("categoryPropagandaRisk")],
    ["botSignal", t("categoryBotSignal")],
    ["coordinationRisk", t("categoryCoordinationRisk")]
  ];

  for (const [key, label] of categories) {
    const average = averageScore(scores, key);
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <span>${label}</span>
      <meter min="0" max="1" value="${average}"></meter>
      <strong>${formatPercent(average)}</strong>
    `;
    elements.categoryDetails.append(row);
  }
}

function renderPrivacyStatus(state, scores) {
  const settings = state.settings || {};
  const hasRawText = scores.some((score) => typeof score.item?.text === "string");
  const rows = [
    [t("privacyAnalysisEndpoint"), analysisEndpointLabel(settings)],
    [t("privacyRawVisibleText"), settings.storeRawText || hasRawText ? t("storedLocally") : t("notStoredByDefault")],
    [t("privacyRetention"), t("retentionValue", { days: settings.retentionDays || 30 })],
    [t("privacyCloudServices"), cloudServicesLabel(settings)],
    [t("privacyDataClearing"), t("availableFromPanel")]
  ];

  elements.privacyStatus.innerHTML = "";
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    elements.privacyStatus.append(term, detail);
  }
}

function renderDailyRollup(dailyRollups) {
  const today = new Date().toISOString().slice(0, 10);
  const rollup = dailyRollups[today] || {
    postsAnalyzed: 0,
    highToxicityPosts: 0,
    totalAnger: 0,
    totalFear: 0,
    totalPropagandaRisk: 0,
    sources: {
      webllm: 0,
      ollama: 0,
      heuristic: 0
    }
  };
  const analyzed = rollup.postsAnalyzed || 0;
  const rows = [
    [t("date"), today],
    [t("metricAnalyzed"), String(analyzed)],
    [t("metricHighToxicity"), String(rollup.highToxicityPosts || 0)],
    [t("avgEmotion"), formatPercent(averageEmotion(rollup))],
    [t("avgPropaganda"), formatPercent(analyzed ? rollup.totalPropagandaRisk / analyzed : 0)],
    [
      t("sources"),
      t("rollupSources", {
        ollama: rollup.sources?.ollama || 0,
        webllm: rollup.sources?.webllm || 0,
        openai: rollup.sources?.openaiCompatible || 0,
        heuristic: rollup.sources?.heuristic || 0
      })
    ]
  ];

  elements.dailyRollup.innerHTML = "";
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    elements.dailyRollup.append(term, detail);
  }
}

function renderModelDebug(traces) {
  elements.modelDebugList.innerHTML = "";

  if (!traces.length) {
    const empty = document.createElement("div");
    empty.className = "recent-empty";
    empty.textContent = t("modelDebugEmpty");
    elements.modelDebugList.append(empty);
    return;
  }

  for (const trace of traces.slice(0, 6)) {
    const details = document.createElement("details");
    details.className = "debug-item";
    const summary = document.createElement("summary");
    summary.textContent = t("modelDebugSummary", {
      status: trace.ok ? t("debugStatusOk") : t("debugStatusFailed"),
      provider: trace.provider || t("contentClassUnknown"),
      parseStatus: trace.parseStatus || "unknown",
      score: formatPercent(trace.normalized?.scores?.toxicity || 0)
    });

    const meta = document.createElement("dl");
    meta.className = "debug-meta";
    appendDebugRow(meta, t("debugCheckedAt"), trace.checkedAt || "");
    appendDebugRow(meta, t("debugModel"), trace.model || "");
    appendDebugRow(meta, t("debugHttpStatus"), String(trace.httpStatus || trace.firstHttpStatus || ""));
    appendDebugRow(meta, t("debugEndpoint"), trace.endpoint || "");
    appendDebugRow(meta, t("debugNormalizedScores"), JSON.stringify(trace.normalized?.scores || {}, null, 2));
    appendDebugRow(meta, t("debugClassification"), JSON.stringify(trace.normalized?.classification || {}, null, 2));
    appendDebugRow(meta, t("debugRawResponseShape"), JSON.stringify(trace.rawResponseShape || {}, null, 2));
    appendDebugRow(meta, t("debugError"), trace.error || "");

    const raw = document.createElement("pre");
    raw.className = "debug-pre";
    raw.textContent = trace.rawMessageContent || t("debugNoRawContent");

    const parsed = document.createElement("pre");
    parsed.className = "debug-pre";
    parsed.textContent = trace.parsed || t("debugNoParsedJson");

    const rawTitle = document.createElement("strong");
    rawTitle.textContent = t("debugRawModelContent");
    const parsedTitle = document.createElement("strong");
    parsedTitle.textContent = t("debugParsedJson");

    details.append(
      summary,
      createDebugCopyActions(trace),
      meta,
      rawTitle,
      raw,
      parsedTitle,
      parsed
    );
    elements.modelDebugList.append(details);
  }
}

function createDebugCopyActions(trace) {
  const actions = document.createElement("div");
  actions.className = "debug-actions";
  actions.append(
    createDebugCopyButton(t("copyRequestButton"), () => debugRequestPayload(trace)),
    createDebugCopyButton(t("copyResponseButton"), () => debugResponsePayload(trace)),
    createDebugCopyButton(t("copyTraceButton"), () => debugFullPayload(trace))
  );
  return actions;
}

function createDebugCopyButton(label, payloadFactory) {
  const button = document.createElement("button");
  button.className = "secondary compact debug-copy";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const originalLabel = button.textContent;
    try {
      await copyText(JSON.stringify(payloadFactory(), null, 2));
      button.textContent = t("copiedButton");
    } catch {
      button.textContent = t("copyFailedButton");
    } finally {
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1200);
    }
  });
  return button;
}

function debugRequestPayload(trace) {
  return {
    provider: trace.provider,
    model: trace.model,
    endpoint: trace.endpoint,
    request: trace.request || null,
    retryRequest: trace.retryRequest || null
  };
}

function debugResponsePayload(trace) {
  return {
    provider: trace.provider,
    model: trace.model,
    ok: trace.ok,
    httpStatus: trace.httpStatus,
    firstHttpStatus: trace.firstHttpStatus,
    parseStatus: trace.parseStatus,
    retryParsed: trace.retryParsed,
    rawResponseShape: trace.rawResponseShape || null,
    rawMessageContent: trace.rawMessageContent || "",
    parsed: parseDebugJsonText(trace.parsed),
    normalized: trace.normalized || null,
    error: trace.error || ""
  };
}

function debugFullPayload(trace) {
  return {
    checkedAt: trace.checkedAt,
    ...debugRequestPayload(trace),
    response: debugResponsePayload(trace)
  };
}

function parseDebugJsonText(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function appendDebugRow(list, label, value) {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = value || "-";
  list.append(term, detail);
}

function checkOllama() {
  const settings = readSettingsForm();
  const provider = settings.modelProvider || "webllm";
  elements.ollamaStatus.textContent = t("checkingProvider", { provider: providerLabel(provider) });
  elements.ollamaDetail.textContent =
    provider === "openai-compatible"
      ? t("contactingUrl", { url: settings.openaiBaseUrl })
      : provider === "webllm"
        ? t("checkingWebLlm")
        : t("contactingUrl", { url: "http://localhost:11434" });
  if (provider === "webllm") {
    renderWebLlmProgress({ progressPercent: 0, ready: false, progressText: t("checkingWebLlm") });
    startWebLlmStatusPolling(settings);
  }
  chrome.runtime.sendMessage({ type: "PCFA_CHECK_OLLAMA", settings }, (response) => {
    stopWebLlmStatusPolling();
    if (!response?.ok || !response.health?.available) {
      elements.ollamaStatus.textContent = t("providerUnavailable", { provider: providerLabel(provider) });
      elements.ollamaDetail.textContent = response?.error || t("localHealthCheckFailed");
      renderWebLlmProgress(response?.health?.status || null);
      return;
    }

    const models = response.health.models || [];
    updateModelOptions(models, settings.model);
    elements.ollamaStatus.textContent = t("providerAvailable", {
      provider: providerLabel(response.health.provider),
      latency: response.health.latencyMs
    });
    renderWebLlmProgress(response.health.status || null);
    elements.ollamaDetail.textContent = modelListStatusText(provider, models);
  });
}

function loadModelOptions() {
  const settings = readSettingsForm();
  if (settings.modelProvider !== "webllm") {
    updateModelOptions([settings.model].filter(Boolean), settings.model);
    return;
  }

  chrome.runtime.sendMessage({ type: "PCFA_GET_MODEL_OPTIONS", settings }, (response) => {
    if (!response?.ok) {
      updateModelOptions([settings.model].filter(Boolean), settings.model);
      return;
    }
    updateModelOptions(response.modelOptions?.models || [], settings.model);
    renderWebLlmProgress(response.modelOptions?.status || null);
  });
}

function updateModelOptions(models, selectedModel) {
  const options = Array.from(new Set([selectedModel, ...models].filter(Boolean)));
  elements.modelOptions.innerHTML = "";
  for (const model of options) {
    const option = document.createElement("option");
    option.value = model;
    elements.modelOptions.append(option);
  }
}

function startWebLlmStatusPolling(settings) {
  stopWebLlmStatusPolling();
  webLlmStatusPoll = setInterval(() => {
    chrome.runtime.sendMessage({ type: "PCFA_GET_MODEL_OPTIONS", settings }, (response) => {
      if (!response?.ok) {
        return;
      }
      const status = response.modelOptions?.status;
      renderWebLlmProgress(status || null);
      updateModelOptions(response.modelOptions?.models || [], settings.model);
      if (status?.ready || status?.error) {
        stopWebLlmStatusPolling();
      }
    });
  }, 600);
}

function stopWebLlmStatusPolling() {
  if (webLlmStatusPoll) {
    clearInterval(webLlmStatusPoll);
    webLlmStatusPoll = null;
  }
}

function renderWebLlmProgress(status) {
  if (elements.modelProvider.value !== "webllm" || !status || status.ready) {
    elements.webLlmProgressWrap.hidden = true;
    return;
  }

  const percent = Number.isFinite(Number(status.progressPercent))
    ? Math.round(Number(status.progressPercent))
    : 0;
  elements.webLlmProgress.value = Math.max(0, Math.min(100, percent));
  elements.webLlmProgressText.textContent = t("webLlmProgressPercent", { percent });
  elements.webLlmProgressWrap.hidden = false;
  if (status.progressText) {
    elements.ollamaDetail.textContent = t("webLlmLoadingDetail", {
      percent,
      detail: status.progressText
    });
  }
}

function modelListStatusText(provider, models) {
  if (!models.length) {
    return provider === "webllm" ? t("webLlmReady") : t("noLocalModels");
  }
  if (provider === "webllm" && models.length > 8) {
    return t("modelsFound", { count: models.length });
  }
  return t("modelsList", { models: models.join(", ") });
}

function saveSettings() {
  const settings = readSettingsForm();
  chrome.runtime.sendMessage({ type: "PCFA_UPDATE_SETTINGS", settings }, refreshState);
}

function readSettingsForm() {
  const settings = {
    modelProvider: elements.modelProvider.value,
    model: elements.model.value.trim() || defaultModelForProvider(elements.modelProvider.value),
    openaiBaseUrl: elements.openaiBaseUrl.value.trim() || "http://localhost:1234/v1",
    openaiApiKey: elements.openaiApiKey.value.trim(),
    webLlmTemperature: Number(elements.webLlmTemperature.value),
    webLlmMaxTokens: Number(elements.webLlmMaxTokens.value),
    language: elements.language.value,
    toxicityThreshold: Number(elements.toxicityThreshold.value),
    angerThreshold: Number(elements.angerThreshold.value),
    retentionDays: Number(elements.retentionDays.value),
    collapseAds: elements.collapseAds.checked,
    analysisMode: elements.analysisMode.checked ? "heuristic" : "model",
    storeRawText: elements.storeRawText.checked,
    modelDebugMode: elements.modelDebugMode.checked,
    shareStatsWithServer: elements.shareStatsWithServer.checked,
    enableCollectiveDefense: elements.enableCollectiveDefense.checked
  };
  return settings;
}

function clearData() {
  chrome.runtime.sendMessage({ type: "PCFA_CLEAR_DATA" }, refreshState);
}

function clearModelDebug() {
  chrome.runtime.sendMessage({ type: "PCFA_CLEAR_MODEL_DEBUG" }, refreshState);
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function averageScore(scores, key) {
  if (!scores.length) {
    return 0;
  }
  const total = scores.reduce((sum, score) => sum + Number(score.scores?.[key] || 0), 0);
  return Math.round((total / scores.length) * 100) / 100;
}

function averageEmotion(rollup) {
  const analyzed = rollup.postsAnalyzed || 0;
  if (!analyzed) {
    return 0;
  }
  const total = (rollup.totalAnger || 0) + (rollup.totalFear || 0);
  return Math.round((total / (analyzed * 2)) * 100) / 100;
}

function syncProviderControls() {
  const isOpenAICompatible = elements.modelProvider.value === "openai-compatible";
  const isWebLlm = elements.modelProvider.value === "webllm";
  for (const element of document.querySelectorAll(".provider-openai")) {
    element.hidden = !isOpenAICompatible;
  }
  for (const element of document.querySelectorAll(".provider-webllm")) {
    element.hidden = !isWebLlm;
  }
  elements.ollamaDetail.textContent = isOpenAICompatible
    ? t("verifyOpenAIEndpoint")
    : isWebLlm
      ? t("verifyWebLlm")
      : t("verifyLocalhost");
}

function providerLabel(provider) {
  if (provider === "openai-compatible") {
    return t("providerOpenAICompatible");
  }
  if (provider === "ollama") {
    return t("providerOllama");
  }
  return t("providerWebLlm");
}

function analysisEndpointLabel(settings) {
  if (settings.analysisMode === "heuristic") {
    return t("endpointHeuristicOnly");
  }
  if (settings.modelProvider === "openai-compatible") {
    return t("endpointOpenAICompatible", {
      url: settings.openaiBaseUrl || "http://localhost:1234/v1"
    });
  }
  if (settings.modelProvider === "ollama") {
    return t("endpointOllamaFallback");
  }
  return t("endpointWebLlmFallback");
}

function defaultModelForProvider(provider) {
  if (provider === "webllm") {
    return "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  }
  return provider === "openai-compatible" ? "" : "llama3.2";
}

function cloudServicesLabel(settings) {
  const enabled = [];
  if (settings.shareStatsWithServer) {
    enabled.push(t("statsSharingEnabled"));
  }
  if (settings.enableCollectiveDefense) {
    enabled.push(t("collectiveDefenseEnabled"));
  }
  return enabled.length ? enabled.join(" / ") : t("noExtensionCloudCalls");
}

function contentClassLabel(primary) {
  const key = {
    ad: "contentClassAd",
    propaganda: "contentClassPropaganda",
    chitchat: "contentClassChitchat",
    informational: "contentClassInformational",
    opinion: "contentClassOpinion",
    unknown: "contentClassUnknown"
  }[primary || "unknown"];
  return t(key || "contentClassUnknown");
}

function t(key, values) {
  return translator.t(key, values);
}
