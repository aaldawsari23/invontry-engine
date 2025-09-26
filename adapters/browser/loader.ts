/**
 * Browser Adapter for PT Engine
 * Optimized loading for web environments
 */
import { PackageComposer } from '../../engine-core/compose';
import { PTClassifier } from '../../engine-core/classify';
import type { ComposedEngine, PTProfile } from '../../engine-core/types';

export class BrowserPTLoader {
  private composer: PackageComposer;
  private classifier: PTClassifier | null = null;
  private engine: ComposedEngine | null = null;

  constructor() {
    this.composer = new PackageComposer();
  }

  /**
   * Initialize PT engine for browser environment
   */
  async initialize(profileType: 'lite' | 'full' = 'lite'): Promise<void> {
    console.log(`Initializing PT Engine (${profileType} profile)...`);
    
    try {
      // Load appropriate profile
      const profilePath = `/pt/profiles/runtime-${profileType}.ptlock.json`;
      await this.composer.loadProfile(profilePath);
      
      // Compose engine
      this.engine = await this.composer.composeEngine();
      
      // Create classifier
      this.classifier = new PTClassifier(this.engine);
      
      console.log('PT Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PT Engine:', error);
      throw error;
    }
  }

  /**
   * Classify a single item
   */
  classify(item: { id: string; name: string; description?: string; code?: string }) {
    if (!this.classifier) {
      throw new Error('PT Engine not initialized. Call initialize() first.');
    }
    
    return this.classifier.classify(item);
  }

  /**
   * Classify multiple items with progress tracking
   */
  async classifyBatch(
    items: any[], 
    onProgress?: (processed: number, total: number) => void
  ) {
    if (!this.classifier) {
      throw new Error('PT Engine not initialized. Call initialize() first.');
    }

    const results = [];
    const total = items.length;
    
    for (let i = 0; i < items.length; i++) {
      const result = this.classifier.classify(items[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      // Yield control to prevent blocking UI
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }

  /**
   * Get engine statistics
   */
  getStats() {
    if (!this.engine) return null;
    
    return {
      profile: this.engine.config,
      vocabulary_terms: {
        ar: this.engine.vocabularies.ar.include.length,
        en: this.engine.vocabularies.en.include.length
      },
      taxonomy_categories: this.engine.taxonomy.l1_categories.length,
      has_nupco: !!this.engine.nupco,
      has_brands: !!this.engine.brands
    };
  }
}

// Global instance for easy access
let globalPTEngine: BrowserPTLoader | null = null;

export const getPTEngine = (): BrowserPTLoader => {
  if (!globalPTEngine) {
    globalPTEngine = new BrowserPTLoader();
  }
  return globalPTEngine;
};

// Auto-initialize with lite profile for immediate use
export const initializePTEngine = async (profile: 'lite' | 'full' = 'lite') => {
  const engine = getPTEngine();
  await engine.initialize(profile);
  return engine;
};