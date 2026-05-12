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
  saveSettings: document.querySelector("#saveSettings"),
  clearData: document.querySelector("#clearData"),
  recentList: document.querySelector("#recentList")
};

document.addEventListener("DOMContentLoaded", refreshState);
elements.toxicityThreshold.addEventListener("input", () => {
  elements.thresholdValue.textContent = formatPercent(Number(elements.toxicityThreshold.value));
});
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearData.addEventListener("click", clearData);

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
    title.textContent = `${score.platform || "feed"} · toxicity ${formatPercent(score.scores.toxicity)}`;
    const detail = document.createElement("span");
    detail.textContent = score.explanations?.[0]?.reason || "Local estimate recorded.";
    item.append(title, detail);
    elements.recentList.append(item);
  }
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
