import React, { useState, useEffect, useRef } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
  badge?: string | number;
  className?: string;
  onToggle?: (expanded: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  icon,
  badge,
  className = '',
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors duration-200 text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {badge !== undefined && (
            <span className="px-2 py-1 bg-teal-600 text-white text-xs rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`transform transition-transform duration-200 text-slate-400 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            ▼
          </span>
        </div>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out`}
        style={{
          height: isExpanded ? contentHeight || 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div ref={contentRef} className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    badge?: string | number;
    content: React.ReactNode;
    disabled?: boolean;
  }>;
  defaultTab?: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  className = '',
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap
              transition-colors duration-200 relative
              ${activeTab === tab.id 
                ? 'text-teal-400 border-b-2 border-teal-400' 
                : 'text-slate-400 hover:text-white'
              }
              ${tab.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer'
              }
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full font-medium
                ${activeTab === tab.id 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-slate-700 text-slate-300'
                }
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <div className="animate-fadeIn">
          {activeTabContent}
        </div>
      </div>
    </div>
  );
};

interface ExpandableCardProps {
  title: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  className?: string;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  summary,
  children,
  expanded = false,
  onToggle,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors duration-200 ${className}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors duration-200"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white mb-1">{title}</h4>
            <div className="text-sm text-slate-400">
              {summary}
            </div>
          </div>
          <div className={`ml-4 transform transition-transform duration-200 text-slate-400 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            ▼
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 animate-slideDown">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

interface SmartLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  sidebarPosition?: 'left' | 'right';
  collapsibleSidebar?: boolean;
  className?: string;
}

export const SmartLayout: React.FC<SmartLayoutProps> = ({
  children,
  sidebar,
  sidebarWidth = 'md',
  sidebarPosition = 'left',
  collapsibleSidebar = true,
  className = ''
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const getSidebarWidth = () => {
    if (isSidebarCollapsed) return 'w-16';
    
    switch (sidebarWidth) {
      case 'sm': return 'w-64';
      case 'md': return 'w-80';
      case 'lg': return 'w-96';
      default: return 'w-80';
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (!sidebar) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`flex h-full ${className}`}>
      {sidebarPosition === 'left' && sidebar && (
        <div className={`${getSidebarWidth()} transition-all duration-300 flex-shrink-0`}>
          <div className="h-full bg-slate-900/50 border-r border-slate-700 relative">
            {collapsibleSidebar && (
              <button
                onClick={toggleSidebar}
                className="absolute top-4 -right-3 bg-slate-800 border border-slate-600 rounded-full p-1 hover:bg-slate-700 transition-colors z-10"
              >
                <span className={`transform transition-transform duration-200 block w-4 h-4 text-xs leading-none text-slate-400 ${
                  isSidebarCollapsed ? 'rotate-180' : ''
                }`}>
                  ◀
                </span>
              </button>
            )}
            <div className="p-4 overflow-y-auto h-full">
              {isSidebarCollapsed ? (
                <div className="space-y-4">
                  {/* Collapsed sidebar content */}
                </div>
              ) : (
                sidebar
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {children}
      </div>

      {sidebarPosition === 'right' && sidebar && (
        <div className={`${getSidebarWidth()} transition-all duration-300 flex-shrink-0`}>
          <div className="h-full bg-slate-900/50 border-l border-slate-700 relative">
            {collapsibleSidebar && (
              <button
                onClick={toggleSidebar}
                className="absolute top-4 -left-3 bg-slate-800 border border-slate-600 rounded-full p-1 hover:bg-slate-700 transition-colors z-10"
              >
                <span className={`transform transition-transform duration-200 block w-4 h-4 text-xs leading-none text-slate-400 ${
                  isSidebarCollapsed ? 'rotate-180' : ''
                }`}>
                  ▶
                </span>
              </button>
            )}
            <div className="p-4 overflow-y-auto h-full">
              {isSidebarCollapsed ? (
                <div className="space-y-4">
                  {/* Collapsed sidebar content */}
                </div>
              ) : (
                sidebar
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility component for progressive content loading
interface ProgressiveContentProps {
  stages: Array<{
    id: string;
    content: React.ReactNode;
    delay?: number;
  }>;
  stageDelay?: number;
}

export const ProgressiveContent: React.FC<ProgressiveContentProps> = ({
  stages,
  stageDelay = 300
}) => {
  const [visibleStages, setVisibleStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    stages.forEach((stage, index) => {
      const delay = stage.delay !== undefined ? stage.delay : index * stageDelay;
      setTimeout(() => {
        setVisibleStages(prev => new Set([...prev, stage.id]));
      }, delay);
    });
  }, [stages, stageDelay]);

  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={`transition-all duration-500 ${
            visibleStages.has(stage.id)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          {stage.content}
        </div>
      ))}
    </div>
  );
};