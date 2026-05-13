(() => {
  const DEFAULT_LANGUAGE = "en";
  const AUTO_LANGUAGE = "auto";
  const SUPPORTED_LANGUAGES = ["en", "zh-TW"];
  const LANGUAGE_OPTIONS = [
    ["auto", "languageAuto"],
    ["en", "languageEnglish"],
    ["zh-TW", "languageTraditionalChinese"]
  ];

  const MESSAGES = {
    en: {
      appSubtitle: "Local cognitive firewall",
      statusLocal: "Local",
      statusUnavailable: "Unavailable",
      statusHeuristic: "Heuristic",
      metricsAria: "Session metrics",
      metricAnalyzed: "Analyzed",
      metricHighToxicity: "High toxicity",
      metricAvgToxicity: "Avg toxicity",
      metricAvgInfo: "Avg info",
      controlsTitle: "Controls",
      languageLabel: "Language",
      languageAuto: "Automatic",
      languageEnglish: "English",
      languageTraditionalChinese: "Traditional Chinese",
      ollamaNotChecked: "Ollama not checked",
      verifyLocalhost: "Use the check button to verify localhost.",
      verifyOpenAIEndpoint: "Use the check button to verify the local OpenAI-compatible endpoint.",
      checkButton: "Check",
      modelProviderLabel: "Model provider",
      modelLabel: "Model",
      openAIBaseUrlLabel: "OpenAI-compatible base URL",
      openAIApiKeyLabel: "OpenAI-compatible API key",
      collapseThresholdLabel: "Collapse threshold",
      retentionDaysLabel: "Retention days",
      heuristicOnlyLabel: "Use heuristic mode only",
      storeRawTextLabel: "Store raw visible text locally",
      saveSettingsButton: "Save settings",
      recentSignalsTitle: "Recent Signals",
      categoryDetailsTitle: "Category Details",
      dailyRollupTitle: "Daily Rollup",
      privacyTitle: "Privacy",
      clearDataButton: "Clear local scores",
      noRecentPosts: "No analyzed posts yet. Open X or Threads and browse normally.",
      localEstimateRecorded: "Local estimate recorded.",
      recentTitle: "{platform} · {source} · toxicity {toxicity}",
      recentDetail: "{confidence} confidence · {reason}",
      categoryToxicity: "Toxicity",
      categoryAnger: "Anger",
      categoryFear: "Fear",
      categoryHostility: "Hostility",
      categoryInformationDensity: "Information density",
      categoryEvidencePresence: "Evidence",
      categoryPropagandaRisk: "Propaganda risk",
      categoryBotSignal: "Bot signal",
      categoryCoordinationRisk: "Coordination risk",
      categoryOverall: "Overall",
      privacyAnalysisEndpoint: "Analysis endpoint",
      privacyRawVisibleText: "Raw visible text",
      privacyRetention: "Retention",
      privacyCloudServices: "Cloud services",
      privacyDataClearing: "Data clearing",
      storedLocally: "Stored locally",
      notStoredByDefault: "Not stored by default",
      retentionValue: "{days} days in local extension storage",
      noExtensionCloudCalls: "No extension cloud calls configured",
      availableFromPanel: "Available from this panel",
      date: "Date",
      sources: "Sources",
      avgEmotion: "Avg emotion",
      avgPropaganda: "Avg propaganda",
      rollupSources: "{ollama} Ollama / {openai} OpenAI-compatible / {heuristic} heuristic",
      checkingProvider: "Checking {provider}...",
      contactingUrl: "Contacting {url}.",
      providerUnavailable: "{provider} unavailable",
      localHealthCheckFailed: "Local health check failed.",
      providerAvailable: "{provider} available ({latency} ms)",
      modelsList: "Models: {models}",
      noLocalModels: "No local models reported by Ollama.",
      providerOpenAICompatible: "OpenAI-compatible",
      providerOllama: "Ollama",
      endpointHeuristicOnly: "Local heuristic only",
      endpointOpenAICompatible: "Local OpenAI-compatible ({url})",
      endpointOllamaFallback: "Local Ollama / heuristic fallback",
      contentLocalAnalysisUnavailable: "Local analysis unavailable.",
      contentAnalyzingLocally: "Analyzing locally...",
      badgeToxicity: "Toxicity",
      badgeAnger: "Anger",
      badgeInfo: "Info",
      badgeUncertain: "Uncertain",
      badgeConfidence: "Confidence",
      heuristicExplanation: "Heuristic explanation",
      localModelExplanation: "Local model explanation",
      summaryLabel: "Summary",
      uncertainDetail: "Uncertain: this estimate has low model or extraction confidence.",
      showOriginal: "Show original",
      collapsedNotice: "Collapsed by local estimate: toxicity {toxicity}.",
      pageMarker: "PCFA local",
      heuristicSummaryFallback: "Heuristic fallback analyzed this visible item locally.",
      heuristicToxicityReason: "The text contains direct insults or aggressive wording.",
      heuristicAngerReason: "The text shows elevated emotional intensity through wording or punctuation.",
      heuristicEvidenceReason: "The text includes visible source, data, report, or link signals.",
      heuristicInformationDensityReason: "The text has limited observable evidence or argument structure.",
      heuristicPropagandaReason: "The text resembles slogan-like or emotionally amplifying framing.",
      heuristicOverallReason: "No strong manipulation or toxicity signals were detected by the local heuristic.",
      modelExplanationFallback: "The local model did not return detailed explanations.",
      modelReasonFallback: "Observable signal contributed to this estimate.",
      promptLanguage: "English",
      promptSystem:
        "You are PCFA, a local-first cognitive firewall assistant. Return valid JSON only.",
      promptSystemRetry:
        "Return only valid JSON using the requested schema. Do not wrap the JSON in markdown.",
      promptRetry:
        "Your previous response could not be parsed as JSON. Return only valid JSON using the required schema.",
      promptInstructions:
        "Analyze only the observable text below. Do not decide political truth. Do not classify ideology. Separate disagreement from toxicity. Return JSON only. Write explanation reasons and summary in English.",
      promptVisiblePlatform: "Visible platform",
      promptVisibleAuthorHandle: "Visible author handle",
      promptVisibleText: "Visible text",
      promptUnknown: "unknown"
    },
    "zh-TW": {
      appSubtitle: "本機認知防火牆",
      statusLocal: "本機",
      statusUnavailable: "無法使用",
      statusHeuristic: "啟發式",
      metricsAria: "工作階段指標",
      metricAnalyzed: "已分析",
      metricHighToxicity: "高毒性",
      metricAvgToxicity: "平均毒性",
      metricAvgInfo: "平均資訊量",
      controlsTitle: "控制項",
      languageLabel: "語言",
      languageAuto: "依瀏覽器自動選擇",
      languageEnglish: "English",
      languageTraditionalChinese: "繁體中文",
      ollamaNotChecked: "尚未檢查 Ollama",
      verifyLocalhost: "使用檢查按鈕驗證 localhost。",
      verifyOpenAIEndpoint: "使用檢查按鈕驗證本機 OpenAI-compatible 端點。",
      checkButton: "檢查",
      modelProviderLabel: "模型提供者",
      modelLabel: "模型",
      openAIBaseUrlLabel: "OpenAI-compatible 基礎 URL",
      openAIApiKeyLabel: "OpenAI-compatible API 金鑰",
      collapseThresholdLabel: "摺疊門檻",
      retentionDaysLabel: "保留天數",
      heuristicOnlyLabel: "只使用啟發式模式",
      storeRawTextLabel: "在本機儲存可見原文",
      saveSettingsButton: "儲存設定",
      recentSignalsTitle: "最近訊號",
      categoryDetailsTitle: "分類細節",
      dailyRollupTitle: "每日彙總",
      privacyTitle: "隱私",
      clearDataButton: "清除本機分數",
      noRecentPosts: "尚未分析貼文。開啟 X 或 Threads 後正常瀏覽即可。",
      localEstimateRecorded: "已記錄本機估計。",
      recentTitle: "{platform} · {source} · 毒性 {toxicity}",
      recentDetail: "{confidence} 信心度 · {reason}",
      categoryToxicity: "毒性",
      categoryAnger: "憤怒",
      categoryFear: "恐懼",
      categoryHostility: "敵意",
      categoryInformationDensity: "資訊密度",
      categoryEvidencePresence: "證據",
      categoryPropagandaRisk: "宣傳風險",
      categoryBotSignal: "機器人訊號",
      categoryCoordinationRisk: "協同行為風險",
      categoryOverall: "整體",
      privacyAnalysisEndpoint: "分析端點",
      privacyRawVisibleText: "可見原文",
      privacyRetention: "保留期限",
      privacyCloudServices: "雲端服務",
      privacyDataClearing: "資料清除",
      storedLocally: "已儲存在本機",
      notStoredByDefault: "預設不儲存",
      retentionValue: "在擴充功能本機儲存中保留 {days} 天",
      noExtensionCloudCalls: "未設定擴充功能雲端呼叫",
      availableFromPanel: "可從此面板執行",
      date: "日期",
      sources: "來源",
      avgEmotion: "平均情緒",
      avgPropaganda: "平均宣傳風險",
      rollupSources: "{ollama} Ollama / {openai} OpenAI-compatible / {heuristic} 啟發式",
      checkingProvider: "正在檢查 {provider}...",
      contactingUrl: "正在連線到 {url}。",
      providerUnavailable: "{provider} 無法使用",
      localHealthCheckFailed: "本機健康檢查失敗。",
      providerAvailable: "{provider} 可用（{latency} ms）",
      modelsList: "模型：{models}",
      noLocalModels: "Ollama 未回報本機模型。",
      providerOpenAICompatible: "OpenAI-compatible",
      providerOllama: "Ollama",
      endpointHeuristicOnly: "僅本機啟發式",
      endpointOpenAICompatible: "本機 OpenAI-compatible（{url}）",
      endpointOllamaFallback: "本機 Ollama / 啟發式備援",
      contentLocalAnalysisUnavailable: "本機分析無法使用。",
      contentAnalyzingLocally: "正在本機分析...",
      badgeToxicity: "毒性",
      badgeAnger: "憤怒",
      badgeInfo: "資訊",
      badgeUncertain: "不確定",
      badgeConfidence: "信心度",
      heuristicExplanation: "啟發式說明",
      localModelExplanation: "本機模型說明",
      summaryLabel: "摘要",
      uncertainDetail: "不確定：此估計的模型或擷取信心度偏低。",
      showOriginal: "顯示原文",
      collapsedNotice: "已依本機估計摺疊：毒性 {toxicity}。",
      pageMarker: "PCFA 本機",
      heuristicSummaryFallback: "啟發式備援已在本機分析此可見項目。",
      heuristicToxicityReason: "文字包含直接侮辱或攻擊性措辭。",
      heuristicAngerReason: "文字透過用詞或標點呈現較高情緒強度。",
      heuristicEvidenceReason: "文字包含可見的來源、數據、報告或連結訊號。",
      heuristicInformationDensityReason: "文字中的可見證據或論述結構有限。",
      heuristicPropagandaReason: "文字類似口號式或情緒放大的框架。",
      heuristicOverallReason: "本機啟發式未偵測到強烈操弄或毒性訊號。",
      modelExplanationFallback: "本機模型未回傳詳細說明。",
      modelReasonFallback: "可觀察訊號影響了此估計。",
      promptLanguage: "Traditional Chinese",
      promptSystem:
        "You are PCFA, a local-first cognitive firewall assistant. Return valid JSON only.",
      promptSystemRetry:
        "Return only valid JSON using the requested schema. Do not wrap the JSON in markdown.",
      promptRetry:
        "Your previous response could not be parsed as JSON. Return only valid JSON using the required schema.",
      promptInstructions:
        "Analyze only the observable text below. Do not decide political truth. Do not classify ideology. Separate disagreement from toxicity. Return JSON only. Write explanation reasons and summary in Traditional Chinese.",
      promptVisiblePlatform: "Visible platform",
      promptVisibleAuthorHandle: "Visible author handle",
      promptVisibleText: "Visible text",
      promptUnknown: "unknown"
    }
  };

  function resolveLanguage(preference, browserLanguage = "") {
    if (SUPPORTED_LANGUAGES.includes(preference)) {
      return preference;
    }

    const normalized = normalizeLanguage(browserLanguage);
    if (normalized === "zh-TW") {
      return "zh-TW";
    }
    return DEFAULT_LANGUAGE;
  }

  function browserLanguage() {
    if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
      return chrome.i18n.getUILanguage();
    }
    if (typeof navigator !== "undefined") {
      return navigator.languages?.[0] || navigator.language || "";
    }
    return "";
  }

  function normalizeLanguage(language) {
    const normalized = String(language || "").replace("_", "-").toLowerCase();
    if (
      normalized === "zh" ||
      normalized === "zh-tw" ||
      normalized === "zh-hant" ||
      normalized === "zh-hant-tw" ||
      normalized === "zh-hk" ||
      normalized === "zh-mo"
    ) {
      return "zh-TW";
    }
    return normalized.startsWith("en") ? "en" : "";
  }

  function createTranslator(language) {
    const resolvedLanguage = resolveLanguage(language, browserLanguage());
    return {
      language: resolvedLanguage,
      t(key, values = {}) {
        const template = MESSAGES[resolvedLanguage]?.[key] || MESSAGES[DEFAULT_LANGUAGE][key] || key;
        return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) =>
          Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
        );
      }
    };
  }

  const api = {
    AUTO_LANGUAGE,
    DEFAULT_LANGUAGE,
    LANGUAGE_OPTIONS,
    SUPPORTED_LANGUAGES,
    MESSAGES,
    browserLanguage,
    createTranslator,
    resolveLanguage
  };

  globalThis.PCFA_I18N = api;
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
