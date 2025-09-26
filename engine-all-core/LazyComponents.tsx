import React, { Suspense, lazy } from 'react';
import { SkeletonLoader } from './SkeletonLoader';

// Lazy load heavy components for better performance
const LazyStreamlinedResultsView = lazy(() => 
  import('./StreamlinedResultsView').then(module => ({ 
    default: module.StreamlinedResultsView 
  }))
);

const LazyAdvancedFilters = lazy(() => 
  import('./AdvancedFilters').then(module => ({ 
    default: module.AdvancedFilters 
  }))
);

const LazyDashboard = lazy(() => 
  import('./Dashboard').then(module => ({ 
    default: module.Dashboard 
  }))
);

const LazySmartSearch = lazy(() => 
  import('./SmartSearch').then(module => ({ 
    default: module.SmartSearch 
  }))
);

const LazyExplainModal = lazy(() => 
  import('./ExplainModal').then(module => ({ 
    default: module.ExplainModal 
  }))
);

// Loading fallback component
const ComponentLoader: React.FC<{ height?: string }> = ({ height = "h-64" }) => (
  <div className={`${height} flex items-center justify-center`}>
    <div className="space-y-4 w-full max-w-4xl">
      <SkeletonLoader />
    </div>
  </div>
);

// Wrapper components with Suspense
export const LazyStreamlinedResultsViewWrapper: React.FC<Parameters<typeof LazyStreamlinedResultsView>[0]> = (props) => (
  <Suspense fallback={<ComponentLoader height="h-96" />}>
    <LazyStreamlinedResultsView {...props} />
  </Suspense>
);

export const LazyAdvancedFiltersWrapper: React.FC<Parameters<typeof LazyAdvancedFilters>[0]> = (props) => (
  <Suspense fallback={<ComponentLoader height="h-32" />}>
    <LazyAdvancedFilters {...props} />
  </Suspense>
);

export const LazyDashboardWrapper: React.FC<Parameters<typeof LazyDashboard>[0]> = (props) => (
  <Suspense fallback={<ComponentLoader height="h-48" />}>
    <LazyDashboard {...props} />
  </Suspense>
);

export const LazySmartSearchWrapper: React.FC<Parameters<typeof LazySmartSearch>[0]> = (props) => (
  <Suspense fallback={<ComponentLoader height="h-16" />}>
    <LazySmartSearch {...props} />
  </Suspense>
);

export const LazyExplainModalWrapper: React.FC<Parameters<typeof LazyExplainModal>[0]> = (props) => (
  <Suspense fallback={null}>
    <LazyExplainModal {...props} />
  </Suspense>
);

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
};

// Virtual scrolling component for large lists
export const VirtualizedList: React.FC<{
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}> = ({ items, itemHeight, containerHeight, renderItem, className = '' }) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoized components to prevent unnecessary re-renders
export const MemoizedComponent = <T extends Record<string, any>>(
  Component: React.ComponentType<T>
) => {
  return React.memo(Component, (prevProps, nextProps) => {
    // Custom comparison logic for better memoization
    return Object.keys(prevProps).every(key => {
      if (typeof prevProps[key] === 'function' && typeof nextProps[key] === 'function') {
        return prevProps[key].toString() === nextProps[key].toString();
      }
      return prevProps[key] === nextProps[key];
    });
  });
};