const DEFAULT_SETTINGS = {
  model: "llama3.2",
  toxicityThreshold: 0.72,
  analysisMode: "ollama",
  storeRawText: false
};

const DEFAULT_METRICS = {
  postsViewed: 0,
  postsAnalyzed: 0,
  highToxicityPosts: 0,
  totalInformationDensity: 0,
  totalToxicity: 0,
  totalAnger: 0,
  lastAnalyzedAt: null
};

const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["settings", "metrics", "scores"]);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!existing.metrics) {
    await chrome.storage.local.set({ metrics: DEFAULT_METRICS });
  }
  if (!existing.scores) {
    await chrome.storage.local.set({ scores: {} });
  }
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PCFA_ANALYZE_ITEM") {
    analyzeAndStore(message.item)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "PCFA_GET_STATE") {
    getState()
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "PCFA_UPDATE_SETTINGS") {
    updateSettings(message.settings)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "PCFA_CLEAR_DATA") {
    clearData()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "PCFA_CHECK_OLLAMA") {
    checkOllamaHealth()
      .then((health) => sendResponse({ ok: true, health }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function analyzeAndStore(item) {
  if (!item?.id || !item?.text) {
    throw new Error("Missing feed item id or text.");
  }

  const { settings = DEFAULT_SETTINGS, scores = {} } = await chrome.storage.local.get([
    "settings",
    "scores"
  ]);

  if (scores[item.id]) {
    return { ...scores[item.id], cached: true, settings };
  }

  const analysis =
    settings.analysisMode === "heuristic"
      ? heuristicAnalysis(item)
      : await analyzeWithOllama(item, settings).catch(() => heuristicAnalysis(item));

  const result = {
    itemId: item.id,
    platform: item.platform,
    model: analysis.model,
    analyzedAt: new Date().toISOString(),
    scores: analysis.scores,
    confidence: analysis.confidence,
    explanations: analysis.explanations,
    summary:
      settings.storeRawText || analysis.source === "ollama"
        ? analysis.summary
        : "Heuristic fallback analyzed this visible item locally.",
    source: analysis.source,
    item: settings.storeRawText ? item : minimizeItem(item)
  };

  scores[item.id] = result;
  const metrics = updateMetrics(await readMetrics(), result, settings);
  await chrome.storage.local.set({ scores, metrics });
  return { ...result, cached: false, settings };
}

async function analyzeWithOllama(item, settings) {
  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      stream: false,
      format: "json",
      prompt: buildAnalysisPrompt(item)
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  let parsed = safeJsonParse(data.response);
  if (!parsed) {
    parsed = await retryOllamaJsonAnalysis(item, settings);
  }
  const normalized = normalizeModelOutput(parsed);

  return {
    model: settings.model || DEFAULT_SETTINGS.model,
    source: "ollama",
    ...normalized
  };
}

async function retryOllamaJsonAnalysis(item, settings) {
  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      stream: false,
      format: "json",
      prompt: `${buildAnalysisPrompt(item)}

Your previous response could not be parsed as JSON. Return only valid JSON using the required schema.`
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama retry returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const parsed = safeJsonParse(data.response);
  if (!parsed) {
    throw new Error("Ollama returned malformed JSON.");
  }
  return parsed;
}

async function checkOllamaHealth() {
  const startedAt = Date.now();
  const response = await fetch(OLLAMA_TAGS_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const models = Array.isArray(data.models)
    ? data.models.map((model) => model.name).filter(Boolean).slice(0, 12)
    : [];
  return {
    available: true,
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    models
  };
}

function buildAnalysisPrompt(item) {
  return `You are PCFA, a local-first cognitive firewall assistant.

Analyze only the observable text below. Do not decide political truth. Do not classify ideology. Separate disagreement from toxicity. Return JSON only.

Required JSON shape:
{
  "scores": {
    "toxicity": 0.0,
    "anger": 0.0,
    "fear": 0.0,
    "hostility": 0.0,
    "informationDensity": 0.0,
    "evidencePresence": 0.0,
    "propagandaRisk": 0.0,
    "botSignal": 0.0,
    "coordinationRisk": 0.0
  },
  "confidence": 0.0,
  "explanations": [
    {
      "category": "toxicity",
      "contribution": "low",
      "reason": "short observable reason"
    }
  ],
  "summary": "neutral one-sentence summary"
}

Visible platform: ${item.platform}
Visible author handle: ${item.authorHandle || "unknown"}
Visible text:
${item.text}`;
}

function normalizeModelOutput(output) {
  const heuristic = heuristicAnalysis({ text: "" });
  const scores = { ...heuristic.scores, ...(output?.scores || {}) };

  return {
    scores: normalizeScores(scores),
    confidence: clampNumber(output?.confidence, 0, 1, 0.45),
    explanations: normalizeExplanations(output?.explanations),
    summary: typeof output?.summary === "string" ? output.summary.slice(0, 280) : ""
  };
}

function heuristicAnalysis(item) {
  const text = normalizeText(item.text || "");
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  const toxicityHits = countMatches(lower, [
    "idiot",
    "stupid",
    "trash",
    "scum",
    "shut up",
    "廢物",
    "垃圾",
    "白癡",
    "智障",
    "閉嘴",
    "去死"
  ]);
  const angerHits = countMatches(lower, [
    "outrage",
    "furious",
    "rage",
    "angry",
    "怒",
    "氣死",
    "可惡",
    "憤怒"
  ]);
  const fearHits = countMatches(lower, [
    "danger",
    "threat",
    "destroy",
    "invasion",
    "危險",
    "威脅",
    "毀滅",
    "恐怖"
  ]);
  const evidenceHits = countMatches(lower, [
    "http://",
    "https://",
    "source",
    "study",
    "report",
    "data",
    "according to",
    "來源",
    "研究",
    "報告",
    "數據",
    "根據"
  ]);
  const sloganHits = countMatches(lower, [
    "wake up",
    "they don't want you to know",
    "share before",
    "mainstream media",
    "覺醒",
    "轉發出去",
    "不想讓你知道"
  ]);
  const capsRatio = text ? (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1) : 0;
  const punctuationIntensity = Math.min(((text.match(/[!?！？]/g) || []).length / 6), 1);

  const toxicity = clamp01(toxicityHits * 0.22 + punctuationIntensity * 0.1);
  const anger = clamp01(angerHits * 0.24 + punctuationIntensity * 0.22 + capsRatio * 0.8);
  const fear = clamp01(fearHits * 0.24);
  const hostility = clamp01(toxicity * 0.55 + anger * 0.35);
  const evidencePresence = clamp01(evidenceHits * 0.25);
  const informationDensity = clamp01(evidencePresence * 0.5 + Math.min(words.length / 90, 0.45));
  const propagandaRisk = clamp01(
    sloganHits * 0.25 + anger * 0.22 + (evidencePresence < 0.2 ? sloganHits * 0.2 : 0)
  );
  const botSignal = clamp01(repetitionRatio(words) * 0.55);
  const coordinationRisk = clamp01(botSignal * 0.4 + sloganHits * 0.12);

  return {
    model: "local-heuristic",
    source: "heuristic",
    scores: {
      toxicity,
      anger,
      fear,
      hostility,
      informationDensity,
      evidencePresence,
      propagandaRisk,
      botSignal,
      coordinationRisk
    },
    confidence: text.length > 30 ? 0.52 : 0.34,
    explanations: buildHeuristicExplanations({
      toxicity,
      anger,
      fear,
      informationDensity,
      evidencePresence,
      propagandaRisk,
      botSignal,
      coordinationRisk
    }),
    summary: text ? summarizeText(text) : ""
  };
}

function buildHeuristicExplanations(scores) {
  const explanations = [];
  if (scores.toxicity >= 0.45) {
    explanations.push({
      category: "toxicity",
      contribution: "high",
      reason: "The text contains direct insults or aggressive wording."
    });
  }
  if (scores.anger >= 0.45) {
    explanations.push({
      category: "anger",
      contribution: "medium",
      reason: "The text shows elevated emotional intensity through wording or punctuation."
    });
  }
  if (scores.evidencePresence >= 0.35) {
    explanations.push({
      category: "evidence",
      contribution: "medium",
      reason: "The text includes visible source, data, report, or link signals."
    });
  }
  if (scores.informationDensity < 0.25) {
    explanations.push({
      category: "informationDensity",
      contribution: "low",
      reason: "The text has limited observable evidence or argument structure."
    });
  }
  if (scores.propagandaRisk >= 0.35) {
    explanations.push({
      category: "propagandaRisk",
      contribution: "medium",
      reason: "The text resembles slogan-like or emotionally amplifying framing."
    });
  }
  return explanations.length
    ? explanations
    : [
        {
          category: "overall",
          contribution: "low",
          reason: "No strong manipulation or toxicity signals were detected by the local heuristic."
        }
      ];
}

async function getState() {
  const state = await chrome.storage.local.get(["settings", "metrics", "scores"]);
  return {
    settings: state.settings || DEFAULT_SETTINGS,
    metrics: state.metrics || DEFAULT_METRICS,
    scores: state.scores || {}
  };
}

async function updateSettings(nextSettings = {}) {
  const current = (await chrome.storage.local.get("settings")).settings || DEFAULT_SETTINGS;
  const settings = {
    ...current,
    ...nextSettings,
    toxicityThreshold: clampNumber(nextSettings.toxicityThreshold, 0, 1, current.toxicityThreshold)
  };
  await chrome.storage.local.set({ settings });
  return settings;
}

async function clearData() {
  await chrome.storage.local.set({ metrics: DEFAULT_METRICS, scores: {} });
}

async function readMetrics() {
  const { metrics } = await chrome.storage.local.get("metrics");
  return metrics || DEFAULT_METRICS;
}

function updateMetrics(metrics, result, settings) {
  const postsAnalyzed = metrics.postsAnalyzed + 1;
  const toxicityThreshold = settings.toxicityThreshold ?? DEFAULT_SETTINGS.toxicityThreshold;
  return {
    ...metrics,
    postsViewed: Math.max(metrics.postsViewed + 1, postsAnalyzed),
    postsAnalyzed,
    highToxicityPosts: metrics.highToxicityPosts + (result.scores.toxicity >= toxicityThreshold ? 1 : 0),
    totalInformationDensity: metrics.totalInformationDensity + result.scores.informationDensity,
    totalToxicity: metrics.totalToxicity + result.scores.toxicity,
    totalAnger: metrics.totalAnger + result.scores.anger,
    lastAnalyzedAt: result.analyzedAt
  };
}

function minimizeItem(item) {
  return {
    id: item.id,
    platform: item.platform,
    url: item.url,
    authorHandle: item.authorHandle,
    authorDisplayName: item.authorDisplayName,
    visibleLinks: item.visibleLinks || [],
    observedAt: item.observedAt,
    extractionConfidence: item.extractionConfidence,
    textLength: item.text.length
  };
}

function normalizeScores(scores) {
  return {
    toxicity: clampNumber(scores.toxicity, 0, 1, 0),
    anger: clampNumber(scores.anger, 0, 1, 0),
    fear: clampNumber(scores.fear, 0, 1, 0),
    hostility: clampNumber(scores.hostility, 0, 1, 0),
    informationDensity: clampNumber(scores.informationDensity, 0, 1, 0),
    evidencePresence: clampNumber(scores.evidencePresence, 0, 1, 0),
    propagandaRisk: clampNumber(scores.propagandaRisk, 0, 1, 0),
    botSignal: clampNumber(scores.botSignal, 0, 1, 0),
    coordinationRisk: clampNumber(scores.coordinationRisk, 0, 1, 0)
  };
}

function normalizeExplanations(explanations) {
  if (!Array.isArray(explanations)) {
    return [
      {
        category: "overall",
        contribution: "low",
        reason: "The local model did not return detailed explanations."
      }
    ];
  }

  return explanations.slice(0, 6).map((item) => ({
    category: String(item.category || "overall").slice(0, 40),
    contribution: ["low", "medium", "high"].includes(item.contribution) ? item.contribution : "medium",
    reason: String(item.reason || "Observable signal contributed to this estimate.").slice(0, 180)
  }));
}

function safeJsonParse(value) {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeText(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function summarizeText(text) {
  return text.length <= 180 ? text : `${text.slice(0, 177)}...`;
}

function countMatches(text, needles) {
  return needles.reduce((count, needle) => count + (text.includes(needle) ? 1 : 0), 0);
}

function repetitionRatio(words) {
  if (words.length < 8) {
    return 0;
  }
  const normalized = words.map((word) => word.toLowerCase()).filter((word) => word.length > 3);
  if (!normalized.length) {
    return 0;
  }
  return 1 - new Set(normalized).size / normalized.length;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function clamp01(value) {
  return Math.round(clampNumber(value, 0, 1, 0) * 100) / 100;
}
