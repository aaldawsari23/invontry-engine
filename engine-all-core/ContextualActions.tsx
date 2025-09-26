import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult } from '../types';

interface ContextualActionsProps {
  selectedItems: Set<string>;
  results: AnalysisResult[];
  onExport: (items: AnalysisResult[]) => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkUpdate: (action: string, items: AnalysisResult[]) => void;
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  selectedItems,
  results,
  onExport,
  onClearSelection,
  onSelectAll,
  onBulkUpdate
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const selectedResults = useMemo(() => {
    if (!selectedItems.size) return [] as AnalysisResult[];
    return results.filter(r => selectedItems.has(r.id));
  }, [results, selectedItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            onSelectAll();
            break;
          case 'e':
            e.preventDefault();
            if (selectedItems.size > 0) {
              onExport(selectedResults);
            }
            break;
          case 'd':
            e.preventDefault();
            onClearSelection();
            break;
          case '/':
            e.preventDefault();
            document.getElementById('search-input')?.focus();
            break;
        }
      }

      // Show shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }

      // Escape key
      if (e.key === 'Escape') {
        if (selectedItems.size > 0) {
          onClearSelection();
        } else if (showShortcuts) {
          setShowShortcuts(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedItems, selectedResults, showShortcuts, onSelectAll, onExport, onClearSelection]);

  const bulkActions = [
    {
      id: 'accept',
      label: 'Mark as Accepted',
      icon: '✅',
      color: 'bg-green-600 hover:bg-green-500',
      disabled: selectedResults.every(r => r.Decision === 'Accepted')
    },
    {
      id: 'review',
      label: 'Mark for Review',
      icon: '📋',
      color: 'bg-yellow-600 hover:bg-yellow-500',
      disabled: selectedResults.every(r => r.Decision === 'Review')
    },
    {
      id: 'reject',
      label: 'Mark as Rejected',
      icon: '❌',
      color: 'bg-red-600 hover:bg-red-500',
      disabled: selectedResults.every(r => r.Decision === 'Rejected')
    }
  ];

  if (selectedResultList.length === 0 && !showShortcuts) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowShortcuts(true)}
          className="bg-slate-800 text-slate-400 p-3 rounded-full hover:bg-slate-700 transition-all duration-200 shadow-lg border border-slate-600"
          title="Show keyboard shortcuts (?)"
        >
          ⌨️
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Contextual Action Bar */}
      {selectedResultList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
              {/* Selection Info */}
              <div className="text-white font-medium">
                {selectedResultList.length} item{selectedResultList.length !== 1 ? 's' : ''} selected
              </div>

              <div className="h-6 w-px bg-slate-600" />

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onExport(selectedResults)}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors text-sm font-medium"
                >
                  📊 Export
                </button>

                {/* Bulk Actions */}
                {bulkActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => onBulkUpdate(action.id, selectedResults)}
                    disabled={action.disabled}
                    className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
                  >
                    <span>{action.icon}</span>
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                ))}

                <button
                  onClick={onClearSelection}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Select all items</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Ctrl+A</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Export selected</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Ctrl+E</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Clear selection</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Ctrl+D</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Focus search</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Ctrl+/</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Cancel/Escape</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">Esc</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Show shortcuts</span>
                  <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">?</kbd>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 text-center">
                Pro tip: Use these shortcuts to work faster! 🚀
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
