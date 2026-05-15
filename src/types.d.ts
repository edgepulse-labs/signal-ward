export type FeedPlatform = "x" | "threads";
export type AnalysisSource = "webllm" | "ollama" | "openai-compatible" | "heuristic";
export type ContentClass = "ad" | "propaganda" | "chitchat" | "informational" | "opinion" | "unknown";

export interface FeedItem {
  id: string;
  platform: FeedPlatform;
  url?: string;
  authorHandle?: string;
  authorDisplayName?: string;
  text: string;
  visibleLinks: string[];
  engagement: {
    labels: string[];
  };
  platformSignals?: {
    isConfirmedAd?: boolean;
  };
  observedAt: string;
  extractionConfidence: number;
}

export interface SignalScores {
  toxicity: number;
  anger: number;
  fear: number;
  hostility: number;
  informationDensity: number;
  evidencePresence: number;
  propagandaRisk: number;
  botSignal: number;
  coordinationRisk: number;
}

export interface SignalExplanation {
  category: string;
  contribution: "low" | "medium" | "high";
  reason: string;
}

export interface ContentClassification {
  primary: ContentClass;
  confidence: number;
}

export interface AnalysisResult {
  itemId: string;
  platform: FeedPlatform;
  model: string;
  analysisPromptVersion?: number;
  analyzedAt: string;
  scores: SignalScores;
  confidence: number;
  classification: ContentClassification;
  explanations: SignalExplanation[];
  summary: string;
  source: AnalysisSource;
  requestedSource?: AnalysisSource;
  fallbackReason?: string;
  item: Partial<FeedItem> & Pick<FeedItem, "id" | "platform">;
}

export interface FeedbackReport {
  id: string;
  reportedAt: string;
  kind: "wrong-analysis" | string;
  itemId: string;
  platform: FeedPlatform | string;
  model: string;
  source: AnalysisSource | string;
  classification: ContentClassification | null;
  scores: SignalScores | null;
  summary: string;
  item: Partial<FeedItem> | null;
}

export interface Settings {
  model: string;
  modelProvider: "webllm" | "ollama" | "openai-compatible";
  openaiBaseUrl: string;
  openaiApiKey: string;
  webLlmTemperature: number;
  webLlmMaxTokens: number;
  toxicityThreshold: number;
  angerThreshold: number;
  collapseAds: boolean;
  analysisMode: "model" | "ollama" | "heuristic";
  storeRawText: boolean;
  modelDebugMode: boolean;
  shareStatsWithServer: boolean;
  enableCollectiveDefense: boolean;
  retentionDays: number;
  language: "auto" | "en" | "zh-TW";
}

export interface DailyRollup {
  date: string;
  postsAnalyzed: number;
  highToxicityPosts: number;
  totalToxicity: number;
  totalAnger: number;
  totalFear: number;
  totalInformationDensity: number;
  totalPropagandaRisk: number;
  sources: {
    webllm: number;
    ollama: number;
    openaiCompatible: number;
    heuristic: number;
  };
}
