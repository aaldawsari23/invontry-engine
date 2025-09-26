import React, { useMemo } from 'react';
import { AnalysisResult, SummaryStats } from '../types';
import { AnimatedCard } from './AnimatedCard';

interface SmartInsightsProps {
  results: AnalysisResult[];
  summary: SummaryStats;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  value?: string | number;
  action?: string;
  icon: string;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ results, summary }) => {
  const insights = useMemo<Insight[]>(() => {
    const insights: Insight[] = [];

    // Acceptance rate analysis
    const acceptanceRate = (summary.accepted / summary.totalItems) * 100;
    if (acceptanceRate > 80) {
      insights.push({
        type: 'success',
        title: 'High Quality Inventory',
        description: `${acceptanceRate.toFixed(1)}% of items meet PT requirements`,
        value: `${acceptanceRate.toFixed(1)}%`,
        icon: '✅'
      });
    } else if (acceptanceRate < 40) {
      insights.push({
        type: 'error',
        title: 'Quality Concerns',
        description: 'Many items may not be suitable for physiotherapy',
        value: `${acceptanceRate.toFixed(1)}%`,
        action: 'Review inventory sourcing',
        icon: '⚠️'
      });
    }

    // Manufacturer analysis
    const manufacturerCount = new Set(results.map(r => r.manufacturer).filter(Boolean)).size;
    const topManufacturers = results
      .filter(r => r.manufacturer)
      .reduce((acc, r) => {
        acc[r.manufacturer!] = (acc[r.manufacturer!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topManufacturer = Object.entries(topManufacturers)
      .sort(([, a], [, b]) => b - a)[0];

    if (topManufacturer) {
      const dominance = (topManufacturer[1] / results.length) * 100;
      if (dominance > 60) {
        insights.push({
          type: 'warning',
          title: 'Vendor Concentration Risk',
          description: `${topManufacturer[0]} represents ${dominance.toFixed(1)}% of inventory`,
          action: 'Consider diversifying suppliers',
          icon: '🏭'
        });
      } else {
        insights.push({
          type: 'success',
          title: 'Diversified Supply Chain',
          description: `${manufacturerCount} manufacturers represented`,
          value: manufacturerCount.toString(),
          icon: '🌐'
        });
      }
    }

    // Score distribution analysis
    const highScores = results.filter(r => r.Score > 75).length;
    const lowScores = results.filter(r => r.Score < 25).length;
    
    if (lowScores > summary.totalItems * 0.3) {
      insights.push({
        type: 'warning',
        title: 'Score Distribution Issue',
        description: `${lowScores} items have very low PT relevance scores`,
        action: 'Review matching criteria',
        icon: '📊'
      });
    }

    // Category analysis
    const categories = Object.entries(summary.categoryCounts);
    const dominantCategory = categories.sort(([, a], [, b]) => b - a)[0];
    
    if (dominantCategory && (dominantCategory[1] / summary.totalItems) > 0.5) {
      insights.push({
        type: 'info',
        title: 'Category Focus',
        description: `${dominantCategory[0]} is your primary category`,
        value: `${dominantCategory[1]} items`,
        icon: '📂'
      });
    }

    // Review backlog
    if (summary.review > summary.totalItems * 0.4) {
      insights.push({
        type: 'warning',
        title: 'Large Review Backlog',
        description: `${summary.review} items require manual review`,
        action: 'Prioritize review workflow',
        icon: '📋'
      });
    }

    // Language diversity
    const languages = results.reduce((acc, r) => {
      acc[r.language] = (acc[r.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(languages).length > 1) {
      insights.push({
        type: 'info',
        title: 'Multi-Language Inventory',
        description: 'Items detected in multiple languages',
        value: `${Object.keys(languages).length} languages`,
        icon: '🌍'
      });
    }

    return insights;
  }, [results, summary]);

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      case 'info': return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getTextColor = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
    }
  };

  if (insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span>🧠</span> Smart Insights
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <AnimatedCard
            key={`${insight.title}-${index}`}
            delay={index * 100}
            animationType="slide"
            className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)} backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm truncate">
                    {insight.title}
                  </h4>
                  {insight.value && (
                    <span className={`text-lg font-bold ${getTextColor(insight.type)}`}>
                      {insight.value}
                    </span>
                  )}
                </div>
                
                <p className="text-slate-300 text-xs mb-2 leading-relaxed">
                  {insight.description}
                </p>
                
                {insight.action && (
                  <div className={`text-xs ${getTextColor(insight.type)} font-medium`}>
                    💡 {insight.action}
                  </div>
                )}
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
};