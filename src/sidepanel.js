const elements = {
  runtimeStatus: document.querySelector("#runtimeStatus"),
  postsAnalyzed: document.querySelector("#postsAnalyzed"),
  highToxicityPosts: document.querySelector("#highToxicityPosts"),
  averageToxicity: document.querySelector("#averageToxicity"),
  averageInfo: document.querySelector("#averageInfo"),
  language: document.querySelector("#language"),
  modelProvider: document.querySelector("#modelProvider"),
  model: document.querySelector("#model"),
  openaiBaseUrl: document.querySelector("#openaiBaseUrl"),
  openaiApiKey: document.querySelector("#openaiApiKey"),
  toxicityThreshold: document.querySelector("#toxicityThreshold"),
  thresholdValue: document.querySelector("#thresholdValue"),
  retentionDays: document.querySelector("#retentionDays"),
  analysisMode: document.querySelector("#analysisMode"),
  storeRawText: document.querySelector("#storeRawText"),
  shareStatsWithServer: document.querySelector("#shareStatsWithServer"),
  enableCollectiveDefense: document.querySelector("#enableCollectiveDefense"),
  checkOllama: document.querySelector("#checkOllama"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  ollamaDetail: document.querySelector("#ollamaDetail"),
  saveSettings: document.querySelector("#saveSettings"),
  clearData: document.querySelector("#clearData"),
  recentList: document.querySelector("#recentList"),
  categoryDetails: document.querySelector("#categoryDetails"),
  dailyRollup: document.querySelector("#dailyRollup"),
  privacyStatus: document.querySelector("#privacyStatus")
};
const i18n = globalThis.PCFA_I18N;
let translator = i18n.createTranslator(i18n.AUTO_LANGUAGE);

document.addEventListener("DOMContentLoaded", init);
elements.toxicityThreshold.addEventListener("input", () => {
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
});
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearData.addEventListener("click", clearData);
elements.checkOllama.addEventListener("click", checkOllama);
elements.modelProvider.addEventListener("change", syncProviderControls);
elements.language.addEventListener("change", () => {
  applyLanguage(elements.language.value);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.metrics || changes.scores || changes.settings)) {
    refreshState();
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

  const provider = settings.modelProvider || "ollama";
  applyLanguage(settings.language || "auto");
  elements.language.value = settings.language || "auto";
  elements.runtimeStatus.textContent =
    settings.analysisMode === "heuristic" ? t("statusHeuristic") : providerLabel(provider);
  elements.postsAnalyzed.textContent = String(analyzed);
  elements.highToxicityPosts.textContent = String(metrics.highToxicityPosts || 0);
  elements.averageToxicity.textContent = formatPercent(analyzed ? metrics.totalToxicity / analyzed : 0);
  elements.averageInfo.textContent = formatPercent(analyzed ? metrics.totalInformationDensity / analyzed : 0);
  elements.modelProvider.value = provider;
  elements.model.value = settings.model || (provider === "openai-compatible" ? "" : "llama3.2");
  elements.openaiBaseUrl.value = settings.openaiBaseUrl || "http://localhost:1234/v1";
  elements.openaiApiKey.value = settings.openaiApiKey || "lm-studio";
  elements.toxicityThreshold.value = settings.toxicityThreshold ?? 0.72;
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
  elements.retentionDays.value = settings.retentionDays ?? 30;
  elements.analysisMode.checked = settings.analysisMode === "heuristic";
  elements.storeRawText.checked = Boolean(settings.storeRawText);
  elements.shareStatsWithServer.checked = Boolean(settings.shareStatsWithServer);
  elements.enableCollectiveDefense.checked = Boolean(settings.enableCollectiveDefense);
  syncProviderControls();

  renderRecent(scores);
  renderCategories(scores);
  renderDailyRollup(state.dailyRollups || {});
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

function checkOllama() {
  const settings = readSettingsForm();
  const provider = settings.modelProvider || "ollama";
  elements.ollamaStatus.textContent = t("checkingProvider", { provider: providerLabel(provider) });
  elements.ollamaDetail.textContent =
    provider === "openai-compatible"
      ? t("contactingUrl", { url: settings.openaiBaseUrl })
      : t("contactingUrl", { url: "http://localhost:11434" });
  chrome.runtime.sendMessage({ type: "PCFA_CHECK_OLLAMA", settings }, (response) => {
    if (!response?.ok || !response.health?.available) {
      elements.ollamaStatus.textContent = t("providerUnavailable", { provider: providerLabel(provider) });
      elements.ollamaDetail.textContent = response?.error || t("localHealthCheckFailed");
      return;
    }

    const models = response.health.models || [];
    elements.ollamaStatus.textContent = t("providerAvailable", {
      provider: providerLabel(response.health.provider),
      latency: response.health.latencyMs
    });
    elements.ollamaDetail.textContent = models.length
      ? t("modelsList", { models: models.join(", ") })
      : t("noLocalModels");
  });
}

function saveSettings() {
  const settings = readSettingsForm();
  chrome.runtime.sendMessage({ type: "PCFA_UPDATE_SETTINGS", settings }, refreshState);
}

function readSettingsForm() {
  const settings = {
    modelProvider: elements.modelProvider.value,
    model: elements.model.value.trim() || "llama3.2",
    openaiBaseUrl: elements.openaiBaseUrl.value.trim() || "http://localhost:1234/v1",
    openaiApiKey: elements.openaiApiKey.value.trim(),
    language: elements.language.value,
    toxicityThreshold: Number(elements.toxicityThreshold.value),
    retentionDays: Number(elements.retentionDays.value),
    analysisMode: elements.analysisMode.checked ? "heuristic" : "ollama",
    storeRawText: elements.storeRawText.checked,
    shareStatsWithServer: elements.shareStatsWithServer.checked,
    enableCollectiveDefense: elements.enableCollectiveDefense.checked
  };
  return settings;
}

function clearData() {
  chrome.runtime.sendMessage({ type: "PCFA_CLEAR_DATA" }, refreshState);
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
  for (const element of document.querySelectorAll(".provider-openai")) {
    element.hidden = !isOpenAICompatible;
  }
  elements.ollamaDetail.textContent = isOpenAICompatible
    ? t("verifyOpenAIEndpoint")
    : t("verifyLocalhost");
}

function providerLabel(provider) {
  return provider === "openai-compatible" ? t("providerOpenAICompatible") : t("providerOllama");
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
  return t("endpointOllamaFallback");
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
