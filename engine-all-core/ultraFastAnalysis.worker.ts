/**
 * Ultra-Fast Analysis Web Worker
 * Runs PT classification in background thread with optimal performance
 */

import { UltraFastClassifier } from '../pt/engine-core/ultra-fast-classifier';
import { getPerformanceMonitor } from '../pt/engine-core/performance-monitor';

// Worker message types
interface WorkerMessage {
  type: 'initialize' | 'classify' | 'classify_batch' | 'get_stats' | 'switch_profile';
  payload: any;
  requestId: string;
}

interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  requestId: string;
  payload: any;
}

class UltraFastAnalysisWorker {
  private classifier: UltraFastClassifier | null = null;
  private monitor = getPerformanceMonitor();
  private isInitialized = false;
  private currentProfile: 'lite' | 'full' = 'lite';

  constructor() {
    // Listen for messages from main thread
    self.addEventListener('message', this.handleMessage.bind(this));
    
    console.log('🚀 Ultra-Fast Analysis Worker started');
  }

  private async handleMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
    const { type, payload, requestId } = event.data;

    try {
      switch (type) {
        case 'initialize':
          await this.handleInitialize(payload, requestId);
          break;
          
        case 'classify':
          await this.handleClassify(payload, requestId);
          break;
          
        case 'classify_batch':
          await this.handleClassifyBatch(payload, requestId);
          break;
          
        case 'get_stats':
          this.handleGetStats(requestId);
          break;
          
        case 'switch_profile':
          await this.handleSwitchProfile(payload, requestId);
          break;
          
        default:
          this.sendError(requestId, `Unknown message type: ${type}`);
      }
      
    } catch (error) {
      this.sendError(requestId, error.message);
    }
  }

  private async handleInitialize(payload: { profile?: 'lite' | 'full' }, requestId: string): Promise<void> {
    const profile = payload.profile || 'lite';
    
    const timer = this.monitor.startOperation('worker_initialization');
    
    try {
      console.log(`🔄 Initializing worker with ${profile} profile...`);
      
      this.classifier = new UltraFastClassifier();
      await this.classifier.initialize(`/pt/runtime/${profile}`);
      
      this.currentProfile = profile;
      this.isInitialized = true;
      
      timer.end({ profile, success: true });
      
      this.sendSuccess(requestId, {
        initialized: true,
        profile,
        stats: this.classifier.getStats()
      });
      
      console.log('✅ Worker initialization complete');
      
    } catch (error) {
      timer.end({ success: false, error: error.message });
      throw error;
    }
  }

  private async handleClassify(payload: { item: any }, requestId: string): Promise<void> {
    if (!this.isInitialized || !this.classifier) {
      throw new Error('Worker not initialized');
    }

    const result = this.classifier.classify(payload.item);
    this.monitor.recordClassification(result.confidence);
    
    this.sendSuccess(requestId, result);
  }

  private async handleClassifyBatch(
    payload: { 
      items: any[]; 
      batchSize?: number; 
      reportProgress?: boolean;
    }, 
    requestId: string
  ): Promise<void> {
    if (!this.isInitialized || !this.classifier) {
      throw new Error('Worker not initialized');
    }

    const { items, batchSize = 1000, reportProgress = true } = payload;
    
    const timer = this.monitor.startOperation('worker_batch_classification');
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Worker processing ${items.length} items...`);
      
      const results = await this.classifier.classifyBatch(
        items,
        batchSize,
        reportProgress ? (processed, total) => {
          // Send progress update to main thread
          const progress = (processed / total) * 100;
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          const rate = elapsed > 0 ? (processed / elapsed) * 1000 : 0;
          
          this.sendProgress(requestId, {
            progress,
            processed,
            total,
            rate: rate.toFixed(0),
            profile: this.currentProfile
          });
          
          // Log progress occasionally
          if (processed % 1000 === 0 || processed === total) {
            console.log(`  Worker progress: ${processed}/${total} (${rate.toFixed(0)} items/sec)`);
          }
        } : undefined
      );
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const itemsPerSecond = (items.length / totalDuration) * 1000;
      
      timer.end({
        items_processed: items.length,
        duration_ms: totalDuration,
        items_per_second: itemsPerSecond
      });
      
      // Send final results
      this.sendSuccess(requestId, {
        results,
        performance: {
          itemsProcessed: items.length,
          durationMs: totalDuration,
          itemsPerSecond,
          profile: this.currentProfile,
          averageProcessingTime: results.reduce((sum, r) => sum + r.processing_time_ms, 0) / results.length
        }
      });
      
      console.log(`✅ Worker batch complete: ${itemsPerSecond.toFixed(0)} items/second`);
      
    } catch (error) {
      timer.end({ success: false, error: error.message });
      throw error;
    }
  }

  private handleGetStats(requestId: string): void {
    const stats = {
      initialized: this.isInitialized,
      profile: this.currentProfile,
      classifier: this.classifier?.getStats(),
      performance: this.monitor.getStats(),
      insights: this.monitor.getInsights()
    };
    
    this.sendSuccess(requestId, stats);
  }

  private async handleSwitchProfile(payload: { profile: 'lite' | 'full' }, requestId: string): Promise<void> {
    if (!this.isInitialized || !this.classifier) {
      throw new Error('Worker not initialized');
    }

    const { profile } = payload;
    
    if (profile === this.currentProfile) {
      this.sendSuccess(requestId, { switched: false, profile });
      return;
    }

    console.log(`🔄 Worker switching to ${profile} profile...`);
    
    // Re-initialize with new profile
    await this.classifier.initialize(`/pt/runtime/${profile}`);
    this.currentProfile = profile;
    
    this.sendSuccess(requestId, { 
      switched: true, 
      profile,
      stats: this.classifier.getStats() 
    });
    
    console.log(`✅ Worker switched to ${profile} profile`);
  }

  private sendSuccess(requestId: string, payload: any): void {
    const response: WorkerResponse = {
      type: 'success',
      requestId,
      payload
    };
    self.postMessage(response);
  }

  private sendProgress(requestId: string, payload: any): void {
    const response: WorkerResponse = {
      type: 'progress',
      requestId,
      payload
    };
    self.postMessage(response);
  }

  private sendError(requestId: string, error: string): void {
    const response: WorkerResponse = {
      type: 'error',
      requestId,
      payload: { error }
    };
    self.postMessage(response);
    
    this.monitor.recordError(new Error(error), 'worker_operation');
  }
}

// Initialize worker
const worker = new UltraFastAnalysisWorker();

// Export for TypeScript compilation
export default worker;