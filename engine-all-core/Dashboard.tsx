
import React from 'react';
import { SummaryStats, FilterState, AnalysisResult } from '../types';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, DocumentTextIcon } from './Icons';
import { useTranslation } from './I18n';
import { SmartInsights } from './SmartInsights';

interface DashboardProps {
  summary: SummaryStats;
  results: AnalysisResult[];
  filters: FilterState;
  setFilters: (filters: FilterState | ((f: FilterState) => FilterState)) => void;
}

const StatCard: React.FC<{ 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string; 
    onClick?: () => void; 
    isActive?: boolean;
    gradient?: string;
}> = ({ title, value, icon, color, onClick, isActive, gradient }) => (
    <div 
        className={`
            bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700
            flex items-center space-x-4 transition-all duration-300 transform
            ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-slate-700 hover:to-slate-800' : ''} 
            ${isActive ? 'ring-2 ring-teal-400 shadow-lg shadow-teal-400/25 scale-105' : 'hover:shadow-md'}
        `} 
        onClick={onClick}
    >
        <div className={`p-4 rounded-xl ${gradient || color} hidden sm:block shadow-lg`}>
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">
                {value.toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
        </div>
        {isActive && (
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
        )}
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ summary, results, filters, setFilters }) => {
    const { t } = useTranslation();
    
    const handleDecisionFilter = (decision: 'All' | 'Accepted' | 'Review' | 'Rejected') => {
        setFilters(prev => ({ ...prev, decision: decision === 'All' ? 'All' : decision }));
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold text-white">{t('dashboard_title')}</h2>
                <div className="h-px bg-gradient-to-r from-teal-400 to-transparent flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard 
                    title="Total Items" 
                    value={summary.totalItems} 
                    icon={<DocumentTextIcon className="w-7 h-7 text-white"/>} 
                    gradient="bg-gradient-to-br from-blue-500 to-blue-600" 
                />
                <StatCard 
                    title="Accepted" 
                    value={summary.accepted} 
                    icon={<CheckCircleIcon className="w-7 h-7 text-white"/>} 
                    gradient="bg-gradient-to-br from-green-500 to-green-600" 
                    onClick={() => handleDecisionFilter('Accepted')} 
                    isActive={filters.decision === 'Accepted'}
                />
                <StatCard 
                    title="Review Required" 
                    value={summary.review} 
                    icon={<QuestionMarkCircleIcon className="w-7 h-7 text-white"/>} 
                    gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" 
                    onClick={() => handleDecisionFilter('Review')} 
                    isActive={filters.decision === 'Review'}
                />
                <StatCard 
                    title="Rejected" 
                    value={summary.rejected} 
                    icon={<XCircleIcon className="w-7 h-7 text-white"/>} 
                    gradient="bg-gradient-to-br from-red-500 to-red-600" 
                    onClick={() => handleDecisionFilter('Rejected')} 
                    isActive={filters.decision === 'Rejected'}
                />
            </div>
            
            {/* PT Classification Statistics */}
            {(() => {
                const ptStats = results.reduce((acc, item) => {
                    if (item.pt_relevance) {
                        if (item.pt_relevance.isPT) {
                            acc.ptItems++;
                            acc.totalConfidence += item.pt_relevance.confidence;
                            if (item.pt_relevance.confidence >= 70) acc.highConfidence++;
                            else if (item.pt_relevance.confidence >= 45) acc.mediumConfidence++;
                            
                            // Track categories
                            const cat = item.pt_relevance.smartCategory;
                            acc.categories[cat] = (acc.categories[cat] || 0) + 1;
                        }
                    }
                    return acc;
                }, { 
                    ptItems: 0, 
                    totalConfidence: 0, 
                    highConfidence: 0, 
                    mediumConfidence: 0,
                    categories: {} as Record<string, number>
                });
                
                const avgConfidence = ptStats.ptItems > 0 ? Math.round(ptStats.totalConfidence / ptStats.ptItems) : 0;
                const ptPercentage = results.length > 0 ? Math.round((ptStats.ptItems / results.length) * 100) : 0;
                
                return ptStats.ptItems > 0 ? (
                    <div className="bg-gradient-to-br from-teal-900/20 to-teal-800/20 border border-teal-600/30 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-bold text-teal-300">🎯 PT Classification Results</h3>
                            <div className="text-sm text-teal-400">
                                Powered by Smart Analysis Engine
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-teal-800/30 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-teal-300">{ptStats.ptItems}</div>
                                <div className="text-sm text-teal-400">PT Items Found</div>
                                <div className="text-xs text-teal-500">{ptPercentage}% of total</div>
                            </div>
                            <div className="bg-green-800/30 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-300">{ptStats.highConfidence}</div>
                                <div className="text-sm text-green-400">High Confidence</div>
                                <div className="text-xs text-green-500">70%+ accuracy</div>
                            </div>
                            <div className="bg-yellow-800/30 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-yellow-300">{ptStats.mediumConfidence}</div>
                                <div className="text-sm text-yellow-400">Medium Confidence</div>
                                <div className="text-xs text-yellow-500">45-69% accuracy</div>
                            </div>
                            <div className="bg-blue-800/30 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-300">{avgConfidence}%</div>
                                <div className="text-sm text-blue-400">Avg Confidence</div>
                                <div className="text-xs text-blue-500">Detection accuracy</div>
                            </div>
                        </div>
                        
                        {Object.keys(ptStats.categories).length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-teal-300 mb-3">📊 PT Categories Detected</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(ptStats.categories)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 6)
                                        .map(([category, count]) => (
                                        <div key={category} className="bg-slate-800/50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-200">{category}</span>
                                                <span className="text-teal-400 font-bold">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null;
            })()}
            
            {/* Smart Insights Section */}
            <SmartInsights results={results} summary={summary} />
        </div>
    );
};
