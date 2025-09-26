/**
 * Performance Metrics Panel
 * Real-time performance monitoring for PT engine
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getUltraFastAnalysisService } from '../services/ultraFastAnalysisService';
import { getPerformanceMonitor } from '../pt/engine-core/performance-monitor';
import { useTranslation } from './I18n';

interface PerformanceData {
  throughput: number;
  accuracy: number;
  memoryUsage: number;
  cacheHitRatio: number;
  totalProcessed: number;
  errorRate: number;
  profile: string;
  uptime: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  icon: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  status, 
  icon, 
  subtitle 
}) => {
  const statusColors = {
    excellent: '#28a745',
    good: '#17a2b8', 
    warning: '#ffc107',
    poor: '#dc3545'
  };

  return (
    <div className="metric-card" style={{ borderLeft: `4px solid ${statusColors[status]}` }}>
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-title">{title}</span>
      </div>
      <div className="metric-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
};

const PerformanceChart: React.FC<{ data: number[]; label: string; color: string }> = ({ 
  data, 
  label, 
  color 
}) => {
  const maxValue = Math.max(...data, 1);
  const points = data.map((value, index) => 
    `${(index / (data.length - 1)) * 100},${100 - (value / maxValue) * 80}`
  ).join(' ');

  return (
    <div className="performance-chart">
      <div className="chart-label">{label}</div>
      <svg viewBox="0 0 100 100" className="chart-svg">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-value">{data[data.length - 1]?.toFixed(0) || '0'}</div>
    </div>
  );
};

export const PerformanceMetricsPanel: React.FC<{
  isVisible: boolean;
  onClose?: () => void;
}> = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [historicalData, setHistoricalData] = useState<{
    throughput: number[];
    memory: number[];
    accuracy: number[];
  }>({
    throughput: [],
    memory: [],
    accuracy: []
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const updatePerformanceData = useCallback(async () => {
    try {
      const service = getUltraFastAnalysisService();
      const monitor = getPerformanceMonitor();
      
      const serviceStatus = service.getStatus();
      const performanceStats = service.getPerformanceStats();
      const monitorStats = monitor.getStats();
      const insights = monitor.getInsights();

      const data: PerformanceData = {
        throughput: insights.efficiency_metrics?.avg_throughput || 0,
        accuracy: insights.efficiency_metrics ? (insights.efficiency_metrics.error_rate * 100) : 0,
        memoryUsage: performanceStats?.engine?.estimated_memory || 0,
        cacheHitRatio: insights.efficiency_metrics?.cache_hit_ratio || 0,
        totalProcessed: monitorStats.counters.total_items_processed || 0,
        errorRate: insights.efficiency_metrics?.error_rate || 0,
        profile: serviceStatus.profile || 'unknown',
        uptime: Date.now() - (performanceStats?.monitoring?.start_time || Date.now())
      };

      setPerformanceData(data);

      // Update historical data
      setHistoricalData(prev => ({
        throughput: [...prev.throughput.slice(-19), data.throughput],
        memory: [...prev.memory.slice(-19), typeof data.memoryUsage === 'number' ? data.memoryUsage : 0],
        accuracy: [...prev.accuracy.slice(-19), 100 - (data.errorRate * 100)]
      }));

    } catch (error) {
      console.warn('Failed to update performance data:', error);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    updatePerformanceData();
    const interval = setInterval(updatePerformanceData, 2000);
    
    return () => clearInterval(interval);
  }, [isVisible, updatePerformanceData]);

  const getStatusForMetric = useCallback((value: number, thresholds: number[]) => {
    const [poor, warning, good] = thresholds;
    if (value >= good) return 'excellent';
    if (value >= warning) return 'good';
    if (value >= poor) return 'warning';
    return 'poor';
  }, []);

  const metricsConfig = useMemo(() => {
    if (!performanceData) return [];

    return [
      {
        title: 'Throughput',
        value: performanceData.throughput.toFixed(0),
        unit: 'items/sec',
        status: getStatusForMetric(performanceData.throughput, [500, 1000, 2000]),
        icon: '🚀',
        subtitle: 'Classification speed'
      },
      {
        title: 'Accuracy',
        value: (100 - performanceData.errorRate * 100).toFixed(1),
        unit: '%',
        status: getStatusForMetric(100 - performanceData.errorRate * 100, [90, 95, 98]),
        icon: '🎯',
        subtitle: 'Classification accuracy'
      },
      {
        title: 'Cache Hit Ratio',
        value: (performanceData.cacheHitRatio * 100).toFixed(1),
        unit: '%',
        status: getStatusForMetric(performanceData.cacheHitRatio * 100, [70, 80, 90]),
        icon: '🗄️',
        subtitle: 'Memory efficiency'
      },
      {
        title: 'Memory Usage',
        value: typeof performanceData.memoryUsage === 'number' ? 
          performanceData.memoryUsage.toFixed(0) : 
          performanceData.memoryUsage,
        unit: 'MB',
        status: getStatusForMetric(
          100 - (typeof performanceData.memoryUsage === 'number' ? performanceData.memoryUsage : 50), 
          [50, 70, 85]
        ),
        icon: '💾',
        subtitle: 'Runtime memory'
      },
      {
        title: 'Total Processed',
        value: performanceData.totalProcessed,
        unit: 'items',
        status: 'good' as const,
        icon: '📊',
        subtitle: 'Session total'
      },
      {
        title: 'Profile',
        value: performanceData.profile.toUpperCase(),
        status: performanceData.profile === 'lite' ? 'good' : 'excellent',
        icon: '⚙️',
        subtitle: 'Engine profile'
      }
    ];
  }, [performanceData, getStatusForMetric]);

  if (!isVisible || !performanceData) {
    return null;
  }

  return (
    <div className="performance-metrics-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">📈</span>
          <span>Performance Metrics</span>
          <span className="profile-badge">{performanceData.profile.toUpperCase()}</span>
        </div>
        <div className="panel-controls">
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          {onClose && (
            <button className="close-button" onClick={onClose} title="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="metrics-grid">
        {metricsConfig.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {isExpanded && (
        <div className="expanded-content">
          <div className="charts-section">
            <h4>Real-time Performance</h4>
            <div className="charts-grid">
              <PerformanceChart 
                data={historicalData.throughput}
                label="Throughput (items/sec)"
                color="#007bff"
              />
              <PerformanceChart 
                data={historicalData.memory}
                label="Memory (MB)"
                color="#28a745"
              />
              <PerformanceChart 
                data={historicalData.accuracy}
                label="Accuracy (%)"
                color="#ffc107"
              />
            </div>
          </div>

          <div className="detailed-stats">
            <h4>Detailed Statistics</h4>
            <div className="stats-table">
              <div className="stat-row">
                <span>Uptime:</span>
                <span>{(performanceData.uptime / 1000 / 60).toFixed(1)} minutes</span>
              </div>
              <div className="stat-row">
                <span>Error Rate:</span>
                <span>{(performanceData.errorRate * 100).toFixed(3)}%</span>
              </div>
              <div className="stat-row">
                <span>Cache Efficiency:</span>
                <span>{(performanceData.cacheHitRatio * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Floating performance indicator (minimal)
export const PerformanceIndicator: React.FC<{
  onClick?: () => void;
}> = ({ onClick }) => {
  const [throughput, setThroughput] = useState<number>(0);
  const [status, setStatus] = useState<'excellent' | 'good' | 'warning' | 'poor'>('good');

  useEffect(() => {
    const updateIndicator = async () => {
      try {
        const monitor = getPerformanceMonitor();
        const insights = monitor.getInsights();
        const avgThroughput = insights.efficiency_metrics?.avg_throughput || 0;
        
        setThroughput(avgThroughput);
        
        if (avgThroughput >= 2000) setStatus('excellent');
        else if (avgThroughput >= 1000) setStatus('good');
        else if (avgThroughput >= 500) setStatus('warning');
        else setStatus('poor');
        
      } catch (error) {
        // Silent fail for indicator
      }
    };

    updateIndicator();
    const interval = setInterval(updateIndicator, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    excellent: '#28a745',
    good: '#17a2b8',
    warning: '#ffc107', 
    poor: '#dc3545'
  };

  return (
    <div 
      className="performance-indicator"
      onClick={onClick}
      style={{ background: statusColors[status] }}
      title={`Performance: ${throughput.toFixed(0)} items/sec`}
    >
      <span className="indicator-icon">⚡</span>
      <span className="indicator-value">{throughput.toFixed(0)}</span>
    </div>
  );
};

// CSS Styles
const styles = `
.performance-metrics-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.profile-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.panel-controls {
  display: flex;
  gap: 0.5rem;
}

.expand-button, .close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.metric-card {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 0.75rem;
  border-left: 4px solid #007bff;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.metric-icon {
  font-size: 1rem;
}

.metric-title {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
}

.metric-unit {
  font-size: 0.75rem;
  color: #666;
  margin-left: 0.25rem;
}

.metric-subtitle {
  font-size: 0.7rem;
  color: #888;
  margin-top: 0.25rem;
}

.expanded-content {
  border-top: 1px solid #e9ecef;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.charts-section h4,
.detailed-stats h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #333;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.performance-chart {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
}

.chart-label {
  font-size: 0.7rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.chart-svg {
  width: 100%;
  height: 40px;
  margin-bottom: 0.5rem;
}

.chart-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: #333;
}

.stats-table {
  display: grid;
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.stat-row span:first-child {
  color: #666;
}

.stat-row span:last-child {
  font-weight: 600;
  color: #333;
}

.performance-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #007bff;
  color: white;
  border-radius: 20px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 999;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.performance-indicator:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.indicator-icon {
  font-size: 1rem;
}

@media (max-width: 480px) {
  .performance-metrics-panel {
    width: calc(100vw - 40px);
    right: 20px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default PerformanceMetricsPanel;