import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult } from '../types';

interface SmartSearchProps {
  results: AnalysisResult[];
  onSearch: (query: string) => void;
  placeholder?: string;
}

interface SearchSuggestion {
  type: 'item' | 'manufacturer' | 'category' | 'keyword';
  text: string;
  count?: number;
  icon: string;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({ 
  results, 
  onSearch, 
  placeholder = "Search items, manufacturers, categories..." 
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate smart suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) {
      return searchHistory.slice(0, 5).map(h => ({
        type: 'item' as const,
        text: h,
        icon: '🕐'
      }));
    }

    const queryLower = query.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Item name suggestions
    const itemNames = new Set<string>();
    results.forEach(result => {
      if (result.item_name.toLowerCase().includes(queryLower) && itemNames.size < 3) {
        itemNames.add(result.item_name);
      }
    });

    itemNames.forEach(name => {
      suggestions.push({
        type: 'item',
        text: name,
        icon: '📦'
      });
    });

    // Manufacturer suggestions
    const manufacturers = new Map<string, number>();
    results.forEach(result => {
      if (result.manufacturer && result.manufacturer.toLowerCase().includes(queryLower)) {
        manufacturers.set(result.manufacturer, (manufacturers.get(result.manufacturer) || 0) + 1);
      }
    });

    Array.from(manufacturers.entries()).slice(0, 2).forEach(([name, count]) => {
      suggestions.push({
        type: 'manufacturer',
        text: name,
        count,
        icon: '🏭'
      });
    });

    // Category suggestions
    const categories = new Map<string, number>();
    results.forEach(result => {
      if (result.PT_Category.toLowerCase().includes(queryLower)) {
        categories.set(result.PT_Category, (categories.get(result.PT_Category) || 0) + 1);
      }
    });

    Array.from(categories.entries()).slice(0, 2).forEach(([name, count]) => {
      suggestions.push({
        type: 'category',
        text: name,
        count,
        icon: '📂'
      });
    });

    // Keyword suggestions
    const keywords = new Map<string, number>();
    results.forEach(result => {
      result.Matched_Keywords.forEach(kw => {
        if (kw.canonical.toLowerCase().includes(queryLower)) {
          keywords.set(kw.canonical, (keywords.get(kw.canonical) || 0) + 1);
        }
      });
    });

    Array.from(keywords.entries()).slice(0, 2).forEach(([name, count]) => {
      suggestions.push({
        type: 'keyword',
        text: name,
        count,
        icon: '🔍'
      });
    });

    return suggestions.slice(0, 8);
  }, [query, results, searchHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex].text);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (text: string) => {
    setQuery(text);
    onSearch(text);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [text, ...prev.filter(h => h !== text)];
      return newHistory.slice(0, 10);
    });
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-slate-400">🔍</span>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
        />

        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}`}
              onClick={() => selectSuggestion(suggestion.text)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors ${
                index === selectedIndex ? 'bg-slate-700' : ''
              }`}
            >
              <span className="text-lg">{suggestion.icon}</span>
              <div className="flex-1">
                <div className="text-white font-medium">{suggestion.text}</div>
                <div className="text-xs text-slate-400 capitalize">
                  {suggestion.type}
                  {suggestion.count && ` • ${suggestion.count} items`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search Stats */}
      {query && (
        <div className="mt-2 text-xs text-slate-400">
          Found {results.filter(r => 
            r.item_name.toLowerCase().includes(query.toLowerCase()) ||
            (r.manufacturer && r.manufacturer.toLowerCase().includes(query.toLowerCase())) ||
            r.PT_Category.toLowerCase().includes(query.toLowerCase())
          ).length} results
        </div>
      )}
    </div>
  );
};