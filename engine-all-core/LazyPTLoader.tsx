/**
 * Production-Ready Lazy PT Loader Component
 * Progressive loading with user-friendly interface
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LazyLoader } from '../pt/adapters/browser/lazy-loader';
import { getPerformanceMonitor } from '../pt/engine-core/performance-monitor';
import { useTranslation } from './I18n';

interface LazyPTLoaderProps {
  onInitialized?: (loader: LazyLoader) => void;
  onError?: (error: Error) => void;
  profile?: 'lite' | 'full';
  enableProfiling?: boolean;
  children?: React.ReactNode;
}

interface LoadingState {
  phase: 'initializing' | 'loading_shards' | 'optimizing' | 'ready' | 'error';
  progress: number;
  currentTask: string;
  shardsLoaded: number;
  totalShards: number;
  estimatedTime: number;
}

export const LazyPTLoader: React.FC<LazyPTLoaderProps> = ({
  onInitialized,
  onError,
  profile = 'lite',
  enableProfiling = true,
  children
}) => {
  const { t } = useTranslation();
  const [loader, setLoader] = useState<LazyLoader | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'initializing',
    progress: 0,
    currentTask: 'Starting PT Engine...',
    shardsLoaded: 0,
    totalShards: 10,
    estimatedTime: 2000
  });
  
  const monitor = useMemo(() => getPerformanceMonitor(), []);

  const updateLoadingState = useCallback((updates: Partial<LoadingState>) => {
    setLoadingState(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeLoader = useCallback(async () => {
    const timer = monitor.startOperation('lazy_loader_initialization');
    
    try {
      updateLoadingState({
        phase: 'initializing',
        currentTask: 'Initializing PT Engine...',
        progress: 10
      });

      // Create lazy loader instance
      const lazyLoader = new LazyLoader(`/pt/runtime/${profile}`);
      
      updateLoadingState({
        phase: 'loading_shards',
        currentTask: 'Loading vocabulary shards...',
        progress: 30
      });

      // Initialize with progress tracking
      await lazyLoader.initialize();
      
      // Simulate progressive loading for better UX
      await simulateProgressiveLoading(updateLoadingState);
      
      updateLoadingState({
        phase: 'optimizing',
        currentTask: 'Optimizing cache...',
        progress: 85
      });

      // Small delay for cache optimization
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateLoadingState({
        phase: 'ready',
        currentTask: 'PT Engine ready!',
        progress: 100
      });

      timer.end({ profile, success: true });
      
      setLoader(lazyLoader);
      onInitialized?.(lazyLoader);
      
    } catch (error) {
      timer.end({ profile, success: false, error: error.message });
      
      updateLoadingState({
        phase: 'error',
        currentTask: 'Initialization failed',
        progress: 0
      });
      
      onError?.(error as Error);
    }
  }, [profile, onInitialized, onError, updateLoadingState, monitor]);

  // Initialize on mount
  useEffect(() => {
    initializeLoader();
  }, [initializeLoader]);

  // Render loading interface
  if (loadingState.phase !== 'ready') {
    return (
      <div className="lazy-pt-loader">
        <LoadingInterface 
          state={loadingState} 
          profile={profile}
          onRetry={loadingState.phase === 'error' ? initializeLoader : undefined}
        />
      </div>
    );
  }

  // Render children when ready
  return (
    <>
      {children}
      {enableProfiling && <LoaderStats loader={loader!} />}
    </>
  );
};

// Loading interface component
const LoadingInterface: React.FC<{
  state: LoadingState;
  profile: string;
  onRetry?: () => void;
}> = ({ state, profile, onRetry }) => {
  const { t } = useTranslation();
  
  if (state.phase === 'error') {
    return (
      <div className="pt-loader-error">
        <div className="error-icon">⚠️</div>
        <h3>PT Engine Initialization Failed</h3>
        <p>Could not load the {profile} profile. Please check your connection.</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            🔄 Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pt-loader-interface">
      <div className="loader-header">
        <div className="loader-icon">
          {state.phase === 'ready' ? '✅' : '🚀'}
        </div>
        <h3>PT Classification Engine</h3>
        <span className="profile-badge">{profile.toUpperCase()}</span>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <div className="progress-text">
          {state.progress}% - {state.currentTask}
        </div>
      </div>

      {state.phase === 'loading_shards' && (
        <div className="shard-info">
          <span>Loaded {state.shardsLoaded}/{state.totalShards} vocabulary shards</span>
        </div>
      )}

      <div className="estimated-time">
        {state.estimatedTime > 0 && state.phase !== 'ready' && (
          <span>~{Math.ceil(state.estimatedTime / 1000)}s remaining</span>
        )}
      </div>

      {state.phase === 'ready' && (
        <div className="ready-message">
          🎯 Ultra-fast PT classification ready!
        </div>
      )}
    </div>
  );
};

// Stats component for development/monitoring
const LoaderStats: React.FC<{ loader: LazyLoader }> = ({ loader }) => {
  const [stats, setStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(loader.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    
    return () => clearInterval(interval);
  }, [loader]);

  if (!stats) return null;

  return (
    <div className="loader-stats">
      <button 
        className="stats-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        📊 Loader Stats {isExpanded ? '▼' : '▶'}
      </button>
      
      {isExpanded && (
        <div className="stats-content">
          <div className="stat-item">
            <span>Cache Hit Ratio:</span>
            <span>{(stats.cache_hit_ratio * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span>Loaded Shards:</span>
            <span>{stats.loaded_shards}/{stats.total_shards}</span>
          </div>
          <div className="stat-item">
            <span>Memory Usage:</span>
            <span>{stats.memory_usage}</span>
          </div>
          <div className="stat-item">
            <span>Access Count:</span>
            <span>{stats.access_count}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for progressive loading simulation
async function simulateProgressiveLoading(
  updateState: (updates: Partial<LoadingState>) => void
): Promise<void> {
  const phases = [
    { progress: 40, task: 'Loading Arabic vocabulary...', delay: 200 },
    { progress: 50, task: 'Loading English vocabulary...', delay: 150 },
    { progress: 60, task: 'Building search indices...', delay: 300 },
    { progress: 70, task: 'Compiling bloom filters...', delay: 100 },
    { progress: 80, task: 'Optimizing performance...', delay: 200 }
  ];

  for (const phase of phases) {
    updateState({
      progress: phase.progress,
      currentTask: phase.task
    });
    await new Promise(resolve => setTimeout(resolve, phase.delay));
  }
}

// CSS styles (would typically be in a separate file)
const styles = `
.lazy-pt-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.pt-loader-interface {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.loader-header {
  margin-bottom: 1.5rem;
}

.loader-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.profile-badge {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.progress-container {
  margin-bottom: 1rem;
}

.progress-bar {
  background: #e9ecef;
  border-radius: 10px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  background: linear-gradient(90deg, #007bff, #28a745);
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: #666;
}

.shard-info, .estimated-time {
  font-size: 0.8rem;
  color: #888;
  margin: 0.5rem 0;
}

.ready-message {
  color: #28a745;
  font-weight: bold;
  margin-top: 1rem;
}

.pt-loader-error {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.error-icon {
  font-size: 3rem;
  color: #dc3545;
  margin-bottom: 1rem;
}

.retry-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.loader-stats {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.8rem;
  z-index: 1000;
}

.stats-toggle {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.stats-content {
  margin-top: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default LazyPTLoader;