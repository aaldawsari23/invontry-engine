/**
 * Ultra-Fast Analysis Service
 * Integrates modular PT engine with existing application architecture
 */

import { UltraFastClassifier } from '../pt/engine-core/ultra-fast-classifier';
import { getPerformanceMonitor } from '../pt/engine-core/performance-monitor';
import { AnalysisResult, AnalysisData } from '../types';

interface UltraFastAnalysisOptions {
  profile: 'lite' | 'full';
  enableProfiling: boolean;
  batchSize: number;
  useWebWorker: boolean;
}

export class UltraFastAnalysisService {
  private classifier: UltraFastClassifier | null = null;
  private monitor = getPerformanceMonitor();
  private isInitialized = false;
  private currentProfile: 'lite' | 'full' = 'lite';

  /**
   * Initialize ultra-fast analysis service
   */
  async initialize(options: Partial<UltraFastAnalysisOptions> = {}): Promise<void> {
    const config = {
      profile: 'lite' as const,
      enableProfiling: true,
      batchSize: 1000,
      useWebWorker: false,
      ...options
    };

    const timer = this.monitor.startOperation('service_initialization');
    
    try {
      console.log('🚀 Initializing Ultra-Fast Analysis Service...');
      
      this.classifier = new UltraFastClassifier();
      await this.classifier.initialize(`/pt/runtime/${config.profile}`);
      
      this.currentProfile = config.profile;
      this.isInitialized = true;
      
      // Enable performance monitoring if requested
      this.monitor.setEnabled(config.enableProfiling);
      
      timer.end({ 
        profile: config.profile, 
        profiling: config.enableProfiling,
        success: true 
      });
      
      console.log('✅ Ultra-Fast Analysis Service ready');
      
    } catch (error) {
      timer.end({ success: false, error: error.message });
      console.error('❌ Failed to initialize Ultra-Fast Analysis Service:', error);
      throw error;
    }
  }

  /**
   * Analyze inventory with ultra-fast processing
   */
  async analyzeInventory(
    items: any[],
    onProgress?: (progress: number, stats?: any) => void
  ): Promise<AnalysisData> {
    if (!this.isInitialized || !this.classifier) {
      throw new Error('Ultra-Fast Analysis Service not initialized');
    }

    const timer = this.monitor.startOperation('inventory_analysis');
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Analyzing ${items.length} items with ultra-fast engine...`);
      
      // Convert items to classification format
      const classificationItems = items.map((item, index) => ({
        id: item.id || `item_${index}`,
        name: item.name || item.item_name || item.description || '',
        description: item.description || item.specifications || '',
        code: item.code || item.item_code || item.nupco_code || ''
      }));

      // Perform ultra-fast batch classification
      const results = await this.classifier.classifyBatch(
        classificationItems, 
        1000, // batch size
        (processed, total) => {
          const progress = (processed / total) * 100;
          const stats = {
            processed,
            total,
            rate: this.calculateProcessingRate(processed, startTime),
            profile: this.currentProfile
          };
          onProgress?.(progress, stats);
        }
      );

      // Convert results to legacy format for compatibility
      const analysisResults = this.convertToLegacyFormat(results, items);
      
      // Calculate statistics
      const stats = this.calculateAnalysisStatistics(analysisResults);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const itemsPerSecond = (items.length / totalDuration) * 1000;
      
      timer.end({
        items_processed: items.length,
        duration_ms: totalDuration,
        items_per_second: itemsPerSecond,
        accuracy: stats.averageConfidence,
        pt_items_found: stats.ptItemsCount
      });

      console.log(`✅ Analysis complete: ${itemsPerSecond.toFixed(0)} items/second`);
      
      // Create analysis data object
      const analysisData: AnalysisData = {
        results: analysisResults,
        totalItems: items.length,
        ptItems: stats.ptItemsCount,
        averageScore: stats.averageConfidence,
        processingTime: totalDuration,
        accuracy: stats.accuracy,
        categories: stats.categories,
        manufacturers: stats.manufacturers,
        suppliers: stats.suppliers,
        performance: {
          itemsPerSecond,
          profile: this.currentProfile,
          memoryUsage: this.getMemoryUsage(),
          cacheHitRatio: this.getCacheHitRatio()
        }
      };

      // Record successful analysis
      this.monitor.recordBatchOperation('full_inventory_analysis', totalDuration, items.length, {
        profile: this.currentProfile,
        pt_items: stats.ptItemsCount,
        accuracy: stats.accuracy
      });

      return analysisData;
      
    } catch (error) {
      timer.end({ success: false, error: error.message });
      this.monitor.recordError(error as Error, 'inventory_analysis');
      throw error;
    }
  }

  /**
   * Analyze single item (for real-time analysis)
   */
  async analyzeItem(item: any): Promise<AnalysisResult> {
    if (!this.isInitialized || !this.classifier) {
      throw new Error('Ultra-Fast Analysis Service not initialized');
    }

    const classificationItem = {
      id: item.id || `item_${Date.now()}`,
      name: item.name || item.item_name || item.description || '',
      description: item.description || item.specifications || '',
      code: item.code || item.item_code || item.nupco_code || ''
    };

    const result = this.classifier.classify(classificationItem);
    
    // Convert to legacy format
    const legacyResult = this.convertSingleResultToLegacy(result, item);
    
    // Record classification
    this.monitor.recordClassification(result.confidence, undefined);
    
    return legacyResult;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (!this.isInitialized) {
      return null;
    }

    return {
      engine: this.classifier?.getStats(),
      monitoring: this.monitor.getStats(),
      insights: this.monitor.getInsights(),
      report: this.monitor.generateReport()
    };
  }

  /**
   * Switch analysis profile (lite/full)
   */
  async switchProfile(profile: 'lite' | 'full'): Promise<void> {
    if (profile === this.currentProfile) {
      return;
    }

    console.log(`🔄 Switching to ${profile} profile...`);
    
    // Re-initialize with new profile
    await this.initialize({ profile });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      profile: this.currentProfile,
      memoryUsage: this.getMemoryUsage(),
      uptime: this.monitor.getStats().counters,
      performance: this.monitor.getInsights()
    };
  }

  // Private helper methods
  private convertToLegacyFormat(results: any[], originalItems: any[]): AnalysisResult[] {
    return results.map((result, index) => {
      const originalItem = originalItems[index] || {};
      
      return {
        id: result.item_id,
        name: originalItem.name || originalItem.item_name || result.matched_terms?.[0] || 'Unknown',
        description: originalItem.description || originalItem.specifications || '',
        decision: result.is_pt ? 'Accept' : 'Reject',
        score: result.confidence,
        category: result.category || 'Unknown',
        explanation: result.explanation.join('; '),
        manufacturer: originalItem.manufacturer || 'Unknown',
        supplier: originalItem.supplier || 'Unknown',
        
        // Enhanced fields from new engine
        pt_relevance: {
          is_pt: result.is_pt,
          confidence: result.confidence,
          category: result.category,
          pt_domain: result.pt_domain,
          language_detected: result.language,
          matched_terms: result.matched_terms,
          processing_time_ms: result.processing_time_ms
        },
        
        // Legacy compatibility
        specialty: this.mapDomainToSpecialty(result.pt_domain),
        region: originalItem.region || 'Unknown',
        area: originalItem.area || 'Unknown',
        type: originalItem.type || 'Unknown',
        
        // Analysis metadata
        analysisVersion: '2.0-ultra-fast',
        timestamp: new Date().toISOString()
      };
    });
  }

  private convertSingleResultToLegacy(result: any, originalItem: any): AnalysisResult {
    return {
      id: result.item_id,
      name: originalItem.name || originalItem.item_name || 'Unknown',
      description: originalItem.description || '',
      decision: result.is_pt ? 'Accept' : 'Reject',
      score: result.confidence,
      category: result.category || 'Unknown',
      explanation: result.explanation.join('; '),
      manufacturer: originalItem.manufacturer || 'Unknown',
      supplier: originalItem.supplier || 'Unknown',
      
      pt_relevance: {
        is_pt: result.is_pt,
        confidence: result.confidence,
        category: result.category,
        pt_domain: result.pt_domain,
        language_detected: result.language,
        matched_terms: result.matched_terms,
        processing_time_ms: result.processing_time_ms
      },
      
      specialty: this.mapDomainToSpecialty(result.pt_domain),
      region: originalItem.region || 'Unknown',
      area: originalItem.area || 'Unknown',
      type: originalItem.type || 'Unknown',
      
      analysisVersion: '2.0-ultra-fast',
      timestamp: new Date().toISOString()
    };
  }

  private mapDomainToSpecialty(ptDomain: string | null): string {
    if (!ptDomain) return 'General';
    
    const domainMapping: Record<string, string> = {
      'mobility_aids': 'Mobility & Transfer',
      'pain_management': 'Pain Management',
      'cardio_rehabilitation': 'Cardiopulmonary',
      'neurological_rehab': 'Neurological',
      'tissue_healing': 'Therapeutic Modalities',
      'strengthening': 'Exercise & Fitness',
      'balance_training': 'Balance & Coordination',
      'range_of_motion': 'Assessment Tools',
      'general': 'General PT'
    };
    
    return domainMapping[ptDomain] || 'General PT';
  }

  private calculateAnalysisStatistics(results: AnalysisResult[]) {
    const ptResults = results.filter(r => r.decision === 'Accept');
    const totalConfidence = results.reduce((sum, r) => sum + r.score, 0);
    
    // Calculate categories
    const categories = new Set(results.map(r => r.category));
    const manufacturers = new Set(results.map(r => r.manufacturer).filter(m => m !== 'Unknown'));
    const suppliers = new Set(results.map(r => r.supplier).filter(s => s !== 'Unknown'));
    
    // Estimate accuracy based on confidence distribution
    const highConfidenceResults = results.filter(r => r.score > 70);
    const accuracy = highConfidenceResults.length / results.length * 100;
    
    return {
      ptItemsCount: ptResults.length,
      averageConfidence: totalConfidence / results.length,
      accuracy,
      categories: Array.from(categories),
      manufacturers: Array.from(manufacturers),
      suppliers: Array.from(suppliers)
    };
  }

  private calculateProcessingRate(processed: number, startTime: number): number {
    const elapsed = Date.now() - startTime;
    return elapsed > 0 ? (processed / elapsed) * 1000 : 0;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  private getCacheHitRatio(): number {
    const stats = this.monitor.getStats();
    const hits = stats.counters.cache_hits || 0;
    const misses = stats.counters.cache_misses || 0;
    const total = hits + misses;
    
    return total > 0 ? hits / total : 0;
  }
}

// Singleton instance for global use
let globalService: UltraFastAnalysisService | null = null;

export const getUltraFastAnalysisService = (): UltraFastAnalysisService => {
  if (!globalService) {
    globalService = new UltraFastAnalysisService();
  }
  return globalService;
};

/**
 * Legacy compatibility function - drop-in replacement for analyzeInventoryWithWorker
 */
export async function analyzeInventoryWithUltraFastEngine(
  items: any[],
  onProgress?: (progress: number, stats?: any) => void
): Promise<AnalysisData> {
  const service = getUltraFastAnalysisService();
  
  // Auto-initialize if not already done
  if (!service.getStatus().initialized) {
    await service.initialize({
      profile: 'lite',
      enableProfiling: true
    });
  }
  
  return service.analyzeInventory(items, onProgress);
}

/**
 * Migration helper - switches between old and new analysis systems
 */
export async function analyzeWithBestAvailableEngine(
  items: any[],
  onProgress?: (progress: number, stats?: any) => void,
  preferUltraFast = true
): Promise<AnalysisData> {
  if (preferUltraFast) {
    try {
      return await analyzeInventoryWithUltraFastEngine(items, onProgress);
    } catch (error) {
      console.warn('Ultra-fast engine failed, falling back to legacy:', error);
    }
  }
  
  // Fallback to legacy system
  const { analyzeInventoryWithWorker } = await import('./analysisService');
  return analyzeInventoryWithWorker(items, onProgress);
}