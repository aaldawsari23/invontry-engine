/**
 * Runtime Compiler - Builds optimized runtime packages from registry
 * Pre-compiles indices, bloom filters, and compressed vocabularies
 */
import * as fs from 'fs';
import * as path from 'path';
import { BloomFilter, MedicalTermBloomFilter } from '../engine-core/indexers/bloom';
import { CompressedTrie } from '../engine-core/indexers/trie';
import { TokenIndex, MedicalTokenizer } from '../engine-core/indexers/tokens';

interface RuntimeProfile {
  profile_name: string;
  packages: Record<string, string | any>;
  runtime_config: any;
  features: Record<string, boolean>;
}

export class RuntimeCompiler {
  private sourcePath: string;
  private outputPath: string;

  constructor(sourcePath: string = './pt', outputPath: string = './pt/runtime') {
    this.sourcePath = sourcePath;
    this.outputPath = outputPath;
  }

  /**
   * Build runtime package for specific profile
   */
  async buildRuntime(profileName: 'lite' | 'full'): Promise<void> {
    console.log(`🏗️ Building ${profileName} runtime package...`);
    
    try {
      // Load profile
      const profile = await this.loadProfile(profileName);
      const runtimeDir = path.join(this.outputPath, profileName);
      
      // Ensure output directory exists
      await fs.promises.mkdir(runtimeDir, { recursive: true });
      
      // Build components
      await this.buildMetadata(profile, runtimeDir);
      await this.buildNormalizers(profile, runtimeDir);
      await this.buildVocabularies(profile, runtimeDir);
      await this.buildRules(profile, runtimeDir);
      
      if (profile.features.brand_intelligence) {
        await this.buildBrands(profile, runtimeDir);
      }
      
      if (profile.features.nupco_integration) {
        await this.buildNupco(profile, runtimeDir);
      }
      
      // Build performance indices
      await this.buildIndices(profile, runtimeDir);
      
      console.log(`✅ ${profileName} runtime built successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to build ${profileName} runtime:`, error);
      throw error;
    }
  }

  /**
   * Load profile configuration
   */
  private async loadProfile(profileName: string): Promise<RuntimeProfile> {
    const profilePath = path.join(this.sourcePath, 'profiles', `runtime-${profileName}.ptlock.json`);
    const content = await fs.promises.readFile(profilePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Build metadata file
   */
  private async buildMetadata(profile: RuntimeProfile, outputDir: string): Promise<void> {
    const metadata = {
      profile_name: profile.profile_name,
      build_timestamp: new Date().toISOString(),
      features: profile.features,
      config: profile.runtime_config,
      version: '2.0.0'
    };
    
    await fs.promises.writeFile(
      path.join(outputDir, 'runtime.meta.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Build normalization rules
   */
  private async buildNormalizers(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  📝 Building normalizers...');
    
    for (const lang of ['ar', 'en']) {
      const version = profile.packages[`pt.normalization.${lang}`];
      const sourcePath = path.join(this.sourcePath, `registry/pt.normalization.${lang}/${version}/rules.json`);
      
      try {
        const rules = JSON.parse(await fs.promises.readFile(sourcePath, 'utf-8'));
        
        // Optimize rules for runtime
        const optimizedRules = this.optimizeNormalizationRules(rules);
        
        await fs.promises.writeFile(
          path.join(outputDir, `runtime.rules.${lang}.json`),
          JSON.stringify(optimizedRules)
        );
        
      } catch (error) {
        console.warn(`Warning: Could not build normalizer for ${lang}:`, error.message);
      }
    }
  }

  /**
   * Build vocabulary indices with bloom filters and tries
   */
  private async buildVocabularies(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  📚 Building vocabulary indices...');
    
    for (const lang of ['ar', 'en']) {
      await this.buildVocabularyForLanguage(profile, lang, outputDir);
    }
  }

  private async buildVocabularyForLanguage(
    profile: RuntimeProfile, 
    lang: 'ar' | 'en', 
    outputDir: string
  ): Promise<void> {
    const vocabConfig = profile.packages[`pt.vocab.${lang}`];
    const version = typeof vocabConfig === 'string' ? vocabConfig : vocabConfig.version;
    const basePath = path.join(this.sourcePath, `registry/pt.vocab.${lang}/${version}`);
    
    try {
      // Load normalization rules for this language
      const normalizationVersion = profile.packages[`pt.normalization.${lang}`];
      const normalizationPath = path.join(this.sourcePath, `registry/pt.normalization.${lang}/${normalizationVersion}/rules.json`);
      const normalizationRules = JSON.parse(await fs.promises.readFile(normalizationPath, 'utf-8'));
      const normalizer = this.createNormalizer(normalizationRules);
      
      // Create tokenizer
      const tokenizer = new MedicalTokenizer(lang);
      
      // Load vocabulary terms
      const includeTerms = await this.loadJsonl(path.join(basePath, 'include.jsonl'));
      
      // Load sharded synonyms if specified
      let allTerms = [...includeTerms];
      if (vocabConfig.shards) {
        for (const shard of vocabConfig.shards) {
          const shardPath = path.join(basePath, 'synonyms_shards', `${shard}.jsonl`);
          try {
            const shardTerms = await this.loadJsonl(shardPath);
            // Flatten synonyms into individual terms
            const expandedTerms = shardTerms.flatMap((entry: any) => [
              { term: entry.canonical, score: entry.score, category: 'general', pt_domain: 'general' },
              ...entry.synonyms.map((syn: string) => ({ 
                term: syn, 
                score: entry.score * 0.9, // Slight penalty for synonyms
                category: 'general', 
                pt_domain: 'general' 
              }))
            ]);
            allTerms.push(...expandedTerms);
          } catch (error) {
            console.warn(`Could not load shard ${shard}:`, error.message);
          }
        }
      }
      
      console.log(`    Building ${lang} vocabulary: ${allTerms.length} terms`);
      
      // Build bloom filter
      const bloomFilter = new MedicalTermBloomFilter(allTerms.length, lang, normalizer);
      bloomFilter.addVocabulary(allTerms);
      
      // Build compressed trie
      const trie = new CompressedTrie();
      allTerms.forEach(term => {
        const normalized = normalizer(term.term);
        trie.insert(normalized, {
          term: term.term,
          score: term.score,
          category: term.category,
          pt_domain: term.pt_domain
        });
      });
      
      // Build token index
      const tokenIndex = new TokenIndex();
      allTerms.forEach(term => {
        const normalized = normalizer(term.term);
        tokenIndex.addTerm(
          term.term,
          normalized,
          term.score,
          term.category,
          term.pt_domain,
          (text) => tokenizer.tokenize(text)
        );
      });
      tokenIndex.finalizeIndex();
      
      // Save indices
      await fs.promises.writeFile(
        path.join(outputDir, `runtime.vocab.${lang}.bloom.bin`),
        Buffer.from(bloomFilter.serialize())
      );
      
      await fs.promises.writeFile(
        path.join(outputDir, `runtime.vocab.${lang}.trie.json`),
        trie.serialize()
      );
      
      await fs.promises.writeFile(
        path.join(outputDir, `runtime.vocab.${lang}.tokens.json`),
        JSON.stringify(tokenIndex.serialize())
      );
      
      // Create vocabulary metadata
      const vocabMeta = {
        language: lang,
        total_terms: allTerms.length,
        bloom_stats: bloomFilter.getStats(),
        trie_stats: trie.getStats(),
        token_stats: tokenIndex.getStats(),
        build_time: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        path.join(outputDir, `runtime.vocab.${lang}.meta.json`),
        JSON.stringify(vocabMeta, null, 2)
      );
      
      console.log(`    ✅ ${lang} vocabulary built:`, vocabMeta);
      
    } catch (error) {
      console.warn(`Warning: Could not build vocabulary for ${lang}:`, error.message);
    }
  }

  /**
   * Build rules for filtering and scoring
   */
  private async buildRules(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  ⚖️ Building rules...');
    
    for (const lang of ['ar', 'en']) {
      const version = profile.packages[`pt.rules.${lang}`];
      const basePath = path.join(this.sourcePath, `registry/pt.rules.${lang}/${version}`);
      
      try {
        const filters = JSON.parse(await fs.promises.readFile(path.join(basePath, 'filters.json'), 'utf-8'));
        const scoring = JSON.parse(await fs.promises.readFile(path.join(basePath, 'scoring.json'), 'utf-8'));
        
        const optimizedRules = {
          filters: this.optimizeFilters(filters),
          scoring: this.optimizeScoring(scoring),
          compiled_at: new Date().toISOString()
        };
        
        await fs.promises.writeFile(
          path.join(outputDir, `runtime.rules.${lang}.json`),
          JSON.stringify(optimizedRules)
        );
        
      } catch (error) {
        console.warn(`Warning: Could not build rules for ${lang}:`, error.message);
      }
    }
  }

  /**
   * Build brand intelligence data
   */
  private async buildBrands(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  🏷️ Building brand intelligence...');
    
    const version = profile.packages['pt.brands.core'];
    const brandsPath = path.join(this.sourcePath, `registry/pt.brands.core/${version}/brands.jsonl`);
    
    try {
      const brands = await this.loadJsonl(brandsPath);
      
      // Create brand lookup map for O(1) access
      const brandMap = new Map();
      brands.forEach((brand: any) => {
        brandMap.set(brand.brand.toLowerCase(), brand);
      });
      
      const brandData = {
        brands: Array.from(brandMap.values()),
        lookup: Object.fromEntries(brandMap),
        total_brands: brands.length,
        compiled_at: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        path.join(outputDir, 'runtime.brands.json'),
        JSON.stringify(brandData)
      );
      
    } catch (error) {
      console.warn('Warning: Could not build brand intelligence:', error.message);
    }
  }

  /**
   * Build NUPCO integration data
   */
  private async buildNupco(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  🏥 Building NUPCO integration...');
    
    const version = profile.packages['pt.nupco.core'];
    const basePath = path.join(this.sourcePath, `registry/pt.nupco.core/${version}`);
    
    try {
      const codes = JSON.parse(await fs.promises.readFile(path.join(basePath, 'code_prefix_rules.json'), 'utf-8'));
      const golden = await this.loadJsonl(path.join(basePath, 'golden_records.jsonl'));
      
      // Create optimized NUPCO lookup
      const nupcoData = {
        prefix_rules: codes.prefix_mapping,
        classification_rules: codes.classification_rules,
        golden_records: golden.reduce((map: any, record: any) => {
          map[record.nupco_code] = record;
          return map;
        }, {}),
        compiled_at: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        path.join(outputDir, 'runtime.nupco.json'),
        JSON.stringify(nupcoData)
      );
      
    } catch (error) {
      console.warn('Warning: Could not build NUPCO integration:', error.message);
    }
  }

  /**
   * Build unified performance indices
   */
  private async buildIndices(profile: RuntimeProfile, outputDir: string): Promise<void> {
    console.log('  🚀 Building unified indices...');
    
    // Create unified search index combining all vocabularies
    const unifiedIndex = {
      ar: await this.loadIfExists(path.join(outputDir, 'runtime.vocab.ar.meta.json')),
      en: await this.loadIfExists(path.join(outputDir, 'runtime.vocab.en.meta.json')),
      build_info: {
        profile: profile.profile_name,
        features: profile.features,
        build_time: new Date().toISOString(),
        estimated_memory: this.estimateMemoryUsage(profile)
      }
    };
    
    await fs.promises.writeFile(
      path.join(outputDir, 'runtime.index.json'),
      JSON.stringify(unifiedIndex, null, 2)
    );
  }

  // Helper methods
  private async loadJsonl(filePath: string): Promise<any[]> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content.trim().split('\n').map(line => JSON.parse(line));
  }

  private async loadIfExists(filePath: string): Promise<any | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private createNormalizer(rules: any): (text: string) => string {
    return (text: string) => {
      let normalized = text.toLowerCase();
      
      // Apply normalization rules in order
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

  private optimizeNormalizationRules(rules: any): any {
    // Pre-compile regex patterns for better performance
    const optimized = { ...rules };
    
    for (const [key, rule] of Object.entries(rules)) {
      if (typeof rule === 'object' && (rule as any).pattern) {
        (optimized as any)[key] = {
          ...(rule as any),
          compiled_pattern: new RegExp((rule as any).pattern, 'g').source
        };
      }
    }
    
    return optimized;
  }

  private optimizeFilters(filters: any): any {
    // Flatten and optimize filter rules
    return {
      ...filters,
      compiled_blockers: Object.values(filters.hard_blockers || {}).flat(),
      compiled_demotions: Object.values(filters.soft_demotions || {}).flat(),
      compiled_boosts: Object.values(filters.pt_specific_boosts || {}).flat()
    };
  }

  private optimizeScoring(scoring: any): any {
    // Pre-calculate commonly used values
    return {
      ...scoring,
      max_base_weight: Math.max(...Object.values(scoring.base_weights || {})),
      threshold_array: Object.values(scoring.thresholds || {}).sort((a: any, b: any) => b - a)
    };
  }

  private estimateMemoryUsage(profile: RuntimeProfile): string {
    const features = profile.features;
    let estimatedMB = 5; // Base overhead
    
    if (features.basic_classification) estimatedMB += 10;
    if (features.multilingual) estimatedMB += 15;
    if (features.advanced_scoring) estimatedMB += 20;
    if (features.brand_intelligence) estimatedMB += 5;
    if (features.nupco_integration) estimatedMB += 10;
    if (features.graph_analysis) estimatedMB += 50;
    
    return `${estimatedMB}MB`;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const compiler = new RuntimeCompiler();
  const profile = process.argv[2] as 'lite' | 'full' || 'lite';
  
  compiler.buildRuntime(profile)
    .then(() => console.log('🎉 Runtime compilation completed!'))
    .catch(console.error);
}