import type { EngineConfig } from '../types';

// src/config/loader.ts - Configuration Loader
export class ConfigLoader {
  /**
   * Load and merge configuration from various sources
   */
  static load(userConfig?: Partial<EngineConfig>): EngineConfig {
    // Default configuration
    const defaultConfig: EngineConfig = {
      weights: {
        title: 2.0,
        brand: 1.5,
        model: 1.2,
        description: 1.0,
        category: 1.6,
        exactMatch: 3.0,
        synonymMatch: 1.5,
        categoryBoost: 2.0,
        diagnosticPenalty: -15,
        ignorePenalty: -10
      },
      thresholds: {
        accept_min_score: 60,
        review_lower_bound: 40,
        category_overrides: {}
      },
      gates: {
        ignore_terms: [],
        include_terms: [],
        conditional_includes: []
      },
      synonyms: {
        mappings: {},
        arabic_aliases: {}
      },
      categories: {
        hierarchy: [],
        rules: {}
      },
      arabic: {
        normalize_hamza: true,
        normalize_ya: true,
        normalize_tah: true,
        remove_diacritics: true,
        remove_tatweel: true
      },
      variant_patterns: {
        size: "\\b(XXS|XS|S|M|L|XL|2XL|3XL|صغير|متوسط|كبير|كبير جدا)\\b",
        side: "\\b(left|right|bilateral|universal|يمين|يسار)\\b",
        age_fit: "\\b(pediatric|adult|bariatric|اطفال|بالغ|بدين)\\b",
        color: "\\b(yellow|red|green|blue|black|silver|gold|white|grey|gray|أصفر|أحمر|أخضر|أزرق|أسود|فضي|ذهبي|أبيض|رمادي)\\b",
        resistance: "\\b(level|resistance|grade)\\s*(very\\s*light|light|medium|heavy|x\\s*-?heavy|xx\\s*-?heavy|[1-9])\\b",
        dimension: "\\b(\\d+(\\.\\d+)?\\s*(cm|mm|m|in|inch|yd|سم|ملم|م))\\b",
        pack_uom: "\\b(box|pack|case|pair|dozen|roll|bottle|jar|each|pcs?|زوج|علبة|كرتون|لفة)\\b|x\\s*\\d+"
      },
      diagnostic_blockers: [],
      strong_pt_terms: [],
      columns_map: {
        id: 'id',
        sku: 'sku',
        name: 'name',
        name_ar: 'name_ar',
        description: 'description',
        description_ar: 'description_ar',
        brand: 'brand',
        model: 'model',
        category: 'category',
        subcategory: 'subcategory',
        price: 'price',
        tags: 'tags',
        region: 'region',
        type: 'type'
      }
    };
    
    // Merge with user config
    if (userConfig) {
      return this.deepMerge(defaultConfig, userConfig);
    }
    
    return defaultConfig;
  }
  
  /**
   * Deep merge two objects
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Load configuration from file (for Node.js environments)
   */
  static async loadFromFile(filepath: string): Promise<EngineConfig> {
    if (typeof window !== 'undefined') {
      throw new Error('File loading is not available in browser environment');
    }
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const ext = path.extname(filepath).toLowerCase();
    const content = await fs.readFile(filepath, 'utf-8');
    
    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.js' || ext === '.ts') {
      return require(filepath);
    } else {
      throw new Error(`Unsupported config file format: ${ext}`);
    }
  }
}