/**
 * Worker Manager for Ultra-Fast Analysis
 * Manages web worker lifecycle and communication
 */

interface WorkerRequest {
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  onProgress?: (data: any) => void;
}

interface WorkerStats {
  initialized: boolean;
  profile: 'lite' | 'full';
  performance: any;
  uptime: number;
}

export class UltraFastWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, WorkerRequest>();
  private requestIdCounter = 0;
  private isInitialized = false;
  private currentProfile: 'lite' | 'full' = 'lite';

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Create worker from ultra-fast analysis worker
      this.worker = new Worker(
        new URL('./ultraFastAnalysis.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
      this.worker.addEventListener('error', this.handleWorkerError.bind(this));
      
      console.log('🧵 Ultra-fast worker created');
      
    } catch (error) {
      console.error('❌ Failed to create ultra-fast worker:', error);
      throw error;
    }
  }

  /**
   * Initialize the worker with specific profile
   */
  async initialize(profile: 'lite' | 'full' = 'lite'): Promise<void> {
    const result = await this.sendMessage('initialize', { profile });
    this.isInitialized = result.initialized;
    this.currentProfile = profile;
    console.log(`✅ Ultra-fast worker initialized with ${profile} profile`);
    return result;
  }

  /**
   * Classify single item
   */
  async classify(item: any): Promise<any> {
    this.ensureInitialized();
    return this.sendMessage('classify', { item });
  }

  /**
   * Classify batch of items with progress tracking
   */
  async classifyBatch(
    items: any[],
    options: {
      batchSize?: number;
      onProgress?: (data: any) => void;
    } = {}
  ): Promise<any> {
    this.ensureInitialized();
    
    return this.sendMessage('classify_batch', {
      items,
      batchSize: options.batchSize || 1000,
      reportProgress: !!options.onProgress
    }, options.onProgress);
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<WorkerStats> {
    if (!this.isInitialized) {
      return {
        initialized: false,
        profile: this.currentProfile,
        performance: null,
        uptime: 0
      };
    }
    
    return this.sendMessage('get_stats', {});
  }

  /**
   * Switch analysis profile
   */
  async switchProfile(profile: 'lite' | 'full'): Promise<void> {
    const result = await this.sendMessage('switch_profile', { profile });
    
    if (result.switched) {
      this.currentProfile = profile;
      console.log(`✅ Switched to ${profile} profile`);
    }
    
    return result;
  }

  /**
   * Terminate worker and cleanup
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Worker terminated'));
    });
    this.pendingRequests.clear();
    
    this.isInitialized = false;
    console.log('🛑 Ultra-fast worker terminated');
  }

  /**
   * Check if worker is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get current profile
   */
  getProfile(): 'lite' | 'full' {
    return this.currentProfile;
  }

  // Private methods
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, requestId, payload } = event.data;
    const request = this.pendingRequests.get(requestId);
    
    if (!request) {
      console.warn(`No pending request found for ID: ${requestId}`);
      return;
    }

    switch (type) {
      case 'success':
        request.resolve(payload);
        this.pendingRequests.delete(requestId);
        break;
        
      case 'error':
        request.reject(new Error(payload.error));
        this.pendingRequests.delete(requestId);
        break;
        
      case 'progress':
        if (request.onProgress) {
          request.onProgress(payload);
        }
        break;
        
      default:
        console.warn(`Unknown worker message type: ${type}`);
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Ultra-fast worker error:', error);
    
    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      request.reject(new Error(`Worker error: ${error.message}`));
    });
    this.pendingRequests.clear();
  }

  private async sendMessage(
    type: string, 
    payload: any, 
    onProgress?: (data: any) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const requestId = `req_${++this.requestIdCounter}`;
      
      this.pendingRequests.set(requestId, {
        id: requestId,
        resolve,
        reject,
        onProgress
      });

      this.worker.postMessage({
        type,
        payload,
        requestId
      });
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Worker not initialized. Call initialize() first.');
    }
  }
}

// Singleton instance for global use
let globalWorkerManager: UltraFastWorkerManager | null = null;

export const getUltraFastWorkerManager = (): UltraFastWorkerManager => {
  if (!globalWorkerManager) {
    globalWorkerManager = new UltraFastWorkerManager();
  }
  return globalWorkerManager;
};

/**
 * High-level worker service for easy integration
 */
export class WorkerAnalysisService {
  private manager = getUltraFastWorkerManager();
  private isReady = false;

  async initialize(profile: 'lite' | 'full' = 'lite'): Promise<void> {
    await this.manager.initialize(profile);
    this.isReady = true;
  }

  async analyzeItems(
    items: any[],
    onProgress?: (progress: number, stats?: any) => void
  ): Promise<any[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    const result = await this.manager.classifyBatch(items, {
      batchSize: 1000,
      onProgress: (data) => {
        if (onProgress) {
          onProgress(data.progress, {
            processed: data.processed,
            total: data.total,
            rate: parseFloat(data.rate),
            profile: data.profile
          });
        }
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`🎯 Worker analysis complete: ${items.length} items in ${duration}ms`);
    
    return result.results;
  }

  async getPerformanceStats() {
    return this.manager.getStats();
  }

  terminate(): void {
    this.manager.terminate();
    this.isReady = false;
  }
}

// Export singleton service
export const workerAnalysisService = new WorkerAnalysisService();