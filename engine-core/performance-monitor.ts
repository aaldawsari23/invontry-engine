/**
 * Performance Monitor for PT Classification Engine
 * Real-time metrics, profiling, and optimization insights
 */

interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration_ms: number;
  memory_usage?: number;
  items_processed?: number;
  cache_hits?: number;
  cache_misses?: number;
  metadata?: Record<string, any>;
}

interface AggregatedMetrics {
  operation: string;
  total_calls: number;
  total_duration_ms: number;
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  items_per_second?: number;
  memory_efficiency?: number;
  cache_hit_ratio?: number;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    timing: any;
    navigation?: any;
  };
  classification: {
    total_processed: number;
    accuracy_estimate: number;
    avg_confidence: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private aggregated: Map<string, AggregatedMetrics> = new Map();
  private maxMetricsHistory = 10000;
  private isEnabled = true;
  private startTime = performance.now();
  
  // Real-time counters
  private counters = {
    classification_calls: 0,
    cache_hits: 0,
    cache_misses: 0,
    bloom_filter_saves: 0,
    total_items_processed: 0,
    errors: 0
  };

  /**
   * Start monitoring an operation
   */
  startOperation(operation: string): PerformanceTimer {
    if (!this.isEnabled) {
      return new PerformanceTimer('', () => {});
    }
    
    const startTime = performance.now();
    const timer = new PerformanceTimer(operation, (metadata?: any) => {
      this.endOperation(operation, startTime, metadata);
    });
    
    return timer;
  }

  /**
   * Record a completed operation
   */
  recordOperation(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;
    
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration_ms: duration,
      memory_usage: this.getCurrentMemoryUsage(),
      items_processed: metadata?.items_processed,
      cache_hits: metadata?.cache_hits,
      cache_misses: metadata?.cache_misses,
      metadata
    };
    
    this.addMetric(metric);
    this.updateCounters(metadata);
  }

  /**
   * Record batch operation with throughput metrics
   */
  recordBatchOperation(
    operation: string,
    duration: number,
    itemCount: number,
    metadata?: Record<string, any>
  ): void {
    const itemsPerSecond = (itemCount / duration) * 1000;
    
    this.recordOperation(operation, duration, {
      ...metadata,
      items_processed: itemCount,
      throughput: itemsPerSecond
    });
    
    this.counters.total_items_processed += itemCount;
  }

  /**
   * Record cache operation
   */
  recordCacheHit(): void {
    this.counters.cache_hits++;
  }

  recordCacheMiss(): void {
    this.counters.cache_misses++;
  }

  /**
   * Record bloom filter efficiency
   */
  recordBloomFilterSave(): void {
    this.counters.bloom_filter_saves++;
  }

  /**
   * Record classification call
   */
  recordClassification(confidence: number, isCorrect?: boolean): void {
    this.counters.classification_calls++;
    
    // Store confidence for accuracy tracking
    if (confidence !== undefined) {
      const metadata = { confidence };
      if (isCorrect !== undefined) {
        metadata.correct = isCorrect;
      }
      
      this.recordOperation('classification', 0, metadata);
    }
  }

  /**
   * Record error
   */
  recordError(error: Error, operation?: string): void {
    this.counters.errors++;
    
    this.recordOperation('error', 0, {
      error_type: error.constructor.name,
      error_message: error.message,
      operation
    });
  }

  /**
   * Get real-time performance statistics
   */
  getStats(): {
    realtime: any;
    aggregated: AggregatedMetrics[];
    system: SystemMetrics;
    counters: typeof this.counters;
  } {
    return {
      realtime: this.getRealTimeStats(),
      aggregated: this.getAggregatedStats(),
      system: this.getSystemMetrics(),
      counters: { ...this.counters }
    };
  }

  /**
   * Get performance insights and recommendations
   */
  getInsights(): {
    performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    bottlenecks: string[];
    recommendations: string[];
    efficiency_metrics: Record<string, number>;
  } {
    const stats = this.getAggregatedStats();
    const cacheHitRatio = this.getCacheHitRatio();
    const avgThroughput = this.getAverageThroughput();
    
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze performance
    const classificationStat = stats.find(s => s.operation === 'classification');
    if (classificationStat && classificationStat.average_duration_ms > 5) {
      grade = 'B';
      bottlenecks.push('Slow classification (>5ms average)');
      recommendations.push('Consider pre-compiling more indices');
    }
    
    if (cacheHitRatio < 0.8) {
      grade = grade === 'A' ? 'B' : 'C';
      bottlenecks.push('Low cache hit ratio');
      recommendations.push('Optimize caching strategy or increase cache size');
    }
    
    if (avgThroughput < 1000) {
      grade = grade === 'A' ? 'B' : grade === 'B' ? 'C' : 'D';
      bottlenecks.push('Low throughput (<1000 items/sec)');
      recommendations.push('Enable bloom filter optimization');
    }
    
    if (this.counters.errors > this.counters.classification_calls * 0.01) {
      grade = 'F';
      bottlenecks.push('High error rate (>1%)');
      recommendations.push('Check data integrity and error handling');
    }
    
    return {
      performance_grade: grade,
      bottlenecks,
      recommendations,
      efficiency_metrics: {
        cache_hit_ratio: cacheHitRatio,
        avg_throughput: avgThroughput,
        bloom_efficiency: this.counters.bloom_filter_saves / Math.max(1, this.counters.classification_calls),
        error_rate: this.counters.errors / Math.max(1, this.counters.classification_calls)
      }
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStats();
    const insights = this.getInsights();
    const uptime = ((performance.now() - this.startTime) / 1000 / 60).toFixed(2);
    
    return `
# PT Engine Performance Report

## Overall Performance Grade: ${insights.performance_grade}

## System Metrics
- Uptime: ${uptime} minutes
- Total Classifications: ${stats.counters.classification_calls}
- Items Processed: ${stats.counters.total_items_processed}
- Error Rate: ${(insights.efficiency_metrics.error_rate * 100).toFixed(2)}%

## Performance Metrics
- Cache Hit Ratio: ${(insights.efficiency_metrics.cache_hit_ratio * 100).toFixed(1)}%
- Average Throughput: ${insights.efficiency_metrics.avg_throughput.toFixed(0)} items/second
- Bloom Filter Efficiency: ${(insights.efficiency_metrics.bloom_efficiency * 100).toFixed(1)}%

## Memory Usage
- Current: ${stats.system.memory.used} MB
- Percentage: ${stats.system.memory.percentage.toFixed(1)}%

## Top Operations by Time
${this.getTopOperationsByTime(stats.aggregated)}

## Bottlenecks
${insights.bottlenecks.map(b => `- ${b}`).join('\n')}

## Recommendations
${insights.recommendations.map(r => `- ${r}`).join('\n')}

## Detailed Metrics
${JSON.stringify(stats.aggregated, null, 2)}
    `.trim();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.aggregated.clear();
    Object.keys(this.counters).forEach(key => {
      (this.counters as any)[key] = 0;
    });
    this.startTime = performance.now();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    raw: PerformanceMetrics[];
    aggregated: AggregatedMetrics[];
    counters: typeof this.counters;
    export_time: string;
  } {
    return {
      raw: [...this.metrics],
      aggregated: [...this.aggregated.values()],
      counters: { ...this.counters },
      export_time: new Date().toISOString()
    };
  }

  // Private methods
  private endOperation(operation: string, startTime: number, metadata?: any): void {
    const duration = performance.now() - startTime;
    this.recordOperation(operation, duration, metadata);
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Trim history if too large
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    // Update aggregated stats
    this.updateAggregated(metric);
  }

  private updateAggregated(metric: PerformanceMetrics): void {
    const existing = this.aggregated.get(metric.operation);
    
    if (existing) {
      existing.total_calls++;
      existing.total_duration_ms += metric.duration_ms;
      existing.average_duration_ms = existing.total_duration_ms / existing.total_calls;
      existing.min_duration_ms = Math.min(existing.min_duration_ms, metric.duration_ms);
      existing.max_duration_ms = Math.max(existing.max_duration_ms, metric.duration_ms);
      
      if (metric.items_processed) {
        const totalItems = (existing.items_per_second || 0) * existing.total_calls + metric.items_processed;
        existing.items_per_second = (totalItems / existing.total_duration_ms) * 1000;
      }
    } else {
      this.aggregated.set(metric.operation, {
        operation: metric.operation,
        total_calls: 1,
        total_duration_ms: metric.duration_ms,
        average_duration_ms: metric.duration_ms,
        min_duration_ms: metric.duration_ms,
        max_duration_ms: metric.duration_ms,
        items_per_second: metric.items_processed ? (metric.items_processed / metric.duration_ms) * 1000 : undefined
      });
    }
  }

  private updateCounters(metadata?: Record<string, any>): void {
    if (metadata?.cache_hits) this.counters.cache_hits += metadata.cache_hits;
    if (metadata?.cache_misses) this.counters.cache_misses += metadata.cache_misses;
  }

  private getRealTimeStats(): any {
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / recentMetrics.length;
    
    return {
      recent_avg_duration: avgDuration || 0,
      recent_operations: recentMetrics.length,
      cache_hit_ratio: this.getCacheHitRatio(),
      items_per_second: this.getAverageThroughput()
    };
  }

  private getAggregatedStats(): AggregatedMetrics[] {
    return Array.from(this.aggregated.values())
      .sort((a, b) => b.total_duration_ms - a.total_duration_ms);
  }

  private getSystemMetrics(): SystemMetrics {
    const memory = this.getCurrentMemoryUsage();
    
    return {
      memory: {
        used: memory,
        total: this.getMaxMemory(),
        percentage: (memory / this.getMaxMemory()) * 100
      },
      performance: {
        timing: typeof performance !== 'undefined' ? performance.timing : null,
        navigation: typeof performance !== 'undefined' ? performance.navigation : null
      },
      classification: {
        total_processed: this.counters.total_items_processed,
        accuracy_estimate: this.estimateAccuracy(),
        avg_confidence: this.getAverageConfidence()
      }
    };
  }

  private getCacheHitRatio(): number {
    const total = this.counters.cache_hits + this.counters.cache_misses;
    return total > 0 ? this.counters.cache_hits / total : 0;
  }

  private getAverageThroughput(): number {
    const batchOps = Array.from(this.aggregated.values()).filter(op => op.items_per_second);
    if (batchOps.length === 0) return 0;
    
    const totalThroughput = batchOps.reduce((sum, op) => sum + (op.items_per_second || 0), 0);
    return totalThroughput / batchOps.length;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0; // Fallback for environments without memory API
  }

  private getMaxMemory(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
    }
    return 100; // Default assumption
  }

  private estimateAccuracy(): number {
    const classificationMetrics = this.metrics.filter(m => m.operation === 'classification' && m.metadata?.correct !== undefined);
    if (classificationMetrics.length === 0) return 0;
    
    const correctCount = classificationMetrics.filter(m => m.metadata?.correct).length;
    return (correctCount / classificationMetrics.length) * 100;
  }

  private getAverageConfidence(): number {
    const classificationMetrics = this.metrics.filter(m => m.operation === 'classification' && m.metadata?.confidence !== undefined);
    if (classificationMetrics.length === 0) return 0;
    
    const totalConfidence = classificationMetrics.reduce((sum, m) => sum + m.metadata!.confidence, 0);
    return totalConfidence / classificationMetrics.length;
  }

  private getTopOperationsByTime(aggregated: AggregatedMetrics[]): string {
    return aggregated
      .slice(0, 5)
      .map((op, i) => `${i + 1}. ${op.operation}: ${op.average_duration_ms.toFixed(2)}ms avg (${op.total_calls} calls)`)
      .join('\n');
  }
}

/**
 * Performance Timer utility class
 */
export class PerformanceTimer {
  private operation: string;
  private startTime: number;
  private onComplete: (metadata?: any) => void;

  constructor(operation: string, onComplete: (metadata?: any) => void) {
    this.operation = operation;
    this.startTime = performance.now();
    this.onComplete = onComplete;
  }

  /**
   * End timing and record the result
   */
  end(metadata?: any): number {
    const duration = performance.now() - this.startTime;
    this.onComplete(metadata);
    return duration;
  }

  /**
   * Get elapsed time without ending the timer
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
};

/**
 * Decorator for automatic performance monitoring
 */
export function monitored(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const timer = monitor.startOperation(operation || `${target.constructor.name}.${propertyKey}`);
      
      try {
        const result = originalMethod.apply(this, args);
        
        if (result instanceof Promise) {
          return result
            .then((res) => {
              timer.end({ success: true });
              return res;
            })
            .catch((error) => {
              timer.end({ success: false, error: error.message });
              throw error;
            });
        } else {
          timer.end({ success: true });
          return result;
        }
      } catch (error) {
        timer.end({ success: false, error: error.message });
        throw error;
      }
    };
    
    return descriptor;
  };
}