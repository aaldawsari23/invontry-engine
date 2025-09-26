import React, { useState, useEffect, useCallback } from 'react';

// Mobile detection hook
export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return { isMobile, isTablet, orientation, isDesktop: !isMobile && !isTablet };
};

// Touch gesture hook for mobile interactions
export const useTouchGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onPinch?: (scale: number) => void,
  threshold = 50
) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart || e.touches.length > 0) return;

    setTouchEnd({
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    });

    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
  }, [touchStart, onSwipeLeft, onSwipeRight, threshold]);

  return { handleTouchStart, handleTouchEnd };
};

// Mobile-optimized modal component
export const MobileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}> = ({ isOpen, onClose, title, children, fullScreen = false }) => {
  const { isMobile } = useMobileDetection();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`
        relative bg-slate-800 border border-slate-700 shadow-xl
        ${isMobile && !fullScreen 
          ? 'w-full rounded-t-2xl max-h-[90vh] pb-safe' 
          : fullScreen 
            ? 'w-full h-full rounded-none' 
            : 'max-w-lg w-full mx-4 rounded-xl max-h-[90vh]'
        }
        ${isMobile ? 'animate-slideUp' : 'animate-scaleIn'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized tabs component
export const MobileTabs: React.FC<{
  tabs: Array<{ id: string; label: string; icon?: string; content: React.ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => {
  const { isMobile } = useMobileDetection();
  const [showTabMenu, setShowTabMenu] = useState(false);

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (isMobile) {
    // Mobile: Dropdown-style tab selector
    return (
      <div className="space-y-4">
        <div className="relative">
          <button
            onClick={() => setShowTabMenu(!showTabMenu)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          >
            <span className="flex items-center gap-2">
              {activeTabData?.icon && <span>{activeTabData.icon}</span>}
              {activeTabData?.label}
            </span>
            <span className={`transform transition-transform ${showTabMenu ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showTabMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setShowTabMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                    tab.id === activeTab ? 'bg-slate-700 text-teal-400' : 'text-white'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          {activeTabData?.content}
        </div>
      </div>
    );
  }

  // Desktop: Traditional horizontal tabs
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg">
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab.id === activeTab
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="p-4">
        {activeTabData?.content}
      </div>
    </div>
  );
};

// Mobile-optimized card grid
export const ResponsiveCardGrid: React.FC<{
  children: React.ReactNode;
  minCardWidth?: number;
  gap?: number;
  className?: string;
}> = ({ children, minCardWidth = 280, gap = 16, className = '' }) => {
  const { isMobile, isTablet } = useMobileDetection();

  const getGridClasses = () => {
    if (isMobile) {
      return 'grid-cols-1';
    } else if (isTablet) {
      return 'grid-cols-2';
    } else {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  return (
    <div 
      className={`grid ${getGridClasses()} gap-${gap/4} ${className}`}
      style={{ 
        gridTemplateColumns: !isMobile && !isTablet 
          ? `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` 
          : undefined 
      }}
    >
      {children}
    </div>
  );
};

// Pull-to-refresh component
export const PullToRefresh: React.FC<{
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}> = ({ onRefresh, children, threshold = 80 }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY && window.scrollY === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      setPullDistance(Math.min(distance, threshold * 2));
      
      if (distance > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setStartY(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance * 0.5}px)` : undefined,
        transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s ease-out' : undefined
      }}
    >
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center py-4 text-slate-400"
          style={{ 
            opacity: Math.min(pullDistance / threshold, 1),
            transform: `scale(${Math.min(pullDistance / threshold, 1)})`
          }}
        >
          {pullDistance > threshold ? (
            <span>Release to refresh</span>
          ) : (
            <span>Pull to refresh</span>
          )}
        </div>
      )}
      
      {isRefreshing && (
        <div className="flex items-center justify-center py-4">
          <div className="loading-spinner" />
          <span className="ml-2 text-slate-400">Refreshing...</span>
        </div>
      )}
      
      {children}
    </div>
  );
};

// Bottom sheet component for mobile
export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: string[];
  initialSnap?: number;
}> = ({ isOpen, onClose, children, snapPoints = ['25%', '50%', '90%'], initialSnap = 1 }) => {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const { isMobile } = useMobileDetection();

  if (!isMobile) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <div 
            className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-3xl shadow-xl transform transition-transform duration-300"
            style={{ height: snapPoints[currentSnap] }}
          >
            {/* Drag handle */}
            <div className="flex items-center justify-center py-3">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4 overflow-y-auto h-full">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Floating action button for mobile
export const FloatingActionButton: React.FC<{
  onClick: () => void;
  icon: string;
  label: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}> = ({ onClick, icon, label, position = 'bottom-right' }) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-right': return 'bottom-6 right-6';
      case 'bottom-left': return 'bottom-6 left-6';
      case 'bottom-center': return 'bottom-6 left-1/2 transform -translate-x-1/2';
    }
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        fixed ${getPositionStyles()} z-40
        w-14 h-14 bg-teal-600 hover:bg-teal-500 
        text-white rounded-full shadow-lg 
        flex items-center justify-center 
        transition-all duration-200 
        hover:scale-105 active:scale-95
      `}
    >
      <span className="text-xl">{icon}</span>
    </button>
  );
};