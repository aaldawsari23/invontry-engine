
export type AnalysisDecision = "Accepted" | "Review" | "Rejected";

export interface InventoryItem {
  id: string;
  item_name: string;
  category?: string;
  description?: string;
  brand?: string;
  model?: string;
  sku?: string;
}

export interface AnalysisResult {
  id: string;
  item_name: string;
  PT_Category: string;
  Score: number;
  Decision: AnalysisDecision;
  Decision_Reason: string;
  Matched_Positive_Terms: string[];
  Matched_Negative_Terms: string[];
}

export interface SummaryStats {
  totalItems: number;
  accepted: number;
  review: number;
  rejected: number;
  categoryCounts: { [key: string]: number };
}

export interface AnalysisData {
  results: AnalysisResult[];
  summary: SummaryStats;
}

export type SortConfig = {
  key: keyof AnalysisResult;
  direction: "ascending" | "descending";
} | null;
