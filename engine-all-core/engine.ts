// src/engine.ts - Main Engine Class
import { Normalizer } from './core/normalizer';
import { Tokenizer } from './core/tokenizer';
import { Scorer } from './core/scorer';
import { Filter } from './core/filter';
import { Deduplicator } from './core/dedupe';
import { ConfigLoader } from './config/loader';
import type { 
  EngineConfig, 
  CatalogItem, 
  ProcessedItem, 
  EngineResult, 
  NormalizedItem, 
  ScoredItem, 
  FilterOptions, 
  SortOptions, 
  ItemExplanation, 
  ItemStatus,
  ScoreReason,
  EngineStats
} from './types';

export class PTFilterEngine {
  private normalizer: Normalizer;
  private tokenizer: Tokenizer;
  private scorer: Scorer;
  private filter: Filter;
  private deduplicator: Deduplicator;
  private config: EngineConfig;
  private processedItems: ProcessedItem[] = [];

  constructor(config?: Partial<EngineConfig>) {
    this.config = ConfigLoader.load(config);
    this.normalizer = new Normalizer();
    this.tokenizer = new Tokenizer(this.config);
    this.scorer = new Scorer(this.config);
    this.filter = new Filter(this.config);
    this.deduplicator = new Deduplicator(this.config);
  }

  /**
   * Process catalog items through the pipeline
   */
  process(items: CatalogItem[]): EngineResult {
    const startTime = performance.now();
    
    // Phase 1: Normalize & tokenize
    const normalized = items.map(item => this.normalizeItem(item));
    
    // Phase 2: Deduplicate
    const deduplicated = this.deduplicator.dedupe(normalized);
    
    // Phase 3: Score
    const scored = deduplicated.map(item => this.scoreItem(item));
    
    // Phase 4: Apply status thresholds
    const withStatus = scored.map(item => this.applyStatus(item));
    
    this.processedItems = withStatus;
    
    const processingTime = performance.now() - startTime;
    
    return {
      items: withStatus,
      stats: this.calculateStats(withStatus),
      processingTime,
      config: this.config
    };
  }

  /**
   * Apply filters and sorting
   */
  query(filters?: FilterOptions, sortBy?: SortOptions): ProcessedItem[] {
    let results = [...this.processedItems];
    
    if (filters) {
      results = this.filter.apply(results, filters);
    }
    
    if (sortBy) {
      results = this.sortItems(results, sortBy);
    }
    
    return results;
  }

  /**
   * Get detailed explanation for an item
   */
  explain(itemId: string): ItemExplanation | null {
    const item = this.processedItems.find(i => i.id === itemId);
    if (!item) return null;
    
    return {
      id: item.id,
      score: item.score,
      status: item.status,
      signals: item.scoreBreakdown,
      topReasons: this.getTopReasons(item.scoreBreakdown),
      matchedTerms: {
        positive: item.matchedPositive,
        negative: item.matchedNegative,
        synonyms: item.matchedSynonyms
      },
      normalizedTokens: item.tokens,
      fingerprint: item.fingerprint
    };
  }

  private normalizeItem(item: CatalogItem): NormalizedItem {
    return {
      ...item,
      normalized: {
        name: this.normalizer.normalize(item.name || ''),
        description: this.normalizer.normalize(item.description || ''),
        brand: this.normalizer.normalize(item.brand || ''),
        model: this.normalizer.normalize(item.model || ''),
        category: this.normalizer.normalize(item.category || '')
      },
      tokens: this.tokenizer.tokenize(
        `${item.name} ${item.description} ${item.brand} ${item.model}`
      ),
      fingerprint: this.generateFingerprint(item)
    };
  }

  private scoreItem(item: NormalizedItem): ScoredItem {
    const scoreResult = this.scorer.score(item);
    return {
      ...item,
      ...scoreResult
    };
  }

  private applyStatus(item: ScoredItem): ProcessedItem {
    const { accept_min_score, review_lower_bound } = this.config.thresholds;
    
    let status: ItemStatus;
    if (item.score >= accept_min_score) {
      status = 'accepted';
    } else if (item.score >= review_lower_bound) {
      status = 'review';
    } else {
      status = 'rejected';
    }
    
    return {
      ...item,
      status
    };
  }

  private generateFingerprint(item: CatalogItem): string {
    const key = `${item.sku || ''}_${item.name || ''}_${item.brand || ''}`;
    return this.normalizer.normalize(key).replace(/\s+/g, '');
  }

  private getTopReasons(breakdown: ScoreBreakdown, count = 3): ScoreReason[] {
    return Object.entries(breakdown)
      .map(([signal, value]) => ({
        signal,
        contribution: value,
        percentage: (value / 100) * 100
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, count);
  }

  private sortItems(items: ProcessedItem[], options: SortOptions): ProcessedItem[] {
    const { field, order = 'desc' } = options;
    
    return [...items].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Handle missing values
      if (aVal == null) aVal = field === 'score' ? 0 : '';
      if (bVal == null) bVal = field === 'score' ? 0 : '';
      
      // Compare
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      }
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return order === 'desc' ? -comparison : comparison;
    });
  }

  private calculateStats(items: ProcessedItem[]): EngineStats {
    const byStatus = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<ItemStatus, number>);
    
    const scoreDistribution = this.getScoreDistribution(items);
    
    return {
      total: items.length,
      accepted: byStatus.accepted || 0,
      review: byStatus.review || 0,
      rejected: byStatus.rejected || 0,
      averageScore: items.reduce((sum, i) => sum + i.score, 0) / items.length || 0,
      scoreDistribution
    };
  }

  private getScoreDistribution(items: ProcessedItem[]): Record<string, number> {
    const bins = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    
    items.forEach(item => {
      if (item.score <= 20) bins['0-20']++;
      else if (item.score <= 40) bins['21-40']++;
      else if (item.score <= 60) bins['41-60']++;
      else if (item.score <= 80) bins['61-80']++;
      else bins['81-100']++;
    });
    
    return bins;
  }

  // Configuration update methods
  updateConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
    this.tokenizer.updateConfig(this.config);
    this.scorer.updateConfig(this.config);
    this.filter.updateConfig(this.config);
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }
}

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
  exactBonus: number;
  synonymBonus: number;
  diagnosticPenalty: number;
  ignorePenalty: number;
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
  categories: CategoryConfig;
  arabic: ArabicConfig;
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
  hierarchy: CategoryNode[];
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
