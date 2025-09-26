import React, { useMemo } from 'react';
import type { AnalysisResult } from '../types';

type Cell = {
  category: string;
  subcategory: string;
  items: AnalysisResult[];
  intensity: number;
};

interface VisualCategorySystemProps {
  results: AnalysisResult[];
  onSelect: (category: string) => void;
  activeCategory: string;
  minThreshold?: number;
  sortBy?: 'intensity' | 'alpha';
}

export const VisualCategorySystem: React.FC<VisualCategorySystemProps> = ({ 
    results, 
    onSelect, 
    activeCategory,
    minThreshold = 0, 
    sortBy = 'intensity' 
}) => {
  const matrix = useMemo(() => buildCategoryMatrix(results), [results]);
  const maxIntensity = useMemo(() => Math.max(1, ...matrix.map((c) => c.intensity)), [matrix]);

  const visible = useMemo(() => {
    const f = matrix.filter((c) => c.intensity >= minThreshold && c.category !== 'Brands');
    return sortBy === 'alpha'
      ? f.sort((a, b) => (a.category + a.subcategory).localeCompare(b.category + b.subcategory))
      : f.sort((a, b) => b.intensity - a.intensity);
  }, [matrix, minThreshold, sortBy]);

  if (!visible.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div
        className="
          grid gap-px bg-slate-700 p-px rounded-lg
          grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8
        "
      >
        <button
          type="button"
          onClick={() => onSelect('All')}
          className={`p-3 cursor-pointer transition-all text-left ${activeCategory === 'All' ? 'ring-2 ring-teal-400 z-10' : 'hover:ring-2 hover:ring-teal-500'} bg-slate-800`}
          aria-label="Show all categories"
        >
             <div className="text-sm font-medium text-white">All Categories</div>
             <div className="text-lg font-bold text-white mt-1">{results.length}</div>
        </button>
        {visible.map((cell, idx) => (
          <CategoryCell
            key={`${cell.category}::${cell.subcategory || ''}::${idx}`}
            cell={cell}
            max={maxIntensity}
            onSelect={() => onSelect(cell.category)}
            isActive={activeCategory === cell.category}
          />
        ))}
      </div>
    </div>
  );
};

function buildCategoryMatrix(results: AnalysisResult[]): Cell[] {
  const map = new Map<string, Cell>();
  for (const r of results || []) {
    const category = r.PT_Category || 'Uncategorized';
    const subcategory = r.PT_Subcategory || '';
    const key = `${category}||${subcategory}`;
    if (!map.has(key)) map.set(key, { category, subcategory, items: [], intensity: 0 });
    const ref = map.get(key)!;
    ref.items.push(r);
    ref.intensity += 1;
  }
  return Array.from(map.values());
}

function heatColor(norm: number) {
  const n = Math.max(0, Math.min(1, norm));
  const hue = 170, sat = Math.round(35 + n * 55), light = Math.round(14 + n * 36);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

const CategoryCell: React.FC<{
  cell: Cell;
  max: number;
  onSelect: () => void;
  isActive: boolean;
}> = ({ cell, max, onSelect, isActive }) => {
  const norm = cell.intensity / Math.max(1, max);
  const bg = heatColor(norm);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-3 cursor-pointer transition-all text-left relative ${isActive ? 'ring-2 ring-teal-400 z-10' : 'hover:ring-2 hover:ring-teal-500'}`}
      style={{ backgroundColor: bg }}
      aria-label={`${cell.category} ${cell.subcategory} (${cell.items.length})`}
    >
      <div className="text-sm font-medium text-white truncate">{cell.category}</div>
      {cell.subcategory !== 'General' && <div className="text-xs text-slate-100/80 truncate">{cell.subcategory}</div>}
      <div className="text-lg font-bold text-white mt-1">{cell.items.length}</div>
    </button>
  );
};
