export interface KnowledgePack {
  taxonomy: { category: string; subcategories: string[] }[];
  aliases: { canonical: string; variants: string[]; tags?: string[] }[];
  negatives: { blockers: string[]; demotions: string[] };
  weights: {
    // Legacy/analysis weights
    tag_weights: Record<string, number>;
    score_modifiers: Record<string, number>;
    thresholds: Record<string, number>;
    category_threshold_overrides: Record<string, number>;
    brand_boost: Record<string, number>;
    variant_patterns: Record<string, string>;

    // Optional engine3v-friendly fields (present when using unified v3 packs)
    field_weights?: {
      name: number;
      brand: number;
      model: number;
      description: number;
      category: number;
    };
    exact_match_bonus?: number;
    synonym_match_bonus?: number;
    category_boost?: number;
    diagnostic_penalty?: number;
    ignore_penalty?: number;
  };
}
