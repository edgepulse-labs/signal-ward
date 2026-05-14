(() => {
  const STATE = {
    platform: detectPlatform(),
    observedIds: new Set(),
    pendingIds: new Set(),
    annotatedIds: new Set(),
    userExpandedIds: new Set(),
    results: new Map(),
    items: new Map(),
    observer: null,
    mutationTimer: null,
    contextAlive: true,
    settings: {
      toxicityThreshold: 0.72,
      angerThreshold: 0.8,
      collapseAds: false
    }
  };
  const i18n = globalThis.PCFA_I18N;
  let translator = i18n.createTranslator(STATE.settings.language || "auto");

  if (!STATE.platform) {
    return;
  }

  safeRuntimeSendMessage({ type: "PCFA_GET_STATE" }, (response) => {
    if (response?.ok && response.state?.settings) {
      STATE.settings = response.state.settings;
      applyLanguage();
    }
    boot();
  });

  safeAddStorageListener();

  function applyLanguage() {
    translator = i18n.createTranslator(STATE.settings.language || "auto");
    const marker = document.querySelector(".pcfa-page-marker");
    if (marker) {
      marker.textContent = t("pageMarker");
    }
    for (const node of document.querySelectorAll("[data-pcfa-toxicity][data-pcfa-item-id]")) {
      const result = STATE.results.get(node.dataset.pcfaItemId);
      if (result) {
        annotateResult(node, result);
      }
    }
  }

  function boot() {
    if (!STATE.contextAlive) {
      return;
    }
    injectPageMarker();
    scheduleStartupScans();
    STATE.observer = new MutationObserver(scheduleScan);
    STATE.observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", scheduleScan, { passive: true });
    window.addEventListener("resize", scheduleScan, { passive: true });
  }

  function scheduleStartupScans() {
    scanVisibleItems();
    for (const delay of [250, 750, 1500, 3000, 5000]) {
      window.setTimeout(scanVisibleItems, delay);
    }
  }

  function scheduleScan() {
    if (!STATE.contextAlive) {
      return;
    }
    window.clearTimeout(STATE.mutationTimer);
    STATE.mutationTimer = window.setTimeout(scanVisibleItems, 350);
  }

  function scanVisibleItems() {
    if (!STATE.contextAlive) {
      return;
    }
    const nodes = getCandidateNodes();
    for (const node of nodes) {
      if (node.dataset.pcfaScanState === "pending" || node.dataset.pcfaScanState === "done") {
        continue;
      }
      if (!isVisibleInViewport(node)) {
        continue;
      }

      const item = extractItem(node);
      if (!item || STATE.observedIds.has(item.id) || STATE.pendingIds.has(item.id)) {
        continue;
      }

      STATE.pendingIds.add(item.id);
      STATE.observedIds.add(item.id);
      STATE.items.set(item.id, item);
      node.dataset.pcfaScanState = "pending";
      annotatePending(node, item);
      safeRuntimeSendMessage({ type: "PCFA_ANALYZE_ITEM", item }, (response) => {
        STATE.pendingIds.delete(item.id);
        if (!STATE.contextAlive) {
          return;
        }
        if (!response?.ok) {
          node.dataset.pcfaScanState = "done";
          annotateError(node, response?.error || t("contentLocalAnalysisUnavailable"));
          return;
        }
        node.dataset.pcfaScanState = "done";
        annotateResult(node, response.result);
      });
    }
  }

  function getCandidateNodes() {
    if (STATE.platform === "x") {
      return uniqueElements(
        Array.from(document.querySelectorAll('article[data-testid="tweet"], article[role="article"]'))
      ).filter((node) => extractComparableText(node).length > 20);
    }

    return innermostCandidateNodes(uniqueElements(
      Array.from(
        document.querySelectorAll(
          'article, div[role="article"], div[data-pressable-container="true"]'
        )
      )
    ).filter((node) => extractComparableText(node).length > 40));
  }

  function uniqueElements(elements) {
    return Array.from(new Set(elements));
  }

  function innermostCandidateNodes(elements) {
    return elements.filter(
      (node) =>
        !elements.some(
          (other) =>
            other !== node &&
            node.contains(other) &&
            extractComparableText(other).length > 40
        )
    );
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
    const platformSignals = extractPlatformSignals(node);

    return {
      id: localHash([STATE.platform, authorHandle, text, url || ""].join("|")),
      platform: STATE.platform,
      url,
      authorHandle,
      authorDisplayName,
      text,
      visibleLinks,
      engagement: extractEngagement(node),
      platformSignals,
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
    removePcfaUi(clone);
    for (const removable of clone.querySelectorAll("svg, img, video, button")) {
      removable.remove();
    }
    return normalizeText(clone.innerText);
  }

  function extractComparableText(node) {
    const clone = node.cloneNode(true);
    removePcfaUi(clone);
    return normalizeText(clone.innerText);
  }

  function removePcfaUi(root) {
    for (const removable of root.querySelectorAll(
      ".pcfa-panel, .pcfa-collapse-notice, .pcfa-page-marker"
    )) {
      removable.remove();
    }
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

  function extractPlatformSignals(node) {
    const text = normalizeText(node.innerText || "");
    return {
      isConfirmedAd: /(^|\s)(廣告|广告|Ad|Promoted|Sponsored)(\s|$)/i.test(text)
    };
  }

  function annotatePending(node, item) {
    const box = ensurePanel(node, item.id);
    box.innerHTML = "";
    box.append(createPendingDetails());
  }

  function annotateError(node, message) {
    const box = ensurePanel(node);
    box.innerHTML = "";
    box.append(createBadge("PCFA", message, "warning"));
  }

  function annotateResult(node, result) {
    STATE.results.set(result.itemId, result);
    const box = ensurePanel(node, result.itemId);
    const scores = result.scores;
    const shouldCollapse = shouldCollapseResult(result);

    node.dataset.pcfaToxicity = String(scores.toxicity);
    node.dataset.pcfaAnger = String(scores.anger);
    node.dataset.pcfaConfidence = String(result.confidence);
    node.dataset.pcfaItemId = result.itemId;
    box.innerHTML = "";
    box.append(createDetails(result, node));

    if (shouldCollapse) {
      expandNode(node);
      collapseNode(node, result);
    } else {
      expandNode(node);
    }

    STATE.annotatedIds.add(result.itemId);
  }

  function ensurePanel(node, itemId = "") {
    let panel = node.querySelector(".pcfa-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "pcfa-panel";
    }
    panel.dataset.pcfaItemId = itemId;

    const target = findAnnotationContainer(node);
    const anchor = STATE.platform === "x" ? findXActionGroup(node) : null;
    if (anchor?.parentElement) {
      if (panel.parentElement !== anchor.parentElement || panel.previousElementSibling !== anchor) {
        anchor.insertAdjacentElement("afterend", panel);
      }
    } else if (panel.parentElement !== target) {
      target.append(panel);
    }
    return panel;
  }

  function findAnnotationContainer(node) {
    if (STATE.platform !== "x") {
      return node;
    }

    const textNode = node.querySelector('[data-testid="tweetText"]');
    if (!textNode) {
      return node;
    }

    let candidate = textNode;
    while (candidate.parentElement && candidate.parentElement !== node) {
      const parent = candidate.parentElement;
      if (
        parent.querySelector('[data-testid="User-Name"]') &&
        parent.querySelector('[role="group"]')
      ) {
        return parent;
      }
      candidate = parent;
    }

    return textNode.parentElement || node;
  }

  function findXActionGroup(node) {
    const groups = Array.from(node.querySelectorAll('[role="group"]'));
    return groups
      .filter((group) =>
        group.querySelector(
          '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"]'
        )
      )
      .at(-1) || null;
  }

  function createBadge(label, value, tone) {
    const badge = document.createElement("span");
    badge.className = `pcfa-badge pcfa-${tone}`;
    badge.textContent = `${label}: ${value}`;
    return badge;
  }

  function createConfidenceBadge(result) {
    const confidence = Number(result.confidence || 0);
    const isLowConfidence = confidence < 0.45 || result.item?.extractionConfidence < 0.55;
    const label = isLowConfidence ? t("badgeUncertain") : t("badgeConfidence");
    const tone = isLowConfidence ? "warning" : "neutral";
    return createBadge(label, formatScore(confidence), tone);
  }

  function shouldCollapseResult(result) {
    if (STATE.userExpandedIds.has(result.itemId)) {
      return false;
    }
    const scores = result.scores || {};
    const toxicityThreshold = STATE.settings.toxicityThreshold ?? 0.72;
    const angerThreshold = STATE.settings.angerThreshold ?? 0.8;
    return (
      Number(scores.toxicity || 0) >= toxicityThreshold ||
      Number(scores.anger || 0) >= angerThreshold ||
      (Boolean(STATE.settings.collapseAds) && result.classification?.primary === "ad")
    );
  }

  function createPendingDetails() {
    const details = document.createElement("details");
    details.className = "pcfa-details pcfa-pending";
    const summary = document.createElement("summary");
    summary.className = "pcfa-summary";
    const status = document.createElement("span");
    status.className = "pcfa-pending-text";
    status.textContent = t("contentAnalyzingLocally");
    summary.append(createBrandMark(), status);
    details.append(summary);
    return details;
  }

  function createDetails(result, node) {
    const details = document.createElement("details");
    details.className = "pcfa-details";
    const summary = document.createElement("summary");
    summary.className = "pcfa-summary";
    summary.append(createBrandMark());
    summary.append(
      createBadge(
        t("badgeContentType"),
        contentClassLabel(result.classification?.primary),
        classificationTone(result.classification?.primary)
      ),
      createConfidenceBadge(result),
      createBadge(
        t("badgeToxicity"),
        formatScore(result.scores.toxicity),
        scoreTone(result.scores.toxicity)
      ),
      createBadge(t("badgeAnger"), formatScore(result.scores.anger), scoreTone(result.scores.anger)),
      createBadge(
        t("badgeInfo"),
        formatScore(result.scores.informationDensity),
        scoreTone(1 - result.scores.informationDensity)
      ),
      createExpandLabel(result),
      createReanalyzeButton(result, node)
    );
    const list = document.createElement("ul");

    for (const explanation of result.explanations || []) {
      const item = document.createElement("li");
      item.textContent = `${categoryLabel(explanation.category)}: ${explanation.reason}`;
      list.append(item);
    }

    if (result.summary) {
      const item = document.createElement("li");
      item.textContent = `${t("summaryLabel")}: ${result.summary}`;
      list.append(item);
    }

    if (result.fallbackReason) {
      const item = document.createElement("li");
      item.textContent = t("modelFallbackNotice", { reason: result.fallbackReason });
      list.append(item);
    }

    if (Number(result.confidence || 0) < 0.45) {
      const item = document.createElement("li");
      item.textContent = t("uncertainDetail");
      list.append(item);
    }

    details.append(summary, list);
    return details;
  }

  function createReanalyzeButton(result, node) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pcfa-reanalyze";
    button.title = t("reanalyzeTitle");
    button.setAttribute("aria-label", t("reanalyzeTitle"));
    button.textContent = "↻";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      reanalyzeNode(node, result);
    });
    return button;
  }

  function reanalyzeNode(node, result) {
    const item = extractItem(node) || STATE.items.get(result.itemId);
    if (!item || STATE.pendingIds.has(item.id)) {
      return;
    }
    STATE.items.set(item.id, item);
    STATE.pendingIds.add(item.id);
    node.dataset.pcfaScanState = "pending";
    annotatePending(node, item);
    safeRuntimeSendMessage({ type: "PCFA_ANALYZE_ITEM", item, force: true }, (response) => {
      STATE.pendingIds.delete(item.id);
      if (!STATE.contextAlive) {
        return;
      }
      node.dataset.pcfaScanState = "done";
      if (!response?.ok) {
        annotateError(node, response?.error || t("contentLocalAnalysisUnavailable"));
        return;
      }
      annotateResult(node, response.result);
    });
  }

  function createBrandMark() {
    const brand = document.createElement("span");
    brand.className = "pcfa-brand";
    const icon = document.createElement("img");
    icon.className = "pcfa-brand-icon";
    icon.alt = "";
    const iconUrl = safeRuntimeGetURL("assets/icons/icon-32.png");
    if (iconUrl) {
      icon.src = iconUrl;
    }
    const text = document.createElement("span");
    text.textContent = "PCFA";
    brand.append(...(iconUrl ? [icon] : []), text);
    return brand;
  }

  function safeAddStorageListener() {
    try {
      if (!chrome?.storage?.onChanged || !chrome?.runtime?.id) {
        invalidateContext();
        return;
      }
      chrome.storage.onChanged.addListener(handleStorageChanged);
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        invalidateContext();
      }
    }
  }

  function handleStorageChanged(changes, areaName) {
    if (!STATE.contextAlive) {
      return;
    }
    if (areaName === "local" && changes.settings?.newValue) {
      STATE.settings = changes.settings.newValue;
      applyLanguage();
      refreshCollapseState();
    }
  }

  function safeRuntimeSendMessage(message, callback) {
    if (!STATE.contextAlive) {
      return false;
    }

    try {
      if (!chrome?.runtime?.id) {
        invalidateContext();
        return false;
      }
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          if (isContextInvalidatedError(error)) {
            invalidateContext();
            return;
          }
          callback?.({ ok: false, error: error.message });
          return;
        }
        callback?.(response);
      });
      return true;
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        invalidateContext();
        return false;
      }
      callback?.({ ok: false, error: error.message });
      return false;
    }
  }

  function safeRuntimeGetURL(path) {
    if (!STATE.contextAlive) {
      return "";
    }
    try {
      if (!chrome?.runtime?.id) {
        invalidateContext();
        return "";
      }
      return chrome.runtime.getURL(path);
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        invalidateContext();
      }
      return "";
    }
  }

  function invalidateContext() {
    if (!STATE.contextAlive) {
      return;
    }
    STATE.contextAlive = false;
    window.clearTimeout(STATE.mutationTimer);
    STATE.observer?.disconnect();
    window.removeEventListener("scroll", scheduleScan);
    window.removeEventListener("resize", scheduleScan);
    try {
      chrome?.storage?.onChanged?.removeListener(handleStorageChanged);
    } catch {
      // The extension context is already gone.
    }
  }

  function isContextInvalidatedError(error) {
    return String(error?.message || error || "")
      .toLowerCase()
      .includes("extension context invalidated");
  }

  function createExpandLabel(result) {
    const label = document.createElement("span");
    label.className = "pcfa-expand-label";
    label.textContent =
      result.source === "heuristic" ? t("heuristicExplanation") : t("localModelExplanation");
    return label;
  }

  function collapseNode(node, result) {
    if (node.classList.contains("pcfa-collapsed")) {
      return;
    }

    node.classList.add("pcfa-collapsed");
    const control = document.createElement("button");
    control.type = "button";
    control.className = "pcfa-restore";
    control.textContent = t("showOriginal");
    control.addEventListener("click", () => {
      STATE.userExpandedIds.add(result.itemId);
      node.dataset.pcfaUserExpanded = "true";
      expandNode(node);
    });

    const notice = document.createElement("div");
    notice.className = "pcfa-collapse-notice";
    notice.textContent = t("collapsedNotice", {
      toxicity: formatScore(result.scores.toxicity),
      anger: formatScore(result.scores.anger),
      contentType: contentClassLabel(result.classification?.primary)
    });
    notice.append(control);
    const target = findAnnotationContainer(node);
    const panel = target.querySelector(".pcfa-panel");
    target.insertBefore(notice, panel || null);
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
      const userExpanded = node.dataset.pcfaUserExpanded === "true";
      const result = STATE.results.get(node.dataset.pcfaItemId);
      if (userExpanded || (result && !shouldCollapseResult(result))) {
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
    marker.textContent = t("pageMarker");
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
    if (host === "threads.com" || host === "www.threads.com") {
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

  function classificationTone(primary) {
    if (primary === "ad" || primary === "propaganda") return "medium";
    if (primary === "chitchat") return "neutral";
    if (primary === "informational") return "low";
    return "neutral";
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

  function categoryLabel(category) {
    const key = {
      anger: "categoryAnger",
      botSignal: "categoryBotSignal",
      coordinationRisk: "categoryCoordinationRisk",
      evidence: "categoryEvidencePresence",
      evidencePresence: "categoryEvidencePresence",
      fear: "categoryFear",
      hostility: "categoryHostility",
      informationDensity: "categoryInformationDensity",
      overall: "categoryOverall",
      propagandaRisk: "categoryPropagandaRisk",
      toxicity: "categoryToxicity"
    }[category];
    return key ? t(key) : category;
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

  function t(key, values) {
    return translator.t(key, values);
  }
})();
