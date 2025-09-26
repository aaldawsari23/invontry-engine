/**
 * Lazy Loading System for PT Engine
 * Progressive loading of vocabulary shards and indices based on actual usage
 */

interface ShardMetadata {
  shard: string;
  language: 'ar' | 'en';
  size: number;
  priority: number;
  loaded: boolean;
  lastAccessed?: number;
}

interface LoadingStrategy {
  initial: string[]; // Always load these shards
  onDemand: string[]; // Load when needed
  prefetch: string[]; // Load in background
  cache_size: number; // Max shards to keep in memory
}

export class LazyLoader {
  private basePath: string;
  private strategy: LoadingStrategy;
  private loadedShards: Map<string, any> = new Map();
  private shardMetadata: Map<string, ShardMetadata> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private accessCounter: number = 0;

  constructor(basePath: string, strategy?: LoadingStrategy) {
    this.basePath = basePath;
    this.strategy = strategy || this.getDefaultStrategy();
  }

  /**
   * Initialize loader with shard metadata
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing lazy loader...');
    
    try {
      // Load vocabulary metadata to understand available shards
      await this.loadShardMetadata();
      
      // Load initial shards immediately
      await this.loadInitialShards();
      
      // Start background prefetching
      this.startBackgroundPrefetch();
      
      console.log(`✅ Lazy loader initialized with ${this.loadedShards.size} initial shards`);
      
    } catch (error) {
      console.error('❌ Failed to initialize lazy loader:', error);
      throw error;
    }
  }

  /**
   * Get shard data - loads on demand if not available
   */
  async getShard(language: 'ar' | 'en', shard: string): Promise<any> {
    const shardKey = `${language}-${shard}`;
    
    // Update access statistics
    this.updateAccess(shardKey);
    
    // Return if already loaded
    if (this.loadedShards.has(shardKey)) {
      return this.loadedShards.get(shardKey);
    }
    
    // Check if currently loading
    if (this.loadingPromises.has(shardKey)) {
      return await this.loadingPromises.get(shardKey);
    }
    
    // Load shard on demand
    console.log(`📥 Loading shard on demand: ${shardKey}`);
    return await this.loadShard(language, shard);
  }

  /**
   * Preload shards that are likely to be needed
   */
  async preloadShards(language: 'ar' | 'en', shards: string[]): Promise<void> {
    const preloadPromises = shards.map(shard => {
      const shardKey = `${language}-${shard}`;
      if (!this.loadedShards.has(shardKey) && !this.loadingPromises.has(shardKey)) {
        return this.loadShard(language, shard, true);
      }
      return Promise.resolve();
    });
    
    await Promise.all(preloadPromises);
    console.log(`✅ Preloaded ${shards.length} ${language} shards`);
  }

  /**
   * Get smart suggestions for shards to preload based on query
   */
  getSuggestedShards(query: string, language: 'ar' | 'en'): string[] {
    const firstChar = query.charAt(0).toLowerCase();
    const suggestions: string[] = [];
    
    if (language === 'ar') {
      // Arabic character handling
      if (firstChar >= '\u0600' && firstChar <= '\u06FF') {
        suggestions.push(firstChar);
        // Also suggest common related characters
        const relatedChars = this.getRelatedArabicChars(firstChar);
        suggestions.push(...relatedChars);
      } else {
        suggestions.push('misc'); // Non-Arabic characters
      }
    } else {
      // English character handling
      if (firstChar >= 'a' && firstChar <= 'z') {
        suggestions.push(firstChar);
        // Add adjacent characters for typo tolerance
        const charCode = firstChar.charCodeAt(0);
        if (charCode > 97) suggestions.push(String.fromCharCode(charCode - 1)); // Previous char
        if (charCode < 122) suggestions.push(String.fromCharCode(charCode + 1)); // Next char
      } else {
        suggestions.push('misc');
      }
    }
    
    // Prioritize based on access patterns
    return suggestions.sort((a, b) => {
      const aKey = `${language}-${a}`;
      const bKey = `${language}-${b}`;
      const aPriority = this.shardMetadata.get(aKey)?.priority || 0;
      const bPriority = this.shardMetadata.get(bKey)?.priority || 0;
      return bPriority - aPriority;
    });
  }

  /**
   * Intelligent cache management - evict least recently used shards
   */
  manageCacheSize(): void {
    if (this.loadedShards.size <= this.strategy.cache_size) {
      return;
    }
    
    // Sort shards by last access time
    const sortedShards = Array.from(this.shardMetadata.entries())
      .filter(([key]) => this.loadedShards.has(key))
      .sort(([, a], [, b]) => (a.lastAccessed || 0) - (b.lastAccessed || 0));
    
    // Remove oldest shards
    const toRemove = sortedShards.slice(0, sortedShards.length - this.strategy.cache_size);
    
    for (const [shardKey] of toRemove) {
      console.log(`🗑️ Evicting shard from cache: ${shardKey}`);
      this.loadedShards.delete(shardKey);
      const metadata = this.shardMetadata.get(shardKey);
      if (metadata) {
        metadata.loaded = false;
      }
    }
  }

  /**
   * Get loading statistics
   */
  getStats() {
    const totalShards = this.shardMetadata.size;
    const loadedShards = Array.from(this.shardMetadata.values()).filter(s => s.loaded).length;
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      total_shards: totalShards,
      loaded_shards: loadedShards,
      cache_hit_ratio: this.calculateCacheHitRatio(),
      memory_usage: memoryUsage,
      access_count: this.accessCounter,
      strategy: this.strategy
    };
  }

  // Private methods
  private async loadShardMetadata(): Promise<void> {
    for (const language of ['ar', 'en']) {
      try {
        const metaPath = `${this.basePath}/runtime.vocab.${language}.meta.json`;
        const response = await fetch(metaPath);
        const meta = await response.json();
        
        // Create metadata for each potential shard
        const alphabet = language === 'ar' 
          ? ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'misc']
          : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'misc'];
        
        alphabet.forEach((char, index) => {
          const shardKey = `${language}-${char}`;
          this.shardMetadata.set(shardKey, {
            shard: char,
            language: language as 'ar' | 'en',
            size: 1000, // Estimate
            priority: this.calculateShardPriority(char, language as 'ar' | 'en'),
            loaded: false
          });
        });
        
      } catch (error) {
        console.warn(`Could not load metadata for ${language}:`, error);
      }
    }
  }

  private async loadInitialShards(): Promise<void> {
    const initialPromises: Promise<any>[] = [];
    
    for (const shardId of this.strategy.initial) {
      const [language, shard] = shardId.split('-');
      initialPromises.push(this.loadShard(language as 'ar' | 'en', shard));
    }
    
    await Promise.all(initialPromises);
  }

  private async loadShard(language: 'ar' | 'en', shard: string, background = false): Promise<any> {
    const shardKey = `${language}-${shard}`;
    
    if (this.loadedShards.has(shardKey)) {
      return this.loadedShards.get(shardKey);
    }
    
    if (this.loadingPromises.has(shardKey)) {
      return await this.loadingPromises.get(shardKey);
    }
    
    const loadPromise = this.performShardLoad(language, shard, background);
    this.loadingPromises.set(shardKey, loadPromise);
    
    try {
      const data = await loadPromise;
      this.loadedShards.set(shardKey, data);
      
      const metadata = this.shardMetadata.get(shardKey);
      if (metadata) {
        metadata.loaded = true;
        metadata.lastAccessed = Date.now();
      }
      
      // Manage cache size
      this.manageCacheSize();
      
      return data;
      
    } finally {
      this.loadingPromises.delete(shardKey);
    }
  }

  private async performShardLoad(language: 'ar' | 'en', shard: string, background = false): Promise<any> {
    const shardPath = `${this.basePath}/runtime.vocab.${language}.${shard}.jsonl`;
    
    if (!background) {
      console.log(`📥 Loading ${language} shard: ${shard}`);
    }
    
    try {
      const response = await fetch(shardPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      const data = text.trim().split('\n').map(line => JSON.parse(line));
      
      return data;
      
    } catch (error) {
      console.warn(`Failed to load shard ${shardKey}:`, error.message);
      return []; // Return empty array as fallback
    }
  }

  private startBackgroundPrefetch(): void {
    setTimeout(async () => {
      try {
        for (const shardId of this.strategy.prefetch) {
          const [language, shard] = shardId.split('-');
          if (!this.loadedShards.has(shardId)) {
            await this.loadShard(language as 'ar' | 'en', shard, true);
            // Small delay between background loads
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        console.log('✅ Background prefetching completed');
      } catch (error) {
        console.warn('Background prefetching failed:', error);
      }
    }, 1000); // Start after 1 second
  }

  private updateAccess(shardKey: string): void {
    this.accessCounter++;
    const metadata = this.shardMetadata.get(shardKey);
    if (metadata) {
      metadata.lastAccessed = Date.now();
      // Increase priority based on access frequency
      metadata.priority = Math.min(metadata.priority + 1, 100);
    }
  }

  private calculateShardPriority(shard: string, language: 'ar' | 'en'): number {
    // Higher priority for common first letters
    const commonLetters = language === 'ar' 
      ? ['ا', 'م', 'ك', 'ت', 'ع', 'ج'] // Common Arabic starting letters
      : ['a', 'c', 'd', 'e', 'm', 'p', 's', 't', 'w']; // Common English starting letters for medical terms
    
    if (commonLetters.includes(shard)) {
      return 50 + commonLetters.indexOf(shard);
    }
    
    return 10; // Default priority
  }

  private getRelatedArabicChars(char: string): string[] {
    const relations: Record<string, string[]> = {
      'ا': ['أ', 'إ', 'آ'],
      'ت': ['ة'],
      'ي': ['ى'],
      'ك': ['ق'],
      'س': ['ش'],
      'د': ['ذ'],
      'ر': ['ز'],
      'ط': ['ظ'],
      'ص': ['ض'],
      'ع': ['غ']
    };
    
    return relations[char] || [];
  }

  private calculateCacheHitRatio(): number {
    if (this.accessCounter === 0) return 0;
    
    const hits = Array.from(this.shardMetadata.values())
      .filter(s => s.loaded && s.lastAccessed)
      .length;
    
    return hits / this.accessCounter;
  }

  private estimateMemoryUsage(): string {
    const loadedCount = this.loadedShards.size;
    const avgShardSize = 50; // KB estimate
    const totalKB = loadedCount * avgShardSize;
    
    if (totalKB > 1024) {
      return `${(totalKB / 1024).toFixed(2)} MB`;
    } else {
      return `${totalKB} KB`;
    }
  }

  private getDefaultStrategy(): LoadingStrategy {
    return {
      initial: ['ar-ك', 'ar-م', 'ar-ج', 'en-w', 'en-t', 'en-p'], // Most common PT terms
      onDemand: [], // Load everything else on demand
      prefetch: ['ar-ا', 'ar-ع', 'en-a', 'en-c', 'en-e', 'en-m'], // Secondary common letters
      cache_size: 15 // Keep 15 shards in memory max
    };
  }
}