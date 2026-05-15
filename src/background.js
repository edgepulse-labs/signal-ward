import "./i18n.js";
import "./settings.js";
import * as packagedWebLlm from "../vendor/web-llm/index.js";

const DEFAULT_SETTINGS = {
  model: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  modelProvider: "webllm",
  openaiBaseUrl: "http://localhost:1234/v1",
  openaiApiKey: "lm-studio",
  webLlmTemperature: 0,
  webLlmMaxTokens: 700,
  toxicityThreshold: 0.72,
  angerThreshold: 0.8,
  collapseAds: false,
  analysisMode: "model",
  storeRawText: false,
  modelDebugMode: false,
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
const ANALYSIS_PROMPT_VERSION = 3;
const DEFAULT_WEBLLM_MODEL = DEFAULT_SETTINGS.model;
let webLlmEnginePromise = null;
let webLlmEngineModel = "";
let webLlmLastStatus = {
  available: false,
  ready: false,
  model: DEFAULT_WEBLLM_MODEL,
  progressPercent: null,
  progressText: "WebLLM has not been loaded yet.",
  error: ""
};

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
    analyzeAndStore(message.item, { force: Boolean(message.force) })
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

  if (message?.type === "PCFA_CLEAR_MODEL_DEBUG") {
    clearModelDebugTraces()
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

  if (message?.type === "PCFA_GET_MODEL_OPTIONS") {
    getModelOptions(message.settings)
      .then((modelOptions) => sendResponse({ ok: true, modelOptions }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "PCFA_REPORT_FEEDBACK") {
    recordFeedback(message.feedback)
      .then((feedback) => sendResponse({ ok: true, feedback }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function analyzeAndStore(item, options = {}) {
  if (!item?.id || !item?.text) {
    throw new Error("Missing feed item id or text.");
  }

  const stored = await chrome.storage.local.get([
    "settings",
    "scores"
  ]);
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  const scores = stored.scores || {};

  if (!options.force && scores[item.id] && canUseCachedScore(scores[item.id], settings)) {
    return { ...scores[item.id], cached: true, settings };
  }

  const analysis = await analyzeItem(item, settings);

  const result = {
    itemId: item.id,
    platform: item.platform,
    model: analysis.model,
    analysisPromptVersion: ANALYSIS_PROMPT_VERSION,
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
  const metrics = recomputeMetrics(scores, settings);
  const dailyRollups = recomputeDailyRollups(scores, settings);
  const pruned = applyRetention(scores, dailyRollups, settings);
  await chrome.storage.local.set({
    scores: pruned.scores,
    metrics,
    dailyRollups: pruned.dailyRollups
  });
  return { ...result, cached: false, reanalyzed: Boolean(options.force), settings };
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
  if (requestedSource !== "heuristic" && score.analysisPromptVersion !== ANALYSIS_PROMPT_VERSION) {
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
  const trace = createModelDebugTrace("ollama", settings);
  const body = {
    model: settings.model || DEFAULT_SETTINGS.model,
    stream: false,
    format: "json",
    prompt: buildAnalysisPrompt(item, settings)
  };
  trace.request = createDebugRequestSnapshot("POST", OLLAMA_GENERATE_URL, body);
  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    await recordModelDebugTrace(settings, {
      ...trace,
      ok: false,
      httpStatus: response.status,
      error: `Ollama returned HTTP ${response.status}.`
    });
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  trace.httpStatus = response.status;
  trace.rawMessageContent = truncateDebugText(data.response);
  let parsed = safeJsonParse(data.response);
  if (isSchemaEchoModelOutput(parsed)) {
    parsed = null;
    trace.parseStatus = "schema-echo";
  } else {
    trace.parseStatus = parsed ? "parsed" : "retrying";
  }
  if (!parsed) {
    try {
      parsed = await retryOllamaJsonAnalysis(item, settings);
      trace.retryParsed = true;
    } catch (error) {
      await recordModelDebugTrace(settings, {
        ...trace,
        ok: false,
        error: error.message
      });
      throw error;
    }
  }
  const normalized = normalizeModelOutput(parsed, settings, item);
  await recordModelDebugTrace(settings, {
    ...trace,
    ok: true,
    parsed,
    normalized: createNormalizedDebugSnapshot(normalized)
  });

  return {
    model: settings.model || DEFAULT_SETTINGS.model,
    source: "ollama",
    ...normalized
  };
}

async function analyzeWithModelProvider(item, settings) {
  const provider = settings.modelProvider || DEFAULT_SETTINGS.modelProvider;
  if (provider === "webllm") {
    return analyzeWithWebLlm(item, settings);
  }
  if (provider === "openai-compatible") {
    return analyzeWithOpenAICompatible(item, settings);
  }
  return analyzeWithOllama(item, settings);
}

async function analyzeWithWebLlm(item, settings) {
  const trace = createModelDebugTrace("webllm", settings, "browser-local WebGPU");
  const engine = await ensureWebLlmEngine(settings);
  const messages = [
    {
      role: "system",
      content: t(settings, "promptSystem")
    },
    {
      role: "user",
      content: buildAnalysisPrompt(item, settings)
    }
  ];
  const request = {
    messages,
    temperature: Number(settings.webLlmTemperature ?? DEFAULT_SETTINGS.webLlmTemperature),
    max_tokens: Number(settings.webLlmMaxTokens ?? DEFAULT_SETTINGS.webLlmMaxTokens)
  };
  trace.request = createDebugRequestSnapshot("webllm.chat.completions.create", trace.endpoint, request);
  let response;
  try {
    response = await engine.chat.completions.create(request);
  } catch (error) {
    await recordModelDebugTrace(settings, {
      ...trace,
      ok: false,
      error: error.message
    });
    throw error;
  }

  const rawContent = response?.choices?.[0]?.message?.content;
  trace.rawMessageContent = truncateDebugText(rawContent);
  trace.rawResponseShape = summarizeResponseShape(response);
  let parsed = safeJsonParse(rawContent);
  if (isSchemaEchoModelOutput(parsed)) {
    parsed = null;
    trace.parseStatus = "schema-echo";
  } else {
    trace.parseStatus = parsed ? "parsed" : "retrying";
  }
  if (!parsed) {
    try {
      parsed = await retryWebLlmJsonAnalysis(item, settings);
      trace.retryParsed = true;
    } catch (error) {
      await recordModelDebugTrace(settings, {
        ...trace,
        ok: false,
        error: error.message
      });
      throw error;
    }
  }
  const normalized = normalizeModelOutput(parsed, settings, item);
  await recordModelDebugTrace(settings, {
    ...trace,
    ok: true,
    parsed,
    normalized: createNormalizedDebugSnapshot(normalized)
  });

  return {
    model: settings.model || DEFAULT_SETTINGS.model,
    source: "webllm",
    ...normalized
  };
}

async function ensureWebLlmEngine(settings) {
  const model = settings.model || DEFAULT_WEBLLM_MODEL;
  if (webLlmEnginePromise && webLlmEngineModel === model) {
    return webLlmEnginePromise;
  }

  webLlmEngineModel = model;
  webLlmLastStatus = {
    available: true,
    ready: false,
    model,
    progressPercent: 0,
    progressText: "Loading WebLLM runtime...",
    error: ""
  };
  broadcastWebLlmStatus();

  webLlmEnginePromise = (async () => {
    if (!navigator?.gpu) {
      throw new Error("WebGPU is unavailable in this browser profile.");
    }

    if (typeof packagedWebLlm.CreateMLCEngine !== "function") {
      throw new Error("Packaged WebLLM module does not export CreateMLCEngine.");
    }

    const appConfig = packagedWebLlm.prebuiltAppConfig
      ? { ...packagedWebLlm.prebuiltAppConfig, cacheBackend: "indexeddb" }
      : { cacheBackend: "indexeddb" };
    const engine = await packagedWebLlm.CreateMLCEngine(model, {
      appConfig,
      initProgressCallback: (progress) => {
        const progressText = progress?.text || (progress ? JSON.stringify(progress) : "Loading model...");
        webLlmLastStatus = {
          available: true,
          ready: false,
          model,
          progressPercent: normalizeWebLlmProgressPercent(progress),
          progressText,
          error: ""
        };
        broadcastWebLlmStatus();
      }
    });

    webLlmLastStatus = {
      available: true,
      ready: true,
      model,
      progressPercent: 100,
      progressText: "WebLLM model is ready.",
      error: ""
    };
    broadcastWebLlmStatus();
    return engine;
  })().catch((error) => {
    webLlmLastStatus = {
      available: false,
      ready: false,
      model,
      progressPercent: null,
      progressText: "WebLLM unavailable; local heuristic fallback will be used.",
      error: String(error?.message || error)
    };
    webLlmEnginePromise = null;
    broadcastWebLlmStatus();
    throw error;
  });

  return webLlmEnginePromise;
}

async function analyzeWithOpenAICompatible(item, settings) {
  const baseUrl = normalizeLocalOpenAIBaseUrl(settings.openaiBaseUrl);
  const trace = createModelDebugTrace("openai-compatible", settings, `${baseUrl}/chat/completions`);
  const messages = [
    {
      role: "system",
      content: t(settings, "promptSystem")
    },
    {
      role: "user",
      content: buildAnalysisPrompt(item, settings)
    }
  ];
  trace.request = createDebugRequestSnapshot(
    "POST",
    `${baseUrl}/chat/completions`,
    buildOpenAICompatibleChatCompletionBody(settings, messages, true)
  );
  let response = await fetchOpenAICompatibleChatCompletion(baseUrl, settings, messages, true);

  if (!response.ok && response.status >= 400 && response.status < 500) {
    trace.firstHttpStatus = response.status;
    const retryMessages = [
      {
        role: "system",
        content: t(settings, "promptSystem")
      },
      {
        role: "user",
        content: buildAnalysisPrompt(item, settings)
      }
    ];
    trace.retryRequest = createDebugRequestSnapshot(
      "POST",
      `${baseUrl}/chat/completions`,
      buildOpenAICompatibleChatCompletionBody(settings, retryMessages, false)
    );
    response = await fetchOpenAICompatibleChatCompletion(baseUrl, settings, retryMessages, false);
  }

  if (!response.ok) {
    await recordModelDebugTrace(settings, {
      ...trace,
      ok: false,
      httpStatus: response.status,
      error: `OpenAI-compatible provider returned HTTP ${response.status}.`
    });
    throw new Error(`OpenAI-compatible provider returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  trace.httpStatus = response.status;
  trace.rawMessageContent = truncateDebugText(rawContent);
  trace.rawResponseShape = summarizeResponseShape(data);
  let parsed = safeJsonParse(rawContent);
  if (isSchemaEchoModelOutput(parsed)) {
    parsed = null;
    trace.parseStatus = "schema-echo";
  } else {
    trace.parseStatus = parsed ? "parsed" : "retrying";
  }
  if (!parsed) {
    try {
      parsed = await retryOpenAICompatibleJsonAnalysis(item, settings);
      trace.retryParsed = true;
    } catch (error) {
      await recordModelDebugTrace(settings, {
        ...trace,
        ok: false,
        error: error.message
      });
      throw error;
    }
  }
  const normalized = normalizeModelOutput(parsed, settings, item);
  await recordModelDebugTrace(settings, {
    ...trace,
    ok: true,
    parsed,
    normalized: createNormalizedDebugSnapshot(normalized)
  });

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
  if (!parsed || isSchemaEchoModelOutput(parsed)) {
    throw new Error("Ollama returned malformed JSON.");
  }
  return parsed;
}

async function retryOpenAICompatibleJsonAnalysis(item, settings) {
  const baseUrl = normalizeLocalOpenAIBaseUrl(settings.openaiBaseUrl);
  const response = await fetchOpenAICompatibleChatCompletion(baseUrl, settings, [
    {
      role: "system",
      content: t(settings, "promptSystemRetry")
    },
    {
      role: "user",
      content: buildAnalysisPrompt(item, settings)
    }
  ], false);

  if (!response.ok) {
    throw new Error(`OpenAI-compatible retry returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const parsed = safeJsonParse(data.choices?.[0]?.message?.content);
  if (!parsed || isSchemaEchoModelOutput(parsed)) {
    throw new Error("OpenAI-compatible provider returned malformed JSON.");
  }
  return parsed;
}

async function retryWebLlmJsonAnalysis(item, settings) {
  const engine = await ensureWebLlmEngine(settings);
  const response = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: t(settings, "promptSystemRetry")
      },
      {
        role: "user",
        content: `${buildAnalysisPrompt(item, settings)}

${t(settings, "promptRetry")}`
      }
    ],
    temperature: 0,
    max_tokens: Number(settings.webLlmMaxTokens ?? DEFAULT_SETTINGS.webLlmMaxTokens)
  });
  const parsed = safeJsonParse(response?.choices?.[0]?.message?.content);
  if (!parsed || isSchemaEchoModelOutput(parsed)) {
    throw new Error("WebLLM returned malformed JSON.");
  }
  return parsed;
}

async function fetchOpenAICompatibleChatCompletion(baseUrl, settings, messages, useJsonResponseFormat) {
  const body = buildOpenAICompatibleChatCompletionBody(settings, messages, useJsonResponseFormat);
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildOpenAIHeaders(settings),
    body: JSON.stringify(body)
  });
}

function buildOpenAICompatibleChatCompletionBody(settings, messages, useJsonResponseFormat) {
  const body = {
    model: settings.model || DEFAULT_SETTINGS.model,
    temperature: 0,
    messages
  };
  if (useJsonResponseFormat) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "pcfa_analysis",
        strict: false,
        schema: analysisJsonSchema()
      }
    };
  }
  return body;
}

function analysisJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["scores", "confidence", "classification", "explanations", "summary"],
    properties: {
      scores: {
        type: "object",
        additionalProperties: false,
        required: [
          "toxicity",
          "anger",
          "fear",
          "hostility",
          "informationDensity",
          "evidencePresence",
          "propagandaRisk",
          "botSignal",
          "coordinationRisk"
        ],
        properties: {
          toxicity: { type: "number", minimum: 0, maximum: 1 },
          anger: { type: "number", minimum: 0, maximum: 1 },
          fear: { type: "number", minimum: 0, maximum: 1 },
          hostility: { type: "number", minimum: 0, maximum: 1 },
          informationDensity: { type: "number", minimum: 0, maximum: 1 },
          evidencePresence: { type: "number", minimum: 0, maximum: 1 },
          propagandaRisk: { type: "number", minimum: 0, maximum: 1 },
          botSignal: { type: "number", minimum: 0, maximum: 1 },
          coordinationRisk: { type: "number", minimum: 0, maximum: 1 }
        }
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      classification: {
        type: "object",
        additionalProperties: false,
        required: ["primary", "confidence"],
        properties: {
          primary: {
            type: "string",
            enum: ["ad", "propaganda", "chitchat", "informational", "opinion", "unknown"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      },
      explanations: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "contribution", "reason"],
          properties: {
            category: { type: "string" },
            contribution: { type: "string", enum: ["low", "medium", "high"] },
            reason: { type: "string" }
          }
        }
      },
      summary: { type: "string" }
    }
  };
}

async function checkModelProviderHealth(nextSettings = {}) {
  const current = (await chrome.storage.local.get("settings")).settings || {};
  const settings = { ...DEFAULT_SETTINGS, ...current, ...(nextSettings || {}) };
  const provider = settings.modelProvider || DEFAULT_SETTINGS.modelProvider;
  if (provider === "webllm") {
    return checkWebLlmHealth(settings);
  }
  if (provider === "openai-compatible") {
    return checkOpenAICompatibleHealth(settings);
  }
  return checkOllamaHealth();
}

async function checkWebLlmHealth(settings) {
  const startedAt = Date.now();
  const model = settings.model || DEFAULT_WEBLLM_MODEL;
  if (!navigator?.gpu) {
    throw new Error("WebGPU is unavailable in this browser profile.");
  }
  await ensureWebLlmEngine(settings);
  return {
    available: webLlmLastStatus.ready,
    provider: "webllm",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    models: getWebLlmModelOptions(model),
    status: webLlmLastStatus
  };
}

async function checkOllamaHealth() {
  const startedAt = Date.now();
  const response = await fetch(OLLAMA_TAGS_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const models = Array.isArray(data.models)
    ? data.models.map((model) => model.name).filter(Boolean).slice(0, 50)
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
    ? data.data.map((model) => model.id).filter(Boolean).slice(0, 50)
    : [];
  return {
    available: true,
    provider: "openai-compatible",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    models
  };
}

async function getModelOptions(nextSettings = {}) {
  const current = (await chrome.storage.local.get("settings")).settings || {};
  const settings = { ...DEFAULT_SETTINGS, ...current, ...(nextSettings || {}) };
  const provider = settings.modelProvider || DEFAULT_SETTINGS.modelProvider;
  if (provider === "webllm") {
    return {
      provider,
      models: getWebLlmModelOptions(settings.model || DEFAULT_WEBLLM_MODEL),
      status: webLlmLastStatus
    };
  }

  const health = await checkModelProviderHealth(settings);
  return {
    provider,
    models: health.models || [],
    status: health.status || null
  };
}

function getWebLlmModelOptions(preferredModel = DEFAULT_WEBLLM_MODEL) {
  const models = Array.isArray(packagedWebLlm.prebuiltAppConfig?.model_list)
    ? packagedWebLlm.prebuiltAppConfig.model_list.map((record) => record.model_id).filter(Boolean)
    : [];
  return Array.from(new Set([preferredModel, DEFAULT_WEBLLM_MODEL, ...models].filter(Boolean))).slice(0, 120);
}

function buildAnalysisPrompt(item, settings = DEFAULT_SETTINGS) {
  return `Analyze this visible social feed item.

${t(settings, "promptInstructions")}

Visible item:
- ${t(settings, "promptVisiblePlatform")}: ${item.platform}
- ${t(settings, "promptVisibleAuthorHandle")}: ${item.authorHandle || t(settings, "promptUnknown")}
- ${t(settings, "promptVisibleText")}: ${item.text}

Return exactly one JSON object and no other text.
Do not split the answer into multiple JSON objects.
Use these top-level keys: scores, confidence, classification, explanations, summary.
scores must contain numbers from 0 to 1 for toxicity, anger, fear, hostility, informationDensity, evidencePresence, propagandaRisk, botSignal, coordinationRisk.
classification.primary must be exactly one of: ad, propaganda, chitchat, informational, opinion, unknown.
Use unknown only when no other category is reasonably applicable. Short comparisons or personal takes are usually opinion, casual one-line posts are usually chitchat, and posts sharing concrete facts or links are usually informational.
classification.confidence and confidence must be numbers from 0 to 1.
explanations must be an array of 1 to 4 objects. Each object has category, contribution, reason.
contribution must be exactly one of: low, medium, high.
summary must be a short neutral summary of the actual visible item.
Do not copy these instructions. Do not output placeholder text.`;
}

function normalizeModelOutput(output, settings = DEFAULT_SETTINGS, item = { text: "" }) {
  const heuristic = heuristicAnalysis(item, settings);
  const scores = { ...heuristic.scores, ...(output?.scores || {}) };
  const fallbackClassification = inferClassificationFallback(output, heuristic, item);
  const modelClassification = normalizeModelClassification(output?.classification, fallbackClassification, item);
  const classification = item?.platformSignals?.isConfirmedAd
    ? { primary: "ad", confidence: 0.98 }
    : normalizeClassification(modelClassification, fallbackClassification);

  return {
    scores: normalizeScores(scores),
    confidence: clampNumber(output?.confidence, 0, 1, 0.45),
    classification,
    explanations: normalizeExplanations(output?.explanations, settings),
    summary: typeof output?.summary === "string" ? output.summary.slice(0, 280) : ""
  };
}

async function recordFeedback(feedback = {}) {
  const stored = await chrome.storage.local.get("feedbackReports");
  const reports = Array.isArray(stored.feedbackReports) ? stored.feedbackReports : [];
  const report = {
    id: crypto.randomUUID(),
    reportedAt: new Date().toISOString(),
    kind: String(feedback.kind || "wrong-analysis").slice(0, 80),
    itemId: String(feedback.itemId || "").slice(0, 120),
    platform: String(feedback.platform || "").slice(0, 40),
    model: String(feedback.model || "").slice(0, 160),
    source: String(feedback.source || "").slice(0, 80),
    classification: feedback.classification || null,
    scores: feedback.scores || null,
    summary: truncateDebugText(feedback.summary || "", 500),
    item: feedback.item || null
  };
  await chrome.storage.local.set({
    feedbackReports: [report, ...reports].slice(0, 200)
  });
  return report;
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
  const state = await chrome.storage.local.get([
    "settings",
    "metrics",
    "scores",
    "dailyRollups",
    "modelDebugTraces"
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(state.settings || {}) },
    metrics: state.metrics || DEFAULT_METRICS,
    scores: state.scores || {},
    dailyRollups: state.dailyRollups || DEFAULT_DAILY_ROLLUPS,
    modelDebugTraces: state.modelDebugTraces || []
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
    webLlmTemperature: clampNumber(nextSettings.webLlmTemperature, 0, 2, current.webLlmTemperature),
    webLlmMaxTokens: Math.round(clampNumber(nextSettings.webLlmMaxTokens, 128, 4096, current.webLlmMaxTokens)),
    toxicityThreshold: clampNumber(nextSettings.toxicityThreshold, 0, 1, current.toxicityThreshold),
    angerThreshold: clampNumber(nextSettings.angerThreshold, 0, 1, current.angerThreshold),
    collapseAds: Boolean(nextSettings.collapseAds),
    retentionDays: Math.round(clampNumber(nextSettings.retentionDays, 1, 365, current.retentionDays)),
    modelDebugMode: Boolean(nextSettings.modelDebugMode),
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

async function clearModelDebugTraces() {
  await chrome.storage.local.set({ modelDebugTraces: [] });
}

async function readMetrics() {
  const { metrics } = await chrome.storage.local.get("metrics");
  return metrics || DEFAULT_METRICS;
}

async function readDailyRollups() {
  const { dailyRollups } = await chrome.storage.local.get("dailyRollups");
  return dailyRollups || DEFAULT_DAILY_ROLLUPS;
}

function recomputeMetrics(scores, settings) {
  const results = Object.values(scores || {});
  const toxicityThreshold = settings.toxicityThreshold ?? DEFAULT_SETTINGS.toxicityThreshold;
  return results.reduce(
    (metrics, result) => ({
      postsViewed: metrics.postsViewed + 1,
      postsAnalyzed: metrics.postsAnalyzed + 1,
      highToxicityPosts:
        metrics.highToxicityPosts + (result.scores?.toxicity >= toxicityThreshold ? 1 : 0),
      totalInformationDensity:
        metrics.totalInformationDensity + Number(result.scores?.informationDensity || 0),
      totalToxicity: metrics.totalToxicity + Number(result.scores?.toxicity || 0),
      totalAnger: metrics.totalAnger + Number(result.scores?.anger || 0),
      lastAnalyzedAt:
        !metrics.lastAnalyzedAt || String(result.analyzedAt) > String(metrics.lastAnalyzedAt)
          ? result.analyzedAt
          : metrics.lastAnalyzedAt
    }),
    { ...DEFAULT_METRICS }
  );
}

function recomputeDailyRollups(scores, settings) {
  const toxicityThreshold = settings.toxicityThreshold ?? DEFAULT_SETTINGS.toxicityThreshold;
  const rollups = {};
  for (const result of Object.values(scores || {})) {
    const day = String(result.analyzedAt || new Date().toISOString()).slice(0, 10);
    const existing = rollups[day] || {
      date: day,
      postsAnalyzed: 0,
      highToxicityPosts: 0,
      totalToxicity: 0,
      totalAnger: 0,
      totalFear: 0,
      totalInformationDensity: 0,
      totalPropagandaRisk: 0,
      sources: {
        webllm: 0,
        ollama: 0,
        openaiCompatible: 0,
        heuristic: 0
      }
    };
    rollups[day] = {
      ...existing,
      postsAnalyzed: existing.postsAnalyzed + 1,
      highToxicityPosts:
        existing.highToxicityPosts + (result.scores?.toxicity >= toxicityThreshold ? 1 : 0),
      totalToxicity: existing.totalToxicity + Number(result.scores?.toxicity || 0),
      totalAnger: existing.totalAnger + Number(result.scores?.anger || 0),
      totalFear: existing.totalFear + Number(result.scores?.fear || 0),
      totalInformationDensity:
        existing.totalInformationDensity + Number(result.scores?.informationDensity || 0),
      totalPropagandaRisk:
        existing.totalPropagandaRisk + Number(result.scores?.propagandaRisk || 0),
      sources: {
        webllm: existing.sources.webllm + (result.source === "webllm" ? 1 : 0),
        ollama: existing.sources.ollama + (result.source === "ollama" ? 1 : 0),
        openaiCompatible:
          existing.sources.openaiCompatible + (result.source === "openai-compatible" ? 1 : 0),
        heuristic: existing.sources.heuristic + (result.source === "heuristic" ? 1 : 0)
      }
    };
  }
  return rollups;
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
      webllm: 0,
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
        webllm: (existingSources.webllm || 0) + (result.source === "webllm" ? 1 : 0),
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
    platformSignals: item.platformSignals || {},
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
  if (primary === "unknown" && fallback.primary && fallback.primary !== "unknown") {
    return {
      primary: fallback.primary,
      confidence: Math.max(
        clampNumber(classification?.confidence, 0, 1, 0),
        clampNumber(fallback.confidence, 0, 1, 0.35)
      )
    };
  }
  return {
    primary: ["ad", "propaganda", "chitchat", "informational", "opinion", "unknown"].includes(primary)
      ? primary
      : "unknown",
    confidence: clampNumber(classification?.confidence, 0, 1, fallback.confidence || 0.3)
  };
}

function normalizeModelClassification(classification, fallback, item) {
  const primary = String(classification?.primary || "");
  if (primary !== "ad" || hasStrongAdEvidence(item)) {
    return classification;
  }
  const fallbackPrimary = fallback?.primary && fallback.primary !== "ad" ? fallback.primary : "opinion";
  return {
    ...classification,
    primary: fallbackPrimary,
    confidence: Math.min(clampNumber(classification?.confidence, 0, 1, 0.45), 0.58)
  };
}

function hasStrongAdEvidence(item) {
  if (item?.platformSignals?.isConfirmedAd) {
    return true;
  }
  const text = normalizeText(item?.text || "").toLowerCase();
  const links = Array.isArray(item?.visibleLinks) ? item.visibleLinks.join(" ").toLowerCase() : "";
  return (
    /\b(ad|ads|advertisement|sponsored|promoted|promo|discount|sale|buy now|shop now|free trial|subscribe)\b/.test(text) ||
    /廣告|广告|贊助|赞助|業配|促銷|折扣|優惠|訂閱|立即購買|限時|報名|下單/.test(text) ||
    /utm_campaign|utm_source|affiliate|ref=|promo/.test(links)
  );
}

function inferClassificationFallback(output, heuristic, item) {
  const text = normalizeText(item?.text || "").toLowerCase();
  const explanationClass = inferClassificationFromExplanations(
    output?.explanations,
    hasStrongAdEvidence(item)
  );
  const heuristicPrimary = heuristic.classification?.primary || "unknown";

  if (/\bvs\b|對決|比較|看法|認為|覺得|心得|觀點|opinion|take\b/.test(text)) {
    return { primary: "opinion", confidence: 0.5 };
  }
  if (hasStrongAdEvidence(item)) {
    return { primary: "ad", confidence: 0.5 };
  }
  if (/https?:\/\/|source|study|report|data|來源|研究|報告|數據|根據/.test(text)) {
    return { primary: "informational", confidence: 0.48 };
  }
  if (explanationClass && explanationClass !== "unknown") {
    return { primary: explanationClass, confidence: 0.46 };
  }
  if (heuristicPrimary && heuristicPrimary !== "unknown") {
    return heuristic.classification;
  }
  if (text.length > 0 && text.length < 80) {
    return { primary: "chitchat", confidence: 0.4 };
  }
  return heuristic.classification || { primary: "unknown", confidence: 0.3 };
}

function inferClassificationFromExplanations(explanations, allowAd = false) {
  if (!Array.isArray(explanations)) {
    return "";
  }
  const weights = { low: 1, medium: 2, high: 3 };
  const totals = {};
  for (const explanation of explanations) {
    const category = String(explanation?.category || "");
    if (!["ad", "propaganda", "chitchat", "informational", "opinion"].includes(category)) {
      continue;
    }
    if (category === "ad" && !allowAd) {
      continue;
    }
    totals[category] = (totals[category] || 0) + (weights[explanation.contribution] || 1);
  }
  return Object.entries(totals).sort((left, right) => right[1] - left[1])[0]?.[0] || "";
}

function isSchemaEchoModelOutput(output) {
  if (!output || typeof output !== "object") {
    return false;
  }

  const primary = String(output.classification?.primary || "");
  const summary = normalizeText(output.summary || "").toLowerCase();
  const reasons = Array.isArray(output.explanations)
    ? output.explanations.map((item) => normalizeText(item.reason || "").toLowerCase())
    : [];
  return (
    primary.includes("|") ||
    summary === "neutral one-sentence summary" ||
    reasons.some((reason) => reason === "short observable reason")
  );
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

  return explanations.slice(0, 4).map((item) => ({
    category: String(item.category || "overall").slice(0, 40),
    contribution: ["low", "medium", "high"].includes(item.contribution) ? item.contribution : "medium",
    reason: String(item.reason || t(settings, "modelReasonFallback")).slice(0, 180)
  }));
}

async function recordModelDebugTrace(settings, trace) {
  if (!settings.modelDebugMode) {
    return;
  }

  const stored = await chrome.storage.local.get("modelDebugTraces");
  const traces = Array.isArray(stored.modelDebugTraces) ? stored.modelDebugTraces : [];
  await chrome.storage.local.set({
    modelDebugTraces: [sanitizeDebugTrace(trace), ...traces].slice(0, 12)
  });
}

function createModelDebugTrace(provider, settings, endpoint = "") {
  return {
    checkedAt: new Date().toISOString(),
    provider,
    endpoint,
    model: settings.model || DEFAULT_SETTINGS.model,
    ok: false,
    parseStatus: "not-started"
  };
}

function sanitizeDebugTrace(trace) {
  return {
    checkedAt: trace.checkedAt,
    provider: trace.provider,
    endpoint: trace.endpoint,
    model: trace.model,
    ok: Boolean(trace.ok),
    httpStatus: trace.httpStatus,
    firstHttpStatus: trace.firstHttpStatus,
    parseStatus: trace.parseStatus,
    retryParsed: Boolean(trace.retryParsed),
    request: sanitizeDebugPayload(trace.request, 9000),
    retryRequest: sanitizeDebugPayload(trace.retryRequest, 9000),
    rawResponseShape: trace.rawResponseShape,
    rawMessageContent: truncateDebugText(trace.rawMessageContent),
    parsed: trace.parsed ? truncateDebugText(JSON.stringify(trace.parsed, null, 2), 5000) : "",
    normalized: trace.normalized || null,
    error: truncateDebugText(trace.error)
  };
}

function createDebugRequestSnapshot(method, endpoint, body) {
  return {
    method,
    endpoint,
    body
  };
}

function sanitizeDebugPayload(value, maxLength = 5000) {
  if (!value) {
    return null;
  }
  return safeJsonParse(truncateDebugText(JSON.stringify(value, null, 2), maxLength)) || {
    truncatedText: truncateDebugText(String(value), maxLength)
  };
}

function createNormalizedDebugSnapshot(normalized) {
  return {
    scores: normalized.scores,
    confidence: normalized.confidence,
    classification: normalized.classification,
    explanationCount: normalized.explanations.length,
    summary: truncateDebugText(normalized.summary, 500)
  };
}

function summarizeResponseShape(data) {
  return {
    hasChoices: Array.isArray(data?.choices),
    choiceCount: Array.isArray(data?.choices) ? data.choices.length : 0,
    firstMessageType: typeof data?.choices?.[0]?.message?.content,
    finishReason: data?.choices?.[0]?.finish_reason || ""
  };
}

function normalizeWebLlmProgressPercent(progress) {
  const rawProgress = Number(progress?.progress);
  if (Number.isFinite(rawProgress)) {
    return Math.round(clampNumber(rawProgress, 0, 1, 0) * 100);
  }
  const percentFromText = String(progress?.text || "").match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentFromText) {
    return Math.round(clampNumber(percentFromText[1], 0, 100, 0));
  }
  return webLlmLastStatus.progressPercent ?? 0;
}

function broadcastWebLlmStatus() {
  try {
    chrome.runtime.sendMessage({
      type: "PCFA_WEBLLM_STATUS_CHANGED",
      status: webLlmLastStatus
    }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Side panel may not be open while the model is warming up.
  }
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
      return repairAndParseModelJson(value);
    }
  }
}

function repairAndParseModelJson(value) {
  const repairedCandidates = [
    repairSplitSummaryObject(value),
    repairAdjacentTopLevelObjects(value)
  ].filter(Boolean);

  for (const candidate of repairedCandidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next repair strategy.
    }
  }
  return null;
}

function repairSplitSummaryObject(value) {
  const text = stripMarkdownJsonFence(value);
  if (!text.includes('"explanations"') || !text.includes('"summary"')) {
    return "";
  }

  return text
    .replace(
      /("explanations"\s*:\s*\[[\s\S]*?)\n\s*\}\s*\n\s*\n\s*\{\s*"summary"\s*:/m,
      '$1\n],\n"summary":'
    )
    .replace(/\}\s*$/, "}");
}

function repairAdjacentTopLevelObjects(value) {
  const objects = extractTopLevelJsonObjectTexts(stripMarkdownJsonFence(value))
    .map((text) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (objects.length < 2) {
    return "";
  }
  return JSON.stringify(Object.assign({}, ...objects));
}

function extractTopLevelJsonObjectTexts(value) {
  const objects = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(value.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function stripMarkdownJsonFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
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
  return ["webllm", "ollama", "openai-compatible"].includes(provider) ? provider : "webllm";
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

function truncateDebugText(value, maxLength = 3000) {
  const text = typeof value === "string" ? value : String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
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
