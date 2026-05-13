importScripts("i18n.js");
importScripts("settings.js");

const DEFAULT_SETTINGS = {
  model: "llama3.2",
  modelProvider: "ollama",
  openaiBaseUrl: "http://localhost:1234/v1",
  openaiApiKey: "lm-studio",
  toxicityThreshold: 0.72,
  analysisMode: "ollama",
  storeRawText: false,
  shareStatsWithServer: false,
  enableCollectiveDefense: false,
  retentionDays: 30,
  language: "auto"
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

const DEFAULT_DAILY_ROLLUPS = {};
const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([
    "settings",
    "metrics",
    "scores",
    "dailyRollups"
  ]);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  } else {
    await chrome.storage.local.set({ settings: { ...DEFAULT_SETTINGS, ...existing.settings } });
  }
  if (!existing.metrics) {
    await chrome.storage.local.set({ metrics: DEFAULT_METRICS });
  }
  if (!existing.scores) {
    await chrome.storage.local.set({ scores: {} });
  }
  if (!existing.dailyRollups) {
    await chrome.storage.local.set({ dailyRollups: DEFAULT_DAILY_ROLLUPS });
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
    checkModelProviderHealth(message.settings)
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

  const stored = await chrome.storage.local.get([
    "settings",
    "scores"
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  const scores = stored.scores || {};

  if (scores[item.id] && canUseCachedScore(scores[item.id], settings)) {
    return { ...scores[item.id], cached: true, settings };
  }

  const analysis = await analyzeItem(item, settings);

  const result = {
    itemId: item.id,
    platform: item.platform,
    model: analysis.model,
    analyzedAt: new Date().toISOString(),
    scores: analysis.scores,
    confidence: analysis.confidence,
    classification: analysis.classification,
    explanations: analysis.explanations,
    summary:
      settings.storeRawText || analysis.source !== "heuristic"
        ? analysis.summary
        : t(settings, "heuristicSummaryFallback"),
    source: analysis.source,
    requestedSource: analysis.requestedSource || analysis.source,
    fallbackReason: analysis.fallbackReason,
    item: settings.storeRawText ? item : minimizeItem(item)
  };

  scores[item.id] = result;
  const metrics = updateMetrics(await readMetrics(), result, settings);
  const dailyRollups = updateDailyRollups(await readDailyRollups(), result, settings);
  const pruned = applyRetention(scores, dailyRollups, settings);
  await chrome.storage.local.set({
    scores: pruned.scores,
    metrics,
    dailyRollups: pruned.dailyRollups
  });
  return { ...result, cached: false, settings };
}

async function analyzeItem(item, settings) {
  if (settings.analysisMode === "heuristic") {
    return heuristicAnalysis(item, settings);
  }

  const requestedSource = desiredAnalysisSource(settings);
  try {
    const analysis = await analyzeWithModelProvider(item, settings);
    return { ...analysis, requestedSource };
  } catch (error) {
    return {
      ...heuristicAnalysis(item, settings),
      requestedSource,
      fallbackReason: error.message
    };
  }
}

function canUseCachedScore(score, settings) {
  const requestedSource = desiredAnalysisSource(settings);
  if (score.source !== requestedSource) {
    return false;
  }
  if (requestedSource !== "heuristic" && score.model !== (settings.model || DEFAULT_SETTINGS.model)) {
    return false;
  }
  return true;
}

function desiredAnalysisSource(settings) {
  if (settings.analysisMode === "heuristic") {
    return "heuristic";
  }
  return normalizeProvider(settings.modelProvider || DEFAULT_SETTINGS.modelProvider);
}

async function analyzeWithOllama(item, settings) {
  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      stream: false,
      format: "json",
      prompt: buildAnalysisPrompt(item, settings)
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
  const normalized = normalizeModelOutput(parsed, settings, item);

  return {
    model: settings.model || DEFAULT_SETTINGS.model,
    source: "ollama",
    ...normalized
  };
}

async function analyzeWithModelProvider(item, settings) {
  if ((settings.modelProvider || DEFAULT_SETTINGS.modelProvider) === "openai-compatible") {
    return analyzeWithOpenAICompatible(item, settings);
  }
  return analyzeWithOllama(item, settings);
}

async function analyzeWithOpenAICompatible(item, settings) {
  const baseUrl = normalizeLocalOpenAIBaseUrl(settings.openaiBaseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAIHeaders(settings),
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: t(settings, "promptSystem")
        },
        {
          role: "user",
          content: buildAnalysisPrompt(item, settings)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI-compatible provider returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  let parsed = safeJsonParse(data.choices?.[0]?.message?.content);
  if (!parsed) {
    parsed = await retryOpenAICompatibleJsonAnalysis(item, settings);
  }
  const normalized = normalizeModelOutput(parsed, settings, item);

  return {
    model: settings.model || DEFAULT_SETTINGS.model,
    source: "openai-compatible",
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
      prompt: `${buildAnalysisPrompt(item, settings)}

${t(settings, "promptRetry")}`
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

async function retryOpenAICompatibleJsonAnalysis(item, settings) {
  const baseUrl = normalizeLocalOpenAIBaseUrl(settings.openaiBaseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAIHeaders(settings),
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            t(settings, "promptSystemRetry")
        },
        {
          role: "user",
          content: buildAnalysisPrompt(item, settings)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI-compatible retry returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const parsed = safeJsonParse(data.choices?.[0]?.message?.content);
  if (!parsed) {
    throw new Error("OpenAI-compatible provider returned malformed JSON.");
  }
  return parsed;
}

async function checkModelProviderHealth(nextSettings = {}) {
  const current = (await chrome.storage.local.get("settings")).settings || {};
  const settings = { ...DEFAULT_SETTINGS, ...current, ...(nextSettings || {}) };
  if ((settings.modelProvider || DEFAULT_SETTINGS.modelProvider) === "openai-compatible") {
    return checkOpenAICompatibleHealth(settings);
  }
  return checkOllamaHealth();
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
    provider: "ollama",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    models
  };
}

async function checkOpenAICompatibleHealth(settings) {
  const startedAt = Date.now();
  const baseUrl = normalizeLocalOpenAIBaseUrl(settings.openaiBaseUrl);
  const response = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers: buildOpenAIHeaders(settings)
  });
  if (!response.ok) {
    throw new Error(`OpenAI-compatible provider returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const models = Array.isArray(data.data)
    ? data.data.map((model) => model.id).filter(Boolean).slice(0, 12)
    : [];
  return {
    available: true,
    provider: "openai-compatible",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    models
  };
}

function buildAnalysisPrompt(item, settings = DEFAULT_SETTINGS) {
  return `You are PCFA, a local-first cognitive firewall assistant.

${t(settings, "promptInstructions")}

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
  "classification": {
    "primary": "ad|propaganda|chitchat|informational|opinion|unknown",
    "confidence": 0.0
  },
  "explanations": [
    {
      "category": "toxicity",
      "contribution": "low",
      "reason": "short observable reason"
    }
  ],
  "summary": "neutral one-sentence summary"
}

${t(settings, "promptVisiblePlatform")}: ${item.platform}
${t(settings, "promptVisibleAuthorHandle")}: ${item.authorHandle || t(settings, "promptUnknown")}
${t(settings, "promptVisibleText")}:
${item.text}`;
}

function normalizeModelOutput(output, settings = DEFAULT_SETTINGS, item = { text: "" }) {
  const heuristic = heuristicAnalysis(item, settings);
  const scores = { ...heuristic.scores, ...(output?.scores || {}) };

  return {
    scores: normalizeScores(scores),
    confidence: clampNumber(output?.confidence, 0, 1, 0.45),
    classification: normalizeClassification(output?.classification, heuristic.classification),
    explanations: normalizeExplanations(output?.explanations, settings),
    summary: typeof output?.summary === "string" ? output.summary.slice(0, 280) : ""
  };
}

function heuristicAnalysis(item, settings = DEFAULT_SETTINGS) {
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
  const adHits = countMatches(lower, [
    "buy now",
    "limited offer",
    "discount",
    "promo code",
    "sponsored",
    "subscribe",
    "free trial",
    "shop now",
    "立即購買",
    "限時優惠",
    "折扣",
    "優惠碼",
    "贊助",
    "訂閱",
    "免費試用",
    "下單"
  ]);
  const chitchatHits = countMatches(lower, [
    "lol",
    "haha",
    "just saying",
    "good morning",
    "random thought",
    "anyone else",
    "哈哈",
    "笑死",
    "早安",
    "晚安",
    "閒聊",
    "隨便說",
    "有人也",
    "今天"
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
  const classification = classifyHeuristicContent({
    adHits,
    sloganHits,
    chitchatHits,
    evidencePresence,
    informationDensity,
    words
  });

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
    classification,
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
    }, settings),
    summary: text ? summarizeText(text) : ""
  };
}

function classifyHeuristicContent(signals) {
  if (signals.adHits > 0) {
    return {
      primary: "ad",
      confidence: clamp01(0.46 + signals.adHits * 0.18)
    };
  }
  if (signals.sloganHits > 0) {
    return {
      primary: "propaganda",
      confidence: clamp01(0.44 + signals.sloganHits * 0.16)
    };
  }
  if (
    signals.chitchatHits > 0 ||
    (signals.words.length < 32 && signals.evidencePresence < 0.2 && signals.informationDensity < 0.28)
  ) {
    return {
      primary: "chitchat",
      confidence: clamp01(0.4 + signals.chitchatHits * 0.14)
    };
  }
  if (signals.evidencePresence >= 0.35 || signals.informationDensity >= 0.45) {
    return {
      primary: "informational",
      confidence: 0.48
    };
  }
  return {
    primary: "unknown",
    confidence: 0.3
  };
}

function buildHeuristicExplanations(scores, settings = DEFAULT_SETTINGS) {
  const explanations = [];
  if (scores.toxicity >= 0.45) {
    explanations.push({
      category: "toxicity",
      contribution: "high",
      reason: t(settings, "heuristicToxicityReason")
    });
  }
  if (scores.anger >= 0.45) {
    explanations.push({
      category: "anger",
      contribution: "medium",
      reason: t(settings, "heuristicAngerReason")
    });
  }
  if (scores.evidencePresence >= 0.35) {
    explanations.push({
      category: "evidence",
      contribution: "medium",
      reason: t(settings, "heuristicEvidenceReason")
    });
  }
  if (scores.informationDensity < 0.25) {
    explanations.push({
      category: "informationDensity",
      contribution: "low",
      reason: t(settings, "heuristicInformationDensityReason")
    });
  }
  if (scores.propagandaRisk >= 0.35) {
    explanations.push({
      category: "propagandaRisk",
      contribution: "medium",
      reason: t(settings, "heuristicPropagandaReason")
    });
  }
  return explanations.length
    ? explanations
    : [
        {
          category: "overall",
          contribution: "low",
          reason: t(settings, "heuristicOverallReason")
        }
      ];
}

async function getState() {
  const state = await chrome.storage.local.get(["settings", "metrics", "scores", "dailyRollups"]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) },
    metrics: state.metrics || DEFAULT_METRICS,
    scores: state.scores || {},
    dailyRollups: state.dailyRollups || DEFAULT_DAILY_ROLLUPS
  };
}

async function updateSettings(nextSettings = {}) {
  const stored = (await chrome.storage.local.get("settings")).settings || {};
  const current = { ...DEFAULT_SETTINGS, ...stored };
  const settings = {
    ...current,
    ...nextSettings,
    modelProvider: normalizeProvider(nextSettings.modelProvider || current.modelProvider),
    openaiBaseUrl: normalizeOpenAIBaseUrlSetting(
      nextSettings.openaiBaseUrl ?? current.openaiBaseUrl
    ),
    openaiApiKey: String(nextSettings.openaiApiKey ?? current.openaiApiKey ?? "").trim(),
    toxicityThreshold: clampNumber(nextSettings.toxicityThreshold, 0, 1, current.toxicityThreshold),
    retentionDays: Math.round(clampNumber(nextSettings.retentionDays, 1, 365, current.retentionDays)),
    shareStatsWithServer: Boolean(nextSettings.shareStatsWithServer),
    enableCollectiveDefense: Boolean(nextSettings.enableCollectiveDefense),
    language: normalizeLanguageSetting(nextSettings.language || current.language)
  };
  await chrome.storage.local.set({ settings });
  return settings;
}

async function clearData() {
  await chrome.storage.local.set({
    metrics: DEFAULT_METRICS,
    scores: {},
    dailyRollups: DEFAULT_DAILY_ROLLUPS
  });
}

async function readMetrics() {
  const { metrics } = await chrome.storage.local.get("metrics");
  return metrics || DEFAULT_METRICS;
}

async function readDailyRollups() {
  const { dailyRollups } = await chrome.storage.local.get("dailyRollups");
  return dailyRollups || DEFAULT_DAILY_ROLLUPS;
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

function updateDailyRollups(dailyRollups, result, settings) {
  const day = result.analyzedAt.slice(0, 10);
  const existing = dailyRollups[day] || {
    date: day,
    postsAnalyzed: 0,
    highToxicityPosts: 0,
    totalToxicity: 0,
    totalAnger: 0,
    totalFear: 0,
    totalInformationDensity: 0,
    totalPropagandaRisk: 0,
    sources: {
      ollama: 0,
      openaiCompatible: 0,
      heuristic: 0
    }
  };
  const existingSources = existing.sources || {};
  const toxicityThreshold = settings.toxicityThreshold ?? DEFAULT_SETTINGS.toxicityThreshold;

  return {
    ...dailyRollups,
    [day]: {
      ...existing,
      postsAnalyzed: existing.postsAnalyzed + 1,
      highToxicityPosts:
        existing.highToxicityPosts + (result.scores.toxicity >= toxicityThreshold ? 1 : 0),
      totalToxicity: existing.totalToxicity + result.scores.toxicity,
      totalAnger: existing.totalAnger + result.scores.anger,
      totalFear: existing.totalFear + result.scores.fear,
      totalInformationDensity: existing.totalInformationDensity + result.scores.informationDensity,
      totalPropagandaRisk: existing.totalPropagandaRisk + result.scores.propagandaRisk,
      sources: {
        ollama: (existingSources.ollama || 0) + (result.source === "ollama" ? 1 : 0),
        openaiCompatible:
          (existingSources.openaiCompatible || 0) +
          (result.source === "openai-compatible" ? 1 : 0),
        heuristic: (existingSources.heuristic || 0) + (result.source === "heuristic" ? 1 : 0)
      }
    }
  };
}

function applyRetention(scores, dailyRollups, settings) {
  const retentionDays = settings.retentionDays ?? DEFAULT_SETTINGS.retentionDays;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const keptScores = {};
  const keptRollups = {};

  for (const [id, score] of Object.entries(scores)) {
    const analyzedTime = Date.parse(score.analyzedAt || "");
    if (!Number.isFinite(analyzedTime) || analyzedTime >= cutoff) {
      keptScores[id] = score;
    }
  }

  for (const [day, rollup] of Object.entries(dailyRollups)) {
    const dayTime = Date.parse(`${day}T00:00:00.000Z`);
    if (!Number.isFinite(dayTime) || dayTime >= cutoff) {
      keptRollups[day] = rollup;
    }
  }

  return {
    scores: keptScores,
    dailyRollups: keptRollups
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

function normalizeClassification(classification, fallback = { primary: "unknown", confidence: 0.3 }) {
  const primary = String(classification?.primary || fallback.primary || "unknown");
  return {
    primary: ["ad", "propaganda", "chitchat", "informational", "opinion", "unknown"].includes(primary)
      ? primary
      : "unknown",
    confidence: clampNumber(classification?.confidence, 0, 1, fallback.confidence || 0.3)
  };
}

function normalizeExplanations(explanations, settings = DEFAULT_SETTINGS) {
  if (!Array.isArray(explanations)) {
    return [
      {
        category: "overall",
        contribution: "low",
        reason: t(settings, "modelExplanationFallback")
      }
    ];
  }

  return explanations.slice(0, 6).map((item) => ({
    category: String(item.category || "overall").slice(0, 40),
    contribution: ["low", "medium", "high"].includes(item.contribution) ? item.contribution : "medium",
    reason: String(item.reason || t(settings, "modelReasonFallback")).slice(0, 180)
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

function buildOpenAIHeaders(settings) {
  const headers = { "Content-Type": "application/json" };
  const apiKey = String(settings.openaiApiKey || "").trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function normalizeProvider(provider) {
  return provider === "openai-compatible" ? "openai-compatible" : "ollama";
}

function normalizeLanguageSetting(language) {
  return ["auto", "en", "zh-TW"].includes(language) ? language : DEFAULT_SETTINGS.language;
}

function normalizeOpenAIBaseUrlSetting(value) {
  return globalThis.PCFA_SETTINGS.normalizeOpenAIBaseUrlSetting(value);
}

function normalizeLocalOpenAIBaseUrl(value) {
  return globalThis.PCFA_SETTINGS.normalizeLocalOpenAIBaseUrl(value);
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

function t(settings, key, values) {
  const language = globalThis.PCFA_I18N.resolveLanguage(
    settings?.language || DEFAULT_SETTINGS.language,
    globalThis.PCFA_I18N.browserLanguage()
  );
  return globalThis.PCFA_I18N.createTranslator(language).t(key, values);
}
