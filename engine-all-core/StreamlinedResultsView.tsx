
import React, { useMemo, useState } from 'react';
import type { AnalysisResult, SortConfig } from '../types';
import { extractBaseIdentifier } from '../utils/deduplication';
import { useTranslation } from './I18n';
import { CountryFlag } from './CountryFlag';
import { Tooltip } from './Tooltip';
import { AnimatedCard } from './AnimatedCard';

type GroupedItem = {
  baseItem: AnalysisResult;
  variants: AnalysisResult[];
  totalQuantity: number;
  commonSKUs: string[];
};

interface StreamlinedResultsViewProps {
    results: AnalysisResult[];
    onExplain: (item: AnalysisResult) => void;
    selectedItems?: Set<string>;
    onSelectItem?: (itemId: string) => void;
    onSelectAll?: () => void;
    onExport?: (items: AnalysisResult[]) => void;
    onBulkUpdate?: (action: string, items: AnalysisResult[]) => void;
    onClearSelection?: () => void;
}

type SortOption = 'name' | 'score' | 'category' | 'decision';
type SortDirection = 'asc' | 'desc';

export const StreamlinedResultsView: React.FC<StreamlinedResultsViewProps> = ({ 
  results, 
  onExplain,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  onExport,
  onBulkUpdate,
  onClearSelection
}) => {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const groupedResults = useMemo<GroupedItem[]>(() => {
    const groups = new Map<string, GroupedItem>();

    for (const item of results || []) {
      const baseKey = extractBaseIdentifier(item.item_name);
      const sku = item.sku;

      if (!groups.has(baseKey)) {
        groups.set(baseKey, {
          baseItem: item,
          variants: [],
          totalQuantity: 1,
          commonSKUs: sku ? [sku] : []
        });
      } else {
        const g = groups.get(baseKey)!;
        g.variants.push(item);
        g.totalQuantity += 1;
        if (sku && !g.commonSKUs.includes(sku)) g.commonSKUs.push(sku);
      }
    }

    return Array.from(groups.values());
  }, [results]);

  const selectedResultList = useMemo(() => {
    if (!selectedItems.size) return [] as AnalysisResult[];
    return results.filter(item => selectedItems.has(item.id));
  }, [results, selectedItems]);

  // Sorting function
  const sortedGroupedResults = useMemo(() => {
    const sorted = [...groupedResults];
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.baseItem.item_name.toLowerCase();
          bVal = b.baseItem.item_name.toLowerCase();
          break;
        case 'score':
          aVal = a.baseItem.Score;
          bVal = b.baseItem.Score;
          break;
        case 'category':
          aVal = a.baseItem.PT_Category.toLowerCase();
          bVal = b.baseItem.PT_Category.toLowerCase();
          break;
        case 'decision':
          aVal = a.baseItem.Decision;
          bVal = b.baseItem.Decision;
          break;
        default:
          aVal = a.baseItem.Score;
          bVal = b.baseItem.Score;
      }
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }, [groupedResults, sortBy, sortDirection]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedGroupedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedGroupedResults, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedGroupedResults.length / itemsPerPage);

  const categorized = useMemo(() => {
    const out: Record<string, { label: string; color: string; items: GroupedItem[] }> = {};
    const categoryMeta: Record<string, { color: string }> = {
        'Equipment & Devices': { color: 'border-blue-500' },
        'Modalities': { color: 'border-purple-500' },
        'Consumables': { color: 'border-orange-500' },
        'Assessment Tools': { color: 'border-indigo-500' },
        'Orthotics & Prosthetics': { color: 'border-pink-500' },
        'Brands': { color: 'border-green-500' },
        'Other': { color: 'border-slate-500' },
        'Uncategorized': { color: 'border-slate-600' }
    };

    for (const g of paginatedResults) {
      const key = g.baseItem.PT_Category || 'Other';
      if (!out[key]) {
        out[key] = { label: key, color: categoryMeta[key]?.color || 'border-slate-500', items: [] };
      }
      out[key].items.push(g);
    }
    return Object.entries(out).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  }, [paginatedResults]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const isEverythingSelected = groupedResults.length > 0 && groupedResults.every(group => selectedItems.has(group.baseItem.id));

  const handleSelectAllToggle = () => {
    if (isEverythingSelected) {
      onClearSelection?.();
    } else {
      onSelectAll?.();
    }
  };

  if (results.length === 0) {
     return (
        <div className="text-center p-8 text-slate-500 bg-slate-800/50 rounded-lg">
            {t('table_no_results')}
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Results Info & Bulk Actions */}
          <div className="flex items-center gap-4">
            <span 
              className="text-slate-400"
              role="status"
              aria-live="polite"
            >
              {sortedGroupedResults.length} items {selectedResultList.length > 0 && `(${selectedResultList.length} selected)`}
            </span>
            {selectedResultList.length > 0 && (
              <div className="flex gap-2" role="toolbar" aria-label="Bulk actions">
                <button 
                  onClick={() => onExport?.(selectedResultList)}
                  className="text-sm px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-500 transition-colors focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-700 disabled:text-slate-400"
                  disabled={selectedResultList.length === 0}
                  aria-label={`Export ${selectedResultList.length} selected items`}
                >
                  Export Selected
                </button>
                <button 
                  onClick={() => onClearSelection?.()}
                  className="text-sm px-3 py-1 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                  aria-label="Clear all selections"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400" id="sort-label">Sort by:</span>
            <div 
              className="flex gap-1 bg-slate-900 p-1 rounded-lg"
              role="tablist"
              aria-labelledby="sort-label"
            >
              {(['name', 'score', 'category', 'decision'] as SortOption[]).map(option => (
                <button
                  key={option}
                  onClick={() => handleSort(option)}
                  role="tab"
                  aria-selected={sortBy === option}
                  aria-label={`Sort by ${option} ${sortBy === option ? (sortDirection === 'asc' ? 'ascending' : 'descending') : ''}`}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    sortBy === option
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {option}
                  {sortBy === option && (
                    <span className="ml-1" aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Select All */}
        {paginatedResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isEverythingSelected}
                onChange={handleSelectAllToggle}
                className="rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                aria-describedby="select-all-description"
              />
              <span>Select all results</span>
              <span id="select-all-description" className="sr-only">
                Toggle selection for the full result set
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-6" role="main" aria-label="Analysis results">
        {categorized.map(([key, cat]) => (
          <CategorySection 
            key={key} 
            categoryKey={key} 
            category={cat} 
            onExplain={onExplain}
            selectedItems={selectedItems}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav 
          className="bg-slate-800 p-4 rounded-lg border border-slate-700"
          role="navigation"
          aria-label="Pagination navigation"
        >
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-400" role="status" aria-live="polite">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2" role="group" aria-label="Pagination controls">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 transition-colors focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                aria-label="Go to previous page"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex gap-1" role="group" aria-label="Page numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                      className={`px-3 py-1 text-sm rounded-md transition-colors focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        currentPage === pageNum
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 transition-colors focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                aria-label="Go to next page"
              >
                Next
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
};

/* ---------- UI Components ---------- */

const ItemCard: React.FC<{ 
  group: GroupedItem; 
  onExplain: (item: AnalysisResult) => void;
  selectedItems: Set<string>;
  onSelectItem?: (itemId: string) => void;
}> = ({ group, onExplain, selectedItems, onSelectItem }) => {
  const { t } = useTranslation();
  const { baseItem, variants, totalQuantity, commonSKUs } = group;
  const hasVariants = variants.length > 0;
  const isSelected = selectedItems.has(baseItem.id);

  const kw = baseItem.Matched_Keywords.slice(0, 5);

  return (
    <div
      className={[
        'bg-slate-800 rounded-lg p-4 border-l-4 transition-all duration-200 flex flex-col',
        getDecisionBorderColor(baseItem.Decision),
        hasVariants ? 'shadow-lg' : 'shadow-md hover:shadow-lg',
        isSelected ? 'ring-2 ring-teal-400' : ''
      ].join(' ')}
    >
      <div className="space-y-3 flex-grow">
        {/* Title with Selection */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectItem && onSelectItem(baseItem.id)}
              className="mt-1 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              aria-labelledby={`item-title-${baseItem.id}`}
              aria-describedby={`item-desc-${baseItem.id}`}
            />
            <div className="flex-1">
              <h3 
                id={`item-title-${baseItem.id}`}
                className="text-lg font-medium text-white leading-tight"
              >
                {baseItem.item_name}
              </h3>
              
              {/* Manufacturer Info */}
              {baseItem.manufacturer && (
                <div className="flex items-center gap-2 mt-1">
                  <CountryFlag 
                    countryCode={baseItem.manufacturer_country} 
                    countryName={baseItem.manufacturer_country}
                    size="sm"
                  />
                  <span className="text-sm text-slate-400">{baseItem.manufacturer}</span>
                </div>
              )}
              {baseItem.supplier && (
                <div className="mt-1 text-xs text-slate-400">
                  Supplier: <span className="text-slate-300">{baseItem.supplier}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Score Badge */}
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              baseItem.Decision === 'Accepted' ? 'bg-green-600/20 text-green-400' :
              baseItem.Decision === 'Review' ? 'bg-yellow-600/20 text-yellow-400' :
              'bg-red-600/20 text-red-400'
            }`}>
              {baseItem.Decision}
            </span>
            {hasVariants && (
              <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                +{variants.length} similar
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {baseItem.description && (
          <p 
            id={`item-desc-${baseItem.id}`}
            className="text-sm text-slate-400 line-clamp-2"
          >
            {baseItem.description}
          </p>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Codes & Category */}
          <div>
            <span className="text-slate-500">Category & SKU</span>
            <div className="mt-1 space-y-1">
              <div className="text-slate-300 font-medium">{baseItem.PT_Category}</div>
              {baseItem.sku && (
                <div className="font-mono text-slate-400 text-xs truncate">{baseItem.sku}</div>
              )}
              {commonSKUs.length > 1 && (
                <div className="text-xs text-slate-400">+{commonSKUs.length - 1} more codes</div>
              )}
            </div>
          </div>

          {/* Score with Tooltip */}
          <div>
            <span className="text-slate-500">Analysis Score</span>
            <div className="mt-1">
              <Tooltip 
                content={
                  <div className="space-y-2 max-w-sm">
                    <div className="font-medium text-white">Analysis Details</div>
                    <div className="text-sm space-y-1">
                      <div>Score: <span className="font-mono">{baseItem.Score}</span></div>
                      <div>Decision: <span className={
                        baseItem.Decision === 'Accepted' ? 'text-green-400' :
                        baseItem.Decision === 'Review' ? 'text-yellow-400' :
                        'text-red-400'
                      }>{baseItem.Decision}</span></div>
                      <div className="text-slate-400 text-xs mt-2">{baseItem.Decision_Reason}</div>
                      {baseItem.Matched_Keywords.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-slate-500">Matched Keywords:</div>
                          <div className="text-xs text-slate-400">
                            {baseItem.Matched_Keywords.slice(0, 3).map(kw => kw.canonical).join(', ')}
                            {baseItem.Matched_Keywords.length > 3 && '...'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                }
                position="top"
                className="bg-slate-900 border-slate-600"
              >
                <div className="flex items-center gap-2 cursor-help">
                  <ScoreVisualizer score={baseItem.Score} />
                  <span className="text-xs text-slate-400 hover:text-slate-300">ℹ️</span>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(baseItem.specialty || baseItem.region || baseItem.area || baseItem.type) && (
          <div className="pt-2 border-t border-slate-700/50">
            <div className="flex flex-wrap gap-2 text-xs">
              {baseItem.specialty && (
                <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                  {baseItem.specialty}
                </span>
              )}
              {baseItem.region && (
                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                  {baseItem.region}
                </span>
              )}
              {baseItem.area && (
                <span className="px-2 py-1 bg-orange-600/20 text-orange-400 rounded">
                  {baseItem.area}
                </span>
              )}
              {baseItem.type && (
                <span className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded">
                  {baseItem.type}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Top Matched Keywords */}
        {kw.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {kw.slice(0, 3).map((k, i) => (
              <Tooltip
                key={`${k.canonical}-${i}`}
                content={
                  <div className="text-xs space-y-1">
                    <div>Matched: <span className="font-mono">{k.matched}</span></div>
                    <div>Strategy: {k.strategy}</div>
                    <div>Confidence: {(k.confidence * 100).toFixed(0)}%</div>
                  </div>
                }
                position="top"
              >
                <span className="px-2 py-0.5 bg-slate-700/60 text-xs rounded text-slate-300 cursor-help">
                  {k.canonical}
                </span>
              </Tooltip>
            ))}
            {kw.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-700/40 text-xs rounded text-slate-400">
                +{kw.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ScoreVisualizer: React.FC<{ score: number }> = ({ score }) => {
  const normalized = Math.max(0, Math.min(100, score + 50));
  const segments = 5;
  const filled = Math.round((normalized / 100) * segments);

  const color = score > 15 ? 'bg-emerald-500' : score > 5 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-3 rounded-sm ${i < filled ? color : 'bg-slate-700'}`}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-slate-400">{score}</span>
    </div>
  );
};

const CategorySection: React.FC<{
  categoryKey: string;
  category: { label: string; color: string; items: GroupedItem[] };
  onExplain: (item: AnalysisResult) => void;
  selectedItems: Set<string>;
  onSelectItem?: (itemId: string) => void;
}> = ({ categoryKey, category, onExplain, selectedItems, onSelectItem }) => {
  const { t } = useTranslation();
  if (!category.items.length) return null;

  return (
    <section className="space-y-4" role="region" aria-labelledby={`category-${categoryKey}`}>
      <div className={`flex items-center gap-3 border-b pb-2 ${category.color}`}>
        <h2 id={`category-${categoryKey}`} className="text-xl font-bold text-white">{category.label}</h2>
        <span className="text-sm text-slate-400" role="status">
          {t('card_item_count', {count: category.items.length})}
        </span>
      </div>

      <div
        className="
          grid gap-4
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
        "
      >
        {category.items.map((g, idx) => (
          <AnimatedCard
            key={`${categoryKey}-${idx}`}
            delay={idx * 50}
            animationType="fade"
            className="h-full"
          >
            <ItemCard 
              group={g} 
              onExplain={onExplain}
              selectedItems={selectedItems}
              onSelectItem={onSelectItem}
            />
          </AnimatedCard>
        ))}
      </div>
    </section>
  );
};

/* ---------- Helpers ---------- */

function getDecisionBorderColor(decision?: string) {
  switch ((decision || '').toLowerCase()) {
    case 'accepted': return 'border-green-500';
    case 'review':   return 'border-yellow-500';
    case 'rejected': return 'border-red-500';
    default:         return 'border-slate-600';
  }
}
