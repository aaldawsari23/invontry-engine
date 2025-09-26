import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisResult } from '../types';

// Quick action shortcuts
export const QuickActions: React.FC<{
  selectedItems: AnalysisResult[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onExportSelected: () => void;
  onClearSelection: () => void;
}> = ({ selectedItems, onAcceptAll, onRejectAll, onExportSelected, onClearSelection }) => {
  if (selectedItems.length === 0) return null;

  const acceptableItems = selectedItems.filter(item => item.Decision !== 'Accepted').length;
  const rejectableItems = selectedItems.filter(item => item.Decision !== 'Rejected').length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-white">Quick Actions</h3>
        <span className="text-sm text-slate-400">{selectedItems.length} items selected</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {acceptableItems > 0 && (
          <button
            onClick={onAcceptAll}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition-colors flex items-center gap-1"
          >
            ✅ Accept All ({acceptableItems})
          </button>
        )}
        
        {rejectableItems > 0 && (
          <button
            onClick={onRejectAll}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 transition-colors flex items-center gap-1"
          >
            ❌ Reject All ({rejectableItems})
          </button>
        )}
        
        <button
          onClick={onExportSelected}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-1"
        >
          📊 Export Selected
        </button>
        
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition-colors"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};

// Smart suggestions based on user behavior
export const SmartSuggestions: React.FC<{
  results: AnalysisResult[];
  userActions: Array<{ action: string; itemId: string; timestamp: number }>;
}> = ({ results, userActions }) => {
  const [suggestions, setSuggestions] = useState<Array<{
    type: 'pattern' | 'optimization' | 'warning';
    message: string;
    action?: () => void;
    actionLabel?: string;
  }>>([]);

  useEffect(() => {
    const generateSuggestions = () => {
      const newSuggestions: typeof suggestions = [];
      
      // Analyze user patterns
      const recentActions = userActions.filter(action => 
        Date.now() - action.timestamp < 5 * 60 * 1000 // Last 5 minutes
      );

      // Pattern: User accepting many items from same manufacturer
      const acceptedManufacturers = new Map<string, number>();
      recentActions.forEach(action => {
        if (action.action === 'accept') {
          const item = results.find(r => r.id === action.itemId);
          if (item?.manufacturer) {
            acceptedManufacturers.set(
              item.manufacturer, 
              (acceptedManufacturers.get(item.manufacturer) || 0) + 1
            );
          }
        }
      });

      acceptedManufacturers.forEach((count, manufacturer) => {
        if (count >= 3) {
          const pendingItems = results.filter(r => 
            r.manufacturer === manufacturer && 
            r.Decision !== 'Accepted' && 
            r.Decision !== 'Rejected'
          );
          
          if (pendingItems.length > 0) {
            newSuggestions.push({
              type: 'pattern',
              message: `You've accepted ${count} items from ${manufacturer}. Accept ${pendingItems.length} more?`,
              actionLabel: `Accept all ${manufacturer} items`,
              action: () => {
                // Bulk accept functionality would go here
                console.log('Bulk accepting items from', manufacturer);
              }
            });
          }
        }
      });

      // Optimization suggestion: Items with high scores not yet reviewed
      const highScoreUnreviewed = results.filter(r => 
        r.Score > 75 && r.Decision === 'Review'
      );
      
      if (highScoreUnreviewed.length > 5) {
        newSuggestions.push({
          type: 'optimization',
          message: `${highScoreUnreviewed.length} high-scoring items (>75) are pending review. These likely qualify for acceptance.`,
          actionLabel: 'Review high-score items',
          action: () => {
            // Filter to show only high-score items
            console.log('Filtering to high-score items');
          }
        });
      }

      // Warning: Many rejections might indicate filter issues
      const recentRejections = recentActions.filter(a => a.action === 'reject').length;
      if (recentRejections > 10) {
        newSuggestions.push({
          type: 'warning',
          message: `You've rejected ${recentRejections} items recently. Consider adjusting your filters to save time.`,
          actionLabel: 'Adjust filters',
          action: () => {
            // Scroll to filters section
            document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }

      setSuggestions(newSuggestions);
    };

    generateSuggestions();
  }, [results, userActions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-white flex items-center gap-2">
        💡 Smart Suggestions
      </h3>
      
      {suggestions.map((suggestion, index) => {
        const bgColor = {
          pattern: 'bg-blue-500/10 border-blue-500/30',
          optimization: 'bg-green-500/10 border-green-500/30',
          warning: 'bg-yellow-500/10 border-yellow-500/30'
        }[suggestion.type];

        const textColor = {
          pattern: 'text-blue-400',
          optimization: 'text-green-400',
          warning: 'text-yellow-400'
        }[suggestion.type];

        return (
          <div key={index} className={`${bgColor} border rounded-lg p-4`}>
            <p className="text-slate-300 text-sm mb-2">{suggestion.message}</p>
            {suggestion.action && (
              <button
                onClick={suggestion.action}
                className={`px-3 py-1.5 ${textColor} text-sm rounded-lg hover:bg-current/10 transition-colors border border-current/30`}
              >
                {suggestion.actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Session progress tracker
export const SessionProgress: React.FC<{
  totalItems: number;
  processedItems: number;
  sessionStartTime: number;
}> = ({ totalItems, processedItems, sessionStartTime }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - sessionStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const progressPercentage = (processedItems / totalItems) * 100;
  const itemsPerMinute = processedItems / (timeElapsed / 60000);
  const estimatedTimeRemaining = (totalItems - processedItems) / itemsPerMinute;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-white">Session Progress</h3>
        <span className="text-sm text-slate-400">
          {processedItems} / {totalItems} items
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
        <div 
          className="bg-teal-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">Time Elapsed</span>
          <div className="font-mono text-white">{formatTime(timeElapsed)}</div>
        </div>
        
        <div>
          <span className="text-slate-400">Items/min</span>
          <div className="font-mono text-white">{itemsPerMinute.toFixed(1)}</div>
        </div>
        
        {isFinite(estimatedTimeRemaining) && estimatedTimeRemaining > 0 && (
          <>
            <div>
              <span className="text-slate-400">Est. Remaining</span>
              <div className="font-mono text-white">{formatTime(estimatedTimeRemaining * 60000)}</div>
            </div>
            
            <div>
              <span className="text-slate-400">Progress</span>
              <div className="font-mono text-white">{progressPercentage.toFixed(1)}%</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Batch processing wizard
export const BatchProcessingWizard: React.FC<{
  items: AnalysisResult[];
  onProcess: (criteria: BatchCriteria) => void;
}> = ({ items, onProcess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [criteria, setCriteria] = useState<BatchCriteria>({
    scoreThreshold: 50,
    categories: [],
    manufacturers: [],
    action: 'accept'
  });

  const availableCategories = [...new Set(items.map(item => item.PT_Category))];
  const availableManufacturers = [...new Set(items.map(item => item.manufacturer).filter(Boolean))];

  const getMatchingItems = () => {
    return items.filter(item => {
      if (item.Score < criteria.scoreThreshold) return false;
      if (criteria.categories.length > 0 && !criteria.categories.includes(item.PT_Category)) return false;
      if (criteria.manufacturers.length > 0 && item.manufacturer && !criteria.manufacturers.includes(item.manufacturer)) return false;
      return true;
    });
  };

  const matchingItems = getMatchingItems();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2"
      >
        🚀 Batch Process
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            Batch Processing Wizard - Step {step}/3
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 1 && (
            <div>
              <h3 className="font-medium text-white mb-3">Set Score Threshold</h3>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">
                  Minimum Score: {criteria.scoreThreshold}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criteria.scoreThreshold}
                  onChange={(e) => setCriteria({...criteria, scoreThreshold: parseInt(e.target.value)})}
                  className="w-full"
                />
                <p className="text-xs text-slate-400">
                  Items with scores below this threshold will be excluded
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white mb-3">Filter by Categories (Optional)</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableCategories.map(category => (
                    <label key={category} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCriteria({...criteria, categories: [...criteria.categories, category]});
                          } else {
                            setCriteria({...criteria, categories: criteria.categories.filter(c => c !== category)});
                          }
                        }}
                      />
                      <span className="text-slate-300">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-white mb-3">Filter by Manufacturers (Optional)</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableManufacturers.map(manufacturer => (
                    <label key={manufacturer} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.manufacturers.includes(manufacturer)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCriteria({...criteria, manufacturers: [...criteria.manufacturers, manufacturer]});
                          } else {
                            setCriteria({...criteria, manufacturers: criteria.manufacturers.filter(m => m !== manufacturer)});
                          }
                        }}
                      />
                      <span className="text-slate-300">{manufacturer}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-medium text-white mb-3">Choose Action</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="accept"
                    checked={criteria.action === 'accept'}
                    onChange={(e) => setCriteria({...criteria, action: e.target.value as any})}
                  />
                  <span className="text-green-400">Accept all matching items</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="review"
                    checked={criteria.action === 'review'}
                    onChange={(e) => setCriteria({...criteria, action: e.target.value as any})}
                  />
                  <span className="text-yellow-400">Mark for review</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="reject"
                    checked={criteria.action === 'reject'}
                    onChange={(e) => setCriteria({...criteria, action: e.target.value as any})}
                  />
                  <span className="text-red-400">Reject all matching items</span>
                </label>
              </div>

              <div className="mt-4 p-3 bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-300">
                  <strong>{matchingItems.length}</strong> items match your criteria and will be processed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-slate-700">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setIsOpen(false)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                onProcess(criteria);
                setIsOpen(false);
                setStep(1);
              }
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
          >
            {step === 3 ? `Process ${matchingItems.length} Items` : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface BatchCriteria {
  scoreThreshold: number;
  categories: string[];
  manufacturers: string[];
  action: 'accept' | 'review' | 'reject';
}