/**
 * Type definitions for the modular PT classification system
 */

export interface PackageManifest {
  name: string;
  version: string;
  description: string;
  type: 'taxonomy' | 'normalization' | 'vocabulary' | 'rules' | 'brands' | 'integration';
  schema_version: string;
  created_at: string;
  dependencies: string[];
  files: Record<string, FileSpec>;
  metadata: Record<string, any>;
}

export interface FileSpec {
  description: string;
  format: 'json' | 'jsonl' | 'csv' | 'jsonl_shards';
  encoding: string;
  checksum?: string;
}

export interface PTProfile {
  profile_name: string;
  description: string;
  version: string;
  target_environments: string[];
  packages: Record<string, string | ShardedPackageRef>;
  runtime_config: RuntimeConfig;
  features: Record<string, boolean>;
}

export interface ShardedPackageRef {
  version: string;
  shards: string[];
}

export interface RuntimeConfig {
  max_memory_mb: number;
  enable_caching: boolean;
  shard_loading: 'lazy' | 'eager';
  compression: 'gzip' | 'lz4' | 'none';
  indexing?: 'full' | 'partial' | 'none';
}

export interface ComposedEngine {
  taxonomy: TaxonomyData;
  normalizers: {
    ar: NormalizationRules;
    en: NormalizationRules;
  };
  vocabularies: {
    ar: VocabularyData;
    en: VocabularyData;
  };
  rules: {
    ar: RuleSet;
    en: RuleSet;
  };
  brands?: BrandData[] | null;
  nupco?: NupcoData | null;
  config: RuntimeConfig;
}

export interface TaxonomyData {
  l1_categories: L1Category[];
  metadata: {
    version: string;
    total_l1: number;
    total_l2: number;
    supported_domains: string[];
    supported_regions: string[];
  };
}

export interface L1Category {
  id: string;
  l1_en: string;
  l1_ar: string;
  l2_categories: L2Category[];
}

export interface L2Category {
  id: string;
  l2_en: string;
  l2_ar: string;
  body_regions: string[];
  pt_domains: string[];
}

export interface NormalizationRules {
  processing_order: string[];
  [key: string]: any;
}

export interface VocabularyData {
  include: VocabTerm[];
  shards: Record<string, SynonymEntry[]>;
}

export interface VocabTerm {
  term: string;
  score: number;
  category: string;
  pt_domain: string;
}

export interface SynonymEntry {
  canonical: string;
  synonyms: string[];
  score: number;
}

export interface RuleSet {
  filters: {
    hard_blockers: Record<string, string[]>;
    soft_demotions: Record<string, string[]>;
    pt_specific_boosts: Record<string, string[]>;
    contextual_rules: any;
  };
  scoring: {
    base_weights: Record<string, number>;
    category_multipliers: Record<string, number>;
    contextual_boosts: Record<string, BoostRule>;
    penalty_rules: Record<string, PenaltyRule>;
    thresholds: {
      high_confidence: number;
      medium_confidence: number;
      low_confidence: number;
      rejection_threshold: number;
    };
  };
}

export interface BoostRule {
  keywords: string[];
  boost_factor: number;
}

export interface PenaltyRule {
  keywords: string[];
  penalty_factor: number;
}

export interface BrandData {
  brand: string;
  categories: string[];
  reputation_score: number;
  country: string;
  pt_focus: boolean;
}

export interface NupcoData {
  codes: {
    prefix_mapping: Record<string, NupcoMapping>;
    classification_rules: {
      high_pt_relevance: string[];
      medium_pt_relevance: string[];
      excluded_categories: string[];
      requires_manual_review: string[];
    };
  };
  golden: GoldenRecord[];
}

export interface NupcoMapping {
  category: string;
  pt_relevance: 'high' | 'medium' | 'exclude';
  description: string;
}

export interface GoldenRecord {
  nupco_code: string;
  item_name: string;
  pt_confidence: number;
  category: string;
  verified: boolean;
}

// Classification types
export interface Item {
  id: string;
  name: string;
  description?: string;
  code?: string;
}

export interface ClassificationResult {
  item_id: string;
  is_pt: boolean;
  confidence: number;
  category: string | null;
  pt_domain: string | null;
  explanation: string[];
  language_detected: 'ar' | 'en';
}