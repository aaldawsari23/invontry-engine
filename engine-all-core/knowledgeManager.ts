
import type { KnowledgePack } from './schemas';

export class KnowledgeManager {
  private pack: KnowledgePack | null = null;
  private version = '0';

  async load(base = '/knowledge'): Promise<void> {
    try {
        // Try to load the new v3 unified knowledge pack first
        try {
          const unifiedPack = await fetch(`${base}/knowledge_pack_v3.json`).then(r => r.json());
          if (unifiedPack && unifiedPack.version) {
            this.pack = this.convertUnifiedPack(unifiedPack);
            this.version = unifiedPack.version || String(Date.now());
            console.log('Loaded engine3v knowledge pack v3');
            return;
          }
        } catch (v3Error) {
          console.warn('Failed to load v3 knowledge pack, falling back to individual files:', v3Error);
        }

        // Fallback to individual files
        const [taxonomy, aliasesAr, aliasesEn, negatives, weights] = await Promise.all([
          fetch(`${base}/taxonomy.json`).then(r => r.json()),
          fetch(`${base}/aliases.ar.json`).then(r => r.json()),
          fetch(`${base}/aliases.en.json`).then(r => r.json()),
          fetch(`${base}/negatives.json`).then(r => r.json()),
          fetch(`${base}/weights.json`).then(r => r.json()),
        ]);
        
        this.pack = {
          taxonomy,
          aliases: [...aliasesEn, ...aliasesAr],
          negatives,
          weights,
        };
        this.version = String(Date.now());
        console.log('Loaded legacy knowledge pack from individual files');
    } catch (error) {
        console.error("Failed to load knowledge pack:", error);
        throw new Error(`Knowledge pack not loaded. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertUnifiedPack(unifiedPack: any): KnowledgePack {
    // Convert engine3v unified file to our KnowledgePack format
    const kpParts = Array.isArray(unifiedPack.knowledge_pack) ? unifiedPack.knowledge_pack : [];

    // Build taxonomy from categories/subcategories
    const taxonomy = kpParts.flatMap((part: any) => (part.categories || [])).map((cat: any) => ({
      category: String(cat.category || 'Uncategorized'),
      subcategories: (cat.subcategories || []).map((s: any) => String(s.name || 'General'))
    }));

    // Build aliases from keywords
    const aliases: { canonical: string; variants: string[]; tags?: string[] }[] = [];
    kpParts.forEach((part: any) => {
      (part.categories || []).forEach((cat: any) => {
        (cat.subcategories || []).forEach((sub: any) => {
          (sub.keywords || []).forEach((kw: any) => {
            if (!kw || !kw.canonical) return;
            aliases.push({
              canonical: String(kw.canonical),
              variants: Array.isArray(kw.aliases) ? kw.aliases.map((v: any) => String(v)) : [],
              tags: Array.isArray(kw.tags) ? kw.tags.map((t: any) => String(t)) : []
            });
          });
        });
      });
    });

    // Derive negatives (blockers) from engine config
    const engineCfg = unifiedPack.engine_config || {};
    const cfg = engineCfg.config || {};
    const blockers: string[] = Array.isArray(engineCfg.diagnostic_blockers) ? engineCfg.diagnostic_blockers : [];
    const negatives = { blockers, demotions: [] as string[] };

    // Weights mapping (provide both legacy and engine-friendly fields)
    const tagWeights = (cfg.weights && cfg.weights.tags) || { default: 5 };
    const thresholds = cfg.thresholds || { accept_min_score: 60, reject_threshold: 30 };
    const categoryOverrides = engineCfg.thresholds_by_category || {};
    const variantPatterns = cfg.variant_patterns || unifiedPack.variant_patterns || {};

    // Brand boost - derive a simple map from brand_map (uniform boost)
    const brandBoost: Record<string, number> = {};
    const brandMap = unifiedPack.brand_map || {};
    Object.keys(brandMap).forEach((brand: string) => {
      brandBoost[brand.toLowerCase()] = 5;
    });

    const weights = {
      // Legacy consumers
      tag_weights: tagWeights,
      score_modifiers: {
        diagnostic_blocker: -Math.abs((cfg.weights && cfg.weights.diagnostic_blocker) || 100),
        demotion_term: -25
      },
      thresholds,
      category_threshold_overrides: categoryOverrides,
      brand_boost: brandBoost,
      variant_patterns: variantPatterns,

      // Engine3v helpers
      field_weights: {
        name: 10,
        brand: 8,
        model: 6,
        description: 5,
        category: 7
      },
      exact_match_bonus: 15,
      synonym_match_bonus: 10,
      category_boost: 5,
      diagnostic_penalty: -20,
      ignore_penalty: -50
    };

    return {
      taxonomy,
      aliases,
      negatives,
      weights
    };
  }

  get(): KnowledgePack {
    if (!this.pack) throw new Error('Knowledge pack not loaded');
    return this.pack;
  }

  getVersion(): string { return this.version; }
}
