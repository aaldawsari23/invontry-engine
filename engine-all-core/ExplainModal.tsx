
import React from 'react';
import { AnalysisResult } from '../types';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AnalysisResult | null;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const { explanation } = item;
  const hits = explanation?.hits ?? [];
  const context = explanation?.context ?? [];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-white text-lg font-bold">Decision Analysis</h3>
            <p className="text-sm text-slate-400 truncate max-w-md">{item.item_name}</p>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Keyword Hits */}
          <div>
            <h4 className="font-semibold text-slate-300 mb-2">Keyword Matches</h4>
            <ul className="space-y-1 max-h-48 overflow-y-auto pr-2">
              {hits.length > 0 ? hits.map((h, i) => (
                <li key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                  <span className="text-slate-200 font-medium">{h.canonical}</span>
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{h.strategy} | Conf: {h.confidence.toFixed(2)}</span>
                </li>
              )) : <li className="text-slate-500 italic">No strong keywords matched.</li>}
            </ul>
          </div>

          {/* Contextual Scoring */}
          <div>
            <h4 className="font-semibold text-slate-300 mb-2">Contextual Adjustments</h4>
             <ul className="space-y-1 max-h-48 overflow-y-auto pr-2">
                {context.length > 1 ? context.map((c, i) => (
                    <li key={i} className={`flex items-start gap-2 p-2 rounded ${c.startsWith('[BLOCKER]') || c.startsWith('[DEMOTION]') ? 'bg-red-900/30' : 'bg-green-900/20'}`}>
                        <span className="text-lg flex-shrink-0">{c.startsWith('[BLOCKER]') || c.startsWith('[DEMOTION]') ? '−' : '+'}</span>
                        <span className="text-slate-300">{c}</span>
                    </li>
                )) : <li className="text-slate-500 italic">No specific context rules applied.</li>}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700 text-center">
            <p className="text-slate-400">Final Score: <b className="text-2xl font-bold text-white tabular-nums">{item.Score}</b></p>
            <p className="text-sm text-slate-300">{item.Decision_Reason}</p>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
        }
    `}</style>
    </div>
  );
};
