const elements = {
  runtimeStatus: document.querySelector("#runtimeStatus"),
  postsAnalyzed: document.querySelector("#postsAnalyzed"),
  highToxicityPosts: document.querySelector("#highToxicityPosts"),
  averageToxicity: document.querySelector("#averageToxicity"),
  averageInfo: document.querySelector("#averageInfo"),
  model: document.querySelector("#model"),
  toxicityThreshold: document.querySelector("#toxicityThreshold"),
  thresholdValue: document.querySelector("#thresholdValue"),
  analysisMode: document.querySelector("#analysisMode"),
  storeRawText: document.querySelector("#storeRawText"),
  checkOllama: document.querySelector("#checkOllama"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  ollamaDetail: document.querySelector("#ollamaDetail"),
  saveSettings: document.querySelector("#saveSettings"),
  clearData: document.querySelector("#clearData"),
  recentList: document.querySelector("#recentList"),
  categoryDetails: document.querySelector("#categoryDetails"),
  privacyStatus: document.querySelector("#privacyStatus")
};

document.addEventListener("DOMContentLoaded", refreshState);
elements.toxicityThreshold.addEventListener("input", () => {
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
});
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearData.addEventListener("click", clearData);
elements.checkOllama.addEventListener("click", checkOllama);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.metrics || changes.scores || changes.settings)) {
    refreshState();
  }
});

function refreshState() {
  chrome.runtime.sendMessage({ type: "PCFA_GET_STATE" }, (response) => {
    if (!response?.ok) {
      elements.runtimeStatus.textContent = "Unavailable";
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

  elements.runtimeStatus.textContent = settings.analysisMode === "heuristic" ? "Heuristic" : "Ollama";
  elements.postsAnalyzed.textContent = String(analyzed);
  elements.highToxicityPosts.textContent = String(metrics.highToxicityPosts || 0);
  elements.averageToxicity.textContent = formatPercent(analyzed ? metrics.totalToxicity / analyzed : 0);
  elements.averageInfo.textContent = formatPercent(analyzed ? metrics.totalInformationDensity / analyzed : 0);
  elements.model.value = settings.model || "llama3.2";
  elements.toxicityThreshold.value = settings.toxicityThreshold ?? 0.72;
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
  elements.analysisMode.checked = settings.analysisMode === "heuristic";
  elements.storeRawText.checked = Boolean(settings.storeRawText);

  renderRecent(scores);
  renderCategories(scores);
  renderPrivacyStatus(state, scores);
}

function renderRecent(scores) {
  elements.recentList.innerHTML = "";
  const recent = scores
    .sort((left, right) => String(right.analyzedAt).localeCompare(String(left.analyzedAt)))
    .slice(0, 8);

  if (!recent.length) {
    const empty = document.createElement("div");
    empty.className = "recent-empty";
    empty.textContent = "No analyzed posts yet. Open X or Threads and browse normally.";
    elements.recentList.append(empty);
    return;
  }

  for (const score of recent) {
    const item = document.createElement("div");
    item.className = "recent-item";
    const title = document.createElement("strong");
    title.textContent = `${score.platform || "feed"} · ${score.source || "local"} · toxicity ${formatPercent(score.scores.toxicity)}`;
    const detail = document.createElement("span");
    detail.textContent = `${formatPercent(score.confidence)} confidence · ${
      score.explanations?.[0]?.reason || "Local estimate recorded."
    }`;
    item.append(title, detail);
    elements.recentList.append(item);
  }
}

function renderCategories(scores) {
  elements.categoryDetails.innerHTML = "";
  const categories = [
    ["toxicity", "Toxicity"],
    ["anger", "Anger"],
    ["fear", "Fear"],
    ["hostility", "Hostility"],
    ["informationDensity", "Information density"],
    ["evidencePresence", "Evidence"],
    ["propagandaRisk", "Propaganda risk"],
    ["botSignal", "Bot signal"],
    ["coordinationRisk", "Coordination risk"]
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
    ["Analysis endpoint", settings.analysisMode === "heuristic" ? "Local heuristic only" : "Local Ollama / heuristic fallback"],
    ["Raw visible text", settings.storeRawText || hasRawText ? "Stored locally" : "Not stored by default"],
    ["Cloud services", "No extension cloud calls configured"],
    ["Data clearing", "Available from this panel"]
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

function checkOllama() {
  elements.ollamaStatus.textContent = "Checking Ollama...";
  elements.ollamaDetail.textContent = "Contacting http://localhost:11434.";
  chrome.runtime.sendMessage({ type: "PCFA_CHECK_OLLAMA" }, (response) => {
    if (!response?.ok || !response.health?.available) {
      elements.ollamaStatus.textContent = "Ollama unavailable";
      elements.ollamaDetail.textContent = response?.error || "Local health check failed.";
      return;
    }

    const models = response.health.models || [];
    elements.ollamaStatus.textContent = `Ollama available (${response.health.latencyMs} ms)`;
    elements.ollamaDetail.textContent = models.length
      ? `Models: ${models.join(", ")}`
      : "No local models reported by Ollama.";
  });
}

function saveSettings() {
  const settings = {
    model: elements.model.value.trim() || "llama3.2",
    toxicityThreshold: Number(elements.toxicityThreshold.value),
    analysisMode: elements.analysisMode.checked ? "heuristic" : "ollama",
    storeRawText: elements.storeRawText.checked
  };

  chrome.runtime.sendMessage({ type: "PCFA_UPDATE_SETTINGS", settings }, refreshState);
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
