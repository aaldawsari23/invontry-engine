/**
 * Ultra-Fast Zero-Copy Classification Engine
 * Memory-optimized classifier with pre-compiled indices for maximum performance
 */
import { BloomFilter, MedicalTermBloomFilter } from './indexers/bloom';
import { CompressedTrie } from './indexers/trie';
import { TokenIndex, MedicalTokenizer } from './indexers/tokens';

interface RuntimeData {
  metadata: any;
  normalizers: {
    ar: any;
    en: any;
  };
  vocabularies: {
    ar: {
      bloom: MedicalTermBloomFilter;
      trie: CompressedTrie;
      tokens: TokenIndex;
      meta: any;
    };
    en: {
      bloom: MedicalTermBloomFilter;
      trie: CompressedTrie;
      tokens: TokenIndex;
      meta: any;
    };
  };
  rules: {
    ar: any;
    en: any;
  };
  brands?: any;
  nupco?: any;
}

interface ClassificationInput {
  id: string;
  name: string;
  description?: string;
  code?: string;
}

interface FastClassificationResult {
  item_id: string;
  is_pt: boolean;
  confidence: number;
  category: string | null;
  pt_domain: string | null;
  language: 'ar' | 'en';
  processing_time_ms: number;
  matched_terms: string[];
  explanation: string[];
}

export class UltraFastClassifier {
  private runtime: RuntimeData | null = null;
  private tokenizers: Map<string, MedicalTokenizer> = new Map();
  private normalizers: Map<string, (text: string) => string> = new Map();
  private isInitialized = false;

  /**
   * Initialize classifier with pre-compiled runtime data
   */
  async initialize(runtimePath: string): Promise<void> {
    const startTime = performance.now();
    console.log('🚀 Initializing Ultra-Fast PT Classifier...');

    try {
      // Load runtime metadata
      const metadata = await this.loadJson(`${runtimePath}/runtime.meta.json`);
      
      // Load normalizers
      const normalizers = await this.loadNormalizers(runtimePath);
      
      // Load vocabularies with indices
      const vocabularies = await this.loadVocabularies(runtimePath, normalizers);
      
      // Load rules
      const rules = await this.loadRules(runtimePath);
      
      // Load optional components
      const brands = metadata.features.brand_intelligence 
        ? await this.loadJson(`${runtimePath}/runtime.brands.json`).catch(() => null)
        : null;
        
      const nupco = metadata.features.nupco_integration
        ? await this.loadJson(`${runtimePath}/runtime.nupco.json`).catch(() => null)
        : null;

      this.runtime = {
        metadata,
        normalizers,
        vocabularies,
        rules,
        brands,
        nupco
      };

      // Create tokenizers
      this.tokenizers.set('ar', new MedicalTokenizer('ar'));
      this.tokenizers.set('en', new MedicalTokenizer('en'));

      // Create normalizer functions
      this.normalizers.set('ar', this.createNormalizer(normalizers.ar));
      this.normalizers.set('en', this.createNormalizer(normalizers.en));

      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      console.log(`✅ Ultra-Fast Classifier initialized in ${initTime.toFixed(2)}ms`);
      console.log('📊 Runtime Statistics:', this.getStats());
      
    } catch (error) {
      console.error('❌ Failed to initialize Ultra-Fast Classifier:', error);
      throw error;
    }
  }

  /**
   * Classify single item with maximum performance
   */
  classify(input: ClassificationInput): FastClassificationResult {
    if (!this.isInitialized || !this.runtime) {
      throw new Error('Classifier not initialized');
    }

    const startTime = performance.now();
    const text = `${input.name} ${input.description || ''}`.toLowerCase().trim();
    
    // Fast language detection
    const language = this.detectLanguage(text);
    const vocab = this.runtime.vocabularies[language];
    const rules = this.runtime.rules[language];
    
    // Initialize result
    const result: FastClassificationResult = {
      item_id: input.id,
      is_pt: false,
      confidence: 0,
      category: null,
      pt_domain: null,
      language,
      processing_time_ms: 0,
      matched_terms: [],
      explanation: []
    };

    // Stage 1: Ultra-fast negative filtering with bloom filter
    const normalizer = this.normalizers.get(language)!;
    const normalizedText = normalizer(text);
    
    if (!vocab.bloom.mightContainTerm(normalizedText)) {
      result.processing_time_ms = performance.now() - startTime;
      result.explanation.push('Bloom filter: No PT terms detected');
      return result; // Definitely not PT, confidence = 0
    }

    // Stage 2: Hard blocker check (optimized with pre-compiled patterns)
    if (this.checkBlockers(normalizedText, rules)) {
      result.processing_time_ms = performance.now() - startTime;
      result.explanation.push('Blocked by exclusion rules');
      return result;
    }

    // Stage 3: NUPCO code analysis (if available and code provided)
    let nupcoScore = 0;
    if (this.runtime.nupco && input.code) {
      const nupcoResult = this.analyzeNupcoCode(input.code);
      nupcoScore = nupcoResult.score;
      result.confidence += nupcoScore;
      if (nupcoResult.category) {
        result.category = nupcoResult.category;
      }
      result.explanation.push(`NUPCO: ${nupcoScore}`);
    }

    // Stage 4: Token-based fast matching
    const tokenizer = this.tokenizers.get(language)!;
    const tokenMatches = vocab.tokens.search(normalizedText, (text) => tokenizer.tokenize(text), 5);
    
    let maxTokenScore = 0;
    let bestTokenMatch = null;
    
    for (const match of tokenMatches) {
      if (match.score > maxTokenScore) {
        maxTokenScore = match.score;
        bestTokenMatch = match.term;
      }
    }
    
    result.confidence += maxTokenScore;
    if (bestTokenMatch) {
      result.matched_terms.push(bestTokenMatch.term);
      result.category = result.category || bestTokenMatch.category;
      result.pt_domain = result.pt_domain || bestTokenMatch.pt_domain;
    }
    result.explanation.push(`Tokens: ${maxTokenScore.toFixed(1)}`);

    // Stage 5: Trie-based prefix matching (fallback for fuzzy matches)
    const trieMatches = vocab.trie.fuzzySearch(normalizedText, 1, 3);
    let maxTrieScore = 0;
    
    for (const match of trieMatches) {
      if (match.score > maxTrieScore) {
        maxTrieScore = match.score;
        if (!result.matched_terms.includes(match.term)) {
          result.matched_terms.push(match.term);
        }
        result.category = result.category || match.category;
        result.pt_domain = result.pt_domain || match.pt_domain;
      }
    }
    
    result.confidence += maxTrieScore * 0.8; // Slight penalty for fuzzy matches
    result.explanation.push(`Trie: ${(maxTrieScore * 0.8).toFixed(1)}`);

    // Stage 6: Contextual scoring boosts
    const contextBoost = this.applyContextualBoosts(normalizedText, rules);
    result.confidence += contextBoost;
    if (contextBoost > 0) {
      result.explanation.push(`Context: +${contextBoost.toFixed(1)}`);
    }

    // Stage 7: Brand intelligence (if available)
    if (this.runtime.brands) {
      const brandBoost = this.analyzeBrands(normalizedText);
      result.confidence += brandBoost;
      if (brandBoost > 0) {
        result.explanation.push(`Brand: +${brandBoost.toFixed(1)}`);
      }
    }

    // Stage 8: Final determination
    const threshold = rules.scoring.thresholds.high_confidence || 45;
    result.is_pt = result.confidence >= threshold;
    result.confidence = Math.min(Math.max(result.confidence, 0), 100);
    
    result.processing_time_ms = performance.now() - startTime;
    
    return result;
  }

  /**
   * Batch classify multiple items with optimized processing
   */
  async classifyBatch(
    items: ClassificationInput[],
    batchSize: number = 1000,
    onProgress?: (processed: number, total: number) => void
  ): Promise<FastClassificationResult[]> {
    if (!this.isInitialized) {
      throw new Error('Classifier not initialized');
    }

    const results: FastClassificationResult[] = [];
    const total = items.length;
    let processed = 0;

    console.log(`🔄 Processing ${total} items in batches of ${batchSize}...`);
    const overallStart = performance.now();

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchStart = performance.now();
      
      // Process batch
      for (const item of batch) {
        const result = this.classify(item);
        results.push(result);
        processed++;
        
        if (onProgress && processed % 100 === 0) {
          onProgress(processed, total);
        }
      }
      
      const batchTime = performance.now() - batchStart;
      const itemsPerSecond = (batch.length / batchTime) * 1000;
      
      if (i % (batchSize * 5) === 0) { // Log every 5 batches
        console.log(`  Processed ${processed}/${total} (${itemsPerSecond.toFixed(0)} items/sec)`);
      }
      
      // Yield control periodically to prevent blocking
      if (i % (batchSize * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const overallTime = performance.now() - overallStart;
    const overallRate = (total / overallTime) * 1000;
    
    console.log(`✅ Batch processing complete: ${overallRate.toFixed(0)} items/second average`);
    
    return results;
  }

  // Private helper methods
  private async loadJson(path: string): Promise<any> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.json();
  }

  private async loadBuffer(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  private async loadNormalizers(runtimePath: string): Promise<any> {
    return {
      ar: await this.loadJson(`${runtimePath}/runtime.rules.ar.json`),
      en: await this.loadJson(`${runtimePath}/runtime.rules.en.json`)
    };
  }

  private async loadVocabularies(runtimePath: string, normalizers: any): Promise<any> {
    const vocabularies: any = {};
    
    for (const lang of ['ar', 'en']) {
      try {
        // Load metadata
        const meta = await this.loadJson(`${runtimePath}/runtime.vocab.${lang}.meta.json`);
        
        // Load bloom filter
        const bloomBuffer = await this.loadBuffer(`${runtimePath}/runtime.vocab.${lang}.bloom.bin`);
        const bloom = BloomFilter.deserialize(bloomBuffer);
        
        // Load trie
        const trieData = await this.loadJson(`${runtimePath}/runtime.vocab.${lang}.trie.json`);
        const trie = CompressedTrie.deserialize(trieData);
        
        // Load token index
        const tokenData = await this.loadJson(`${runtimePath}/runtime.vocab.${lang}.tokens.json`);
        const tokens = TokenIndex.deserialize(tokenData);
        
        vocabularies[lang] = {
          bloom,
          trie,
          tokens,
          meta
        };
        
        console.log(`  ✅ ${lang} vocabulary loaded: ${meta.total_terms} terms`);
        
      } catch (error) {
        console.warn(`Warning: Could not load ${lang} vocabulary:`, error.message);
        // Create empty indices as fallback
        vocabularies[lang] = {
          bloom: new MedicalTermBloomFilter(100, lang as 'ar' | 'en', (text) => text),
          trie: new CompressedTrie(),
          tokens: new TokenIndex(),
          meta: { total_terms: 0 }
        };
      }
    }
    
    return vocabularies;
  }

  private async loadRules(runtimePath: string): Promise<any> {
    return {
      ar: await this.loadJson(`${runtimePath}/runtime.rules.ar.json`),
      en: await this.loadJson(`${runtimePath}/runtime.rules.en.json`)
    };
  }

  private detectLanguage(text: string): 'ar' | 'en' {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
  }

  private createNormalizer(rules: any): (text: string) => string {
    return (text: string) => {
      let normalized = text.toLowerCase();
      
      for (const step of rules.processing_order || []) {
        const rule = rules[step];
        if (typeof rule === 'object' && rule.pattern) {
          normalized = normalized.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
        } else if (typeof rule === 'object') {
          for (const [from, to] of Object.entries(rule)) {
            normalized = normalized.replace(new RegExp(from, 'g'), to as string);
          }
        }
      }
      
      return normalized.trim();
    };
  }

  private checkBlockers(text: string, rules: any): boolean {
    const blockers = rules.filters.compiled_blockers || [];
    return blockers.some((blocker: string) => text.includes(blocker.toLowerCase()));
  }

  private analyzeNupcoCode(code: string): { score: number; category?: string } {
    if (!this.runtime?.nupco) return { score: 0 };
    
    const prefix = code.substring(0, 2);
    const rule = this.runtime.nupco.prefix_rules[prefix];
    
    if (!rule) return { score: 0 };
    
    switch (rule.pt_relevance) {
      case 'high': return { score: 30, category: rule.category };
      case 'medium': return { score: 15, category: rule.category };
      case 'exclude': return { score: -50 };
      default: return { score: 0 };
    }
  }

  private applyContextualBoosts(text: string, rules: any): number {
    const boosts = rules.scoring.contextual_boosts || {};
    let totalBoost = 0;
    
    for (const [name, boost] of Object.entries(boosts)) {
      const boostRule = boost as any;
      for (const keyword of boostRule.keywords || []) {
        if (text.includes(keyword.toLowerCase())) {
          totalBoost += (boostRule.boost_factor - 1) * 20;
          break;
        }
      }
    }
    
    return totalBoost;
  }

  private analyzeBrands(text: string): number {
    if (!this.runtime?.brands) return 0;
    
    const brands = this.runtime.brands.brands || [];
    for (const brand of brands) {
      if (text.includes(brand.brand.toLowerCase())) {
        return brand.pt_focus ? brand.reputation_score * 0.15 : 0;
      }
    }
    
    return 0;
  }

  /**
   * Get classifier statistics
   */
  getStats() {
    if (!this.runtime) return null;
    
    return {
      profile: this.runtime.metadata.profile_name,
      features: this.runtime.metadata.features,
      vocabularies: {
        ar: this.runtime.vocabularies.ar.meta,
        en: this.runtime.vocabularies.en.meta
      },
      estimated_memory: this.runtime.metadata.estimated_memory,
      initialization_complete: this.isInitialized
    };
  }
}

/**
 * Singleton instance for global access
 */
let globalClassifier: UltraFastClassifier | null = null;

export const getUltraFastClassifier = (): UltraFastClassifier => {
  if (!globalClassifier) {
    globalClassifier = new UltraFastClassifier();
  }
  return globalClassifier;
};

export const initializeUltraFastClassifier = async (runtimePath: string) => {
  const classifier = getUltraFastClassifier();
  await classifier.initialize(runtimePath);
  return classifier;
};