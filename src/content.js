(() => {
  const STATE = {
    platform: detectPlatform(),
    observedIds: new Set(),
    annotatedIds: new Set(),
    observer: null,
    mutationTimer: null,
    settings: {
      toxicityThreshold: 0.72
    }
  };

  if (!STATE.platform) {
    return;
  }

  chrome.runtime.sendMessage({ type: "PCFA_GET_STATE" }, (response) => {
    if (response?.ok && response.state?.settings) {
      STATE.settings = response.state.settings;
    }
    boot();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.settings?.newValue) {
      STATE.settings = changes.settings.newValue;
      refreshCollapseState();
    }
  });

  function boot() {
    injectPageMarker();
    scanVisibleItems();
    const mutationObserver = new MutationObserver(scheduleScan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", scheduleScan, { passive: true });
    window.addEventListener("resize", scheduleScan, { passive: true });
  }

  function scheduleScan() {
    window.clearTimeout(STATE.mutationTimer);
    STATE.mutationTimer = window.setTimeout(scanVisibleItems, 350);
  }

  function scanVisibleItems() {
    const nodes = getCandidateNodes();
    for (const node of nodes) {
      if (!isVisibleInViewport(node)) {
        continue;
      }

      const item = extractItem(node);
      if (!item || STATE.observedIds.has(item.id)) {
        continue;
      }

      STATE.observedIds.add(item.id);
      annotatePending(node, item);
      chrome.runtime.sendMessage({ type: "PCFA_ANALYZE_ITEM", item }, (response) => {
        if (!response?.ok) {
          annotateError(node, response?.error || "Local analysis unavailable.");
          return;
        }
        annotateResult(node, response.result);
      });
    }
  }

  function getCandidateNodes() {
    if (STATE.platform === "x") {
      return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    }

    return Array.from(
      document.querySelectorAll('div[role="article"], div[data-pressable-container="true"]')
    ).filter((node) => normalizeText(node.innerText).length > 40);
  }

  function extractItem(node) {
    const text = extractMainText(node);
    if (!text || text.length < 12) {
      return null;
    }

    const authorHandle = extractAuthorHandle(node);
    const authorDisplayName = extractAuthorDisplayName(node);
    const visibleLinks = Array.from(node.querySelectorAll("a[href]"))
      .map((link) => link.href)
      .filter((href) => href && !href.startsWith("javascript:"))
      .slice(0, 8);
    const url = visibleLinks.find((href) => /\/status\/|\/post\//.test(href));
    const observedAt = new Date().toISOString();

    return {
      id: localHash([STATE.platform, authorHandle, text, url || ""].join("|")),
      platform: STATE.platform,
      url,
      authorHandle,
      authorDisplayName,
      text,
      visibleLinks,
      engagement: extractEngagement(node),
      observedAt,
      extractionConfidence: estimateExtractionConfidence({ text, authorHandle, url })
    };
  }

  function extractMainText(node) {
    if (STATE.platform === "x") {
      const tweetTextNodes = Array.from(node.querySelectorAll('[data-testid="tweetText"]'));
      const text = tweetTextNodes.map((item) => item.innerText).join("\n");
      return normalizeText(text || node.innerText);
    }

    const clone = node.cloneNode(true);
    for (const removable of clone.querySelectorAll("svg, img, video, button")) {
      removable.remove();
    }
    return normalizeText(clone.innerText);
  }

  function extractAuthorHandle(node) {
    const text = node.innerText || "";
    const handle = text.match(/@[A-Za-z0-9_]{2,}/);
    return handle ? handle[0] : "";
  }

  function extractAuthorDisplayName(node) {
    const lines = normalizeText(node.innerText).split(" ");
    return lines.find((line) => line && !line.startsWith("@")) || "";
  }

  function extractEngagement(node) {
    const labels = Array.from(node.querySelectorAll("[aria-label]"))
      .map((element) => element.getAttribute("aria-label"))
      .filter(Boolean);
    return { labels: labels.slice(0, 12) };
  }

  function annotatePending(node, item) {
    const box = ensurePanel(node, item.id);
    box.innerHTML = "";
    box.append(createBadge("PCFA", "Analyzing locally...", "neutral"));
  }

  function annotateError(node, message) {
    const box = ensurePanel(node);
    box.innerHTML = "";
    box.append(createBadge("PCFA", message, "warning"));
  }

  function annotateResult(node, result) {
    const box = ensurePanel(node, result.itemId);
    const scores = result.scores;
    const threshold = STATE.settings.toxicityThreshold ?? 0.72;
    const shouldCollapse = scores.toxicity >= threshold;

    node.dataset.pcfaToxicity = String(scores.toxicity);
    node.dataset.pcfaItemId = result.itemId;
    box.innerHTML = "";
    box.append(
      createBadge("Toxicity", formatScore(scores.toxicity), scoreTone(scores.toxicity)),
      createBadge("Anger", formatScore(scores.anger), scoreTone(scores.anger)),
      createBadge("Info", formatScore(scores.informationDensity), scoreTone(1 - scores.informationDensity)),
      createDetails(result)
    );

    if (shouldCollapse) {
      collapseNode(node, result);
    } else {
      expandNode(node);
    }

    STATE.annotatedIds.add(result.itemId);
  }

  function ensurePanel(node, itemId = "") {
    let panel = node.querySelector(":scope > .pcfa-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "pcfa-panel";
      panel.dataset.pcfaItemId = itemId;
      node.prepend(panel);
    }
    return panel;
  }

  function createBadge(label, value, tone) {
    const badge = document.createElement("span");
    badge.className = `pcfa-badge pcfa-${tone}`;
    badge.textContent = `${label}: ${value}`;
    return badge;
  }

  function createDetails(result) {
    const details = document.createElement("details");
    details.className = "pcfa-details";
    const summary = document.createElement("summary");
    summary.textContent = result.source === "ollama" ? "Local model explanation" : "Heuristic explanation";
    const list = document.createElement("ul");

    for (const explanation of result.explanations || []) {
      const item = document.createElement("li");
      item.textContent = `${explanation.category}: ${explanation.reason}`;
      list.append(item);
    }

    if (result.summary) {
      const item = document.createElement("li");
      item.textContent = `Summary: ${result.summary}`;
      list.append(item);
    }

    details.append(summary, list);
    return details;
  }

  function collapseNode(node, result) {
    if (node.classList.contains("pcfa-collapsed")) {
      return;
    }

    node.classList.add("pcfa-collapsed");
    const control = document.createElement("button");
    control.type = "button";
    control.className = "pcfa-restore";
    control.textContent = "Show original";
    control.addEventListener("click", () => expandNode(node));

    const notice = document.createElement("div");
    notice.className = "pcfa-collapse-notice";
    notice.textContent = `Collapsed by local estimate: toxicity ${formatScore(result.scores.toxicity)}.`;
    notice.append(control);
    node.prepend(notice);
  }

  function expandNode(node) {
    node.classList.remove("pcfa-collapsed");
    const notice = node.querySelector(":scope > .pcfa-collapse-notice");
    if (notice) {
      notice.remove();
    }
  }

  function refreshCollapseState() {
    for (const node of document.querySelectorAll("[data-pcfa-toxicity]")) {
      const toxicity = Number(node.dataset.pcfaToxicity);
      if (Number.isFinite(toxicity) && toxicity < (STATE.settings.toxicityThreshold ?? 0.72)) {
        expandNode(node);
      }
    }
  }

  function injectPageMarker() {
    if (document.querySelector(".pcfa-page-marker")) {
      return;
    }
    const marker = document.createElement("div");
    marker.className = "pcfa-page-marker";
    marker.textContent = "PCFA local";
    document.documentElement.append(marker);
  }

  function detectPlatform() {
    const host = location.hostname;
    if (host === "x.com" || host === "twitter.com") {
      return "x";
    }
    if (host === "threads.net" || host === "www.threads.net") {
      return "threads";
    }
    return "";
  }

  function isVisibleInViewport(element) {
    const rect = element.getBoundingClientRect();
    const height = window.innerHeight || document.documentElement.clientHeight;
    const width = window.innerWidth || document.documentElement.clientWidth;
    return rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width;
  }

  function estimateExtractionConfidence(item) {
    let confidence = 0.35;
    if (item.text.length > 30) confidence += 0.25;
    if (item.authorHandle) confidence += 0.2;
    if (item.url) confidence += 0.1;
    return Math.min(0.95, confidence);
  }

  function formatScore(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function scoreTone(value) {
    if (value >= 0.7) return "high";
    if (value >= 0.4) return "medium";
    return "low";
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function localHash(value) {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 33) ^ value.charCodeAt(index);
    }
    return `pcfa_${(hash >>> 0).toString(16)}`;
  }
})();
