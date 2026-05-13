export type FeedPlatform = "x" | "threads";
export type AnalysisSource = "ollama" | "heuristic";

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

export interface AnalysisResult {
  itemId: string;
  platform: FeedPlatform;
  model: string;
  analyzedAt: string;
  scores: SignalScores;
  confidence: number;
  explanations: SignalExplanation[];
  summary: string;
  source: AnalysisSource;
  item: Partial<FeedItem> & Pick<FeedItem, "id" | "platform">;
}

export interface Settings {
  model: string;
  toxicityThreshold: number;
  analysisMode: "ollama" | "heuristic";
  storeRawText: boolean;
}
