
export type AnalysisDecision = "Accepted" | "Review" | "Rejected";
export type DecisionFilter = AnalysisDecision | 'All';

export interface InventoryItem {
  id: string;
  item_name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  brand?: string;
  model?: string;
  sku?: string;
  manufacturer?: string;
  supplier?: string;
  manufacturer_country?: string;
  specialty?: string;
  region?: string;
  area?: string;
  type?: string;
}

export interface MatchedKeyword {
  canonical: string;
  matched: string;
  confidence: number;
  strategy: 'exact' | 'substring' | 'affix' | 'fuzzy' | 'engine3v' | 'semantic' | 'pattern';
}

export type Lang = 'ar' | 'en' | 'mixed';

export interface ParsedItemDetails {
  baseName: string;
  attributes: { 
    size?: string; 
    side?: 'left'|'right'|'bilateral'|'universal'; 
    color?: string;
    resistance?: string;
  };
  language: Lang;
}

export interface Explanation {
    hits: { canonical: string; strategy: string; confidence: number; }[];
    // Some engines return string[] context (legacy), others return a structured object (engine3v/ultra)
    context: string[] | Record<string, unknown>;
}

export interface AnalysisResult {
  id: string;
  item_name: string;
  sku?: string;
  description?: string;
  PT_Category: string;
  PT_Subcategory: string;
  Score: number;
  Decision: AnalysisDecision;
  Decision_Reason: string;
  Matched_Keywords: MatchedKeyword[];
  language: Lang;
  extracted_attributes: ParsedItemDetails['attributes'];
  explanation: Explanation;
  manufacturer?: string;
  manufacturer_country?: string;
  specialty?: string;
  region?: string;
  area?: string;
  type?: string;
  supplier?: string;
  // PT Classification fields
  pt_relevance?: {
    isPT: boolean;
    confidence: number;
    matches: string[];
    smartCategory: string;
    smartSubcategory: string;
  };
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

export type FilterState = {
  /** Free text search */
  text: string;
  /** Score range slider */
  scoreRange: { min: number; max: number };

  /** Kept for compatibility (UI removed, logic locks to Accepted) */
  decision: DecisionFilter;

  /** Primary filters (single for legacy, *_multi for OR multi-select) */
  category: string;
  category_multi?: string[];

  manufacturer: string;
  manufacturer_multi?: string[];

  specialty: string;
  specialty_multi?: string[];

  region: string;
  region_multi?: string[];

  area: string;
  area_multi?: string[];

  type: string;
  type_multi?: string[];

  /** Advanced modal fields (multi only) */
  country?: string;
  country_multi?: string[];

  supplier?: string;
  supplier_multi?: string[];

  model?: string;
  model_multi?: string[];
};

export type FilterOptions = {
  categories: string[];
  manufacturers: string[];
  specialties: string[];
  regions: string[];
  areas: string[];
  types: string[];
  countries?: string[];
  suppliers?: string[];
  models?: string[];
};
