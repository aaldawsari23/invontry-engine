// src/types.ts - Type Definitions
export interface CatalogItem {
  id: string;
  sku?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  brand?: string;
  model?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  tags?: string[];
  region?: string;
  type?: string;
  [key: string]: any;
}

export interface NormalizedItem extends CatalogItem {
  normalized: {
    name: string;
    description: string;
    brand: string;
    model: string;
    category: string;
  };
  tokens: string[];
  fingerprint: string;
}

export interface ScoredItem extends NormalizedItem {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  matchedPositive: string[];
  matchedNegative: string[];
  matchedSynonyms: string[];
  blockedByGate?: string;
}

export interface ProcessedItem extends ScoredItem {
  status: ItemStatus;
}

export type ItemStatus = 'accepted' | 'review' | 'rejected';

export interface ScoreBreakdown {
  baseScore: number;
  titleMatch: number;
  brandMatch: number;
  categoryMatch: number;
  descriptionMatch: number;
  modelMatch: number;
  exactBonus: number;
  synonymBonus: number;
  diagnosticPenalty: number;
  ignorePenalty: number;
  strongPTBonus: number;
  [key: string]: number;
}

export interface ScoreReason {
  signal: string;
  contribution: number;
  percentage: number;
}

export interface FilterOptions {
  status?: ItemStatus[];
  category?: string[];
  brand?: string[];
  tags?: string[];
  region?: string[];
  type?: string[];
  query?: string;
  minScore?: number;
  maxScore?: number;
}

export interface SortOptions {
  field: keyof ProcessedItem;
  order?: 'asc' | 'desc';
}

export interface EngineStats {
  total: number;
  accepted: number;
  review: number;
  rejected: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
}

export interface EngineResult {
  items: ProcessedItem[];
  stats: EngineStats;
  processingTime: number;
  config: EngineConfig;
}

export interface ItemExplanation {
  id: string;
  score: number;
  status: ItemStatus;
  signals: ScoreBreakdown;
  topReasons: ScoreReason[];
  matchedTerms: {
    positive: string[];
    negative: string[];
    synonyms: string[];
  };
  normalizedTokens: string[];
  fingerprint: string;
}

export interface EngineConfig {
  weights: WeightConfig;
  thresholds: ThresholdConfig;
  gates: GateConfig;
  synonyms: SynonymConfig;
  categories?: CategoryConfig;
  arabic?: ArabicConfig;
  variant_patterns: Record<string, string>;
  diagnostic_blockers: string[];
  strong_pt_terms: string[];
  columns_map?: Record<string, string>;
}

export interface WeightConfig {
  title: number;
  brand: number;
  model: number;
  description: number;
  category: number;
  exactMatch: number;
  synonymMatch: number;
  categoryBoost: number;
  diagnosticPenalty: number;
  ignorePenalty: number;
}

export interface ThresholdConfig {
  accept_min_score: number;
  review_lower_bound: number;
  category_overrides?: Record<string, number>;
}

export interface GateConfig {
  ignore_terms: string[];
  include_terms: string[];
  conditional_includes?: ConditionalInclude[];
}

export interface ConditionalInclude {
  term: string;
  require_any?: string[];
  block_if_any?: string[];
}

export interface SynonymConfig {
  mappings: Record<string, string[]>;
  arabic_aliases?: Record<string, string[]>;
}

export interface CategoryConfig {
  hierarchy?: CategoryNode[];
  rules?: Record<string, string[]>;
}

export interface CategoryNode {
  id: string;
  name: string;
  keywords: string[];
  subcategories?: CategoryNode[];
}

export interface ArabicConfig {
  normalize_hamza: boolean;
  normalize_ya: boolean;
  normalize_tah: boolean;
  remove_diacritics: boolean;
  remove_tatweel: boolean;
}
