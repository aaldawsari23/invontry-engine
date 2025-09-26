import React, { useState, useMemo } from 'react';
import type { AnalysisResult } from '../types';

interface SimplePTFilterProps {
  results: AnalysisResult[];
  onFilteredResults: (filteredResults: AnalysisResult[]) => void;
  language?: 'en' | 'ar';
}

export const SimplePTFilter: React.FC<SimplePTFilterProps> = ({ 
  results, 
  onFilteredResults, 
  language = 'en' 
}) => {
  const [isFiltering, setIsFiltering] = useState(false);
  const [ptResults, setPtResults] = useState<AnalysisResult[] | null>(null);

  // Enhanced PT terms based on real NUPCO data analysis
  const ptTerms = new Set([
    // Mobility & ADL
    'wheelchair', 'walker', 'crutch', 'crutches', 'rollator', 'walking frame',
    'mobility aid', 'transfer board', 'standing frame', 'gait trainer', 'commode',
    
    // Exercise Equipment
    'treadmill', 'exercise bike', 'stationary bike', 'parallel bars', 'pulleys',
    'resistance band', 'theraband', 'exercise mat', 'balance pad', 'wobble board',
    'stability ball', 'swiss ball', 'medicine ball', 'weights', 'dumbbells',
    
    // Electrotherapy & Modalities
    'tens unit', 'electrical stimulation', 'e-stim', 'ultrasound therapy',
    'diathermy', 'interferential', 'galvanic', 'faradism', 'iontophoresis',
    'biofeedback', 'emg biofeedback', 'neuromuscular stimulation',
    
    // Thermal Therapy
    'hot pack', 'cold pack', 'ice pack', 'heat pack', 'paraffin bath',
    'whirlpool', 'hydrocollator', 'cryotherapy', 'thermotherapy',
    'infrared lamp', 'heat lamp',
    
    // Assessment Tools
    'goniometer', 'dynamometer', 'grip strength', 'pinch gauge',
    'posture grid', 'plumb line', 'inclinometer', 'monofilament',
    'reflex hammer', 'tuning fork', 'balance scale',
    
    // Manual Therapy
    'massage table', 'treatment table', 'plinth', 'adjustable table',
    'cervical pillow', 'lumbar roll', 'wedge', 'bolster',
    
    // Orthotic & Prosthetic
    'orthosis', 'brace', 'splint', 'ankle foot orthosis', 'afo',
    'knee brace', 'back brace', 'cervical collar', 'wrist splint',
    
    // PT-specific terms
    'physiotherapy', 'physical therapy', 'rehabilitation', 'rehab',
    'range of motion', 'rom', 'stretching', 'strengthening',
    'gait training', 'balance training', 'coordination', 'therapy',
    
    // Arabic PT terms (comprehensive)
    'علاج طبيعي', 'تأهيل', 'كرسي متحرك', 'مشاية', 'عكاز', 'عكازات',
    'تمارين', 'موجات فوق صوتية', 'تحفيز كهربائي', 'كمادة حارة', 'كمادة باردة',
    'جهاز مشي', 'دراجة تمارين', 'أشرطة مقاومة', 'ثيراباند', 'مساج',
    'طاولة علاج', 'جهاز قياس القوة', 'توازن', 'حركة', 'تقوية', 'علاج'
  ]);

  const excludeTerms = new Set([
    'surgical', 'surgery', 'operating', 'laboratory', 'lab test',
    'ct scanner', 'mri', 'x-ray', 'ultrasound diagnostic', 'mammography',
    'injection', 'tablet', 'capsule', 'syrup', 'antibiotic',
    'ventilator', 'defibrillator', 'dialysis', 'ambulance',
    'جراحة', 'مختبر', 'أشعة', 'دواء', 'حقنة'
  ]);

  const getPTConfidence = (item: AnalysisResult): { isPT: boolean; confidence: number; matches: string[] } => {
    const text = `${item.item_name} ${item.description || ''} ${item.PT_Category}`.toLowerCase();
    
    // Check exclusions first (hard blockers)
    for (const exclude of excludeTerms) {
      if (text.includes(exclude.toLowerCase())) {
        return { isPT: false, confidence: 0, matches: [] };
      }
    }
    
    // Check PT inclusions with scoring
    let confidence = 0;
    const matches: string[] = [];
    
    for (const term of ptTerms) {
      if (text.includes(term.toLowerCase())) {
        matches.push(term);
        // Higher score for more specific PT terms
        if (term.includes('wheelchair') || term.includes('therapy') || term.includes('rehabilitation')) {
          confidence += 40; // Strong PT indicators
        } else if (term.length > 15 || term.includes('exercise') || term.includes('treatment')) {
          confidence += 30; // Very specific terms
        } else if (term.length > 10 || term.includes('chair') || term.includes('mobility')) {
          confidence += 25; // Specific terms  
        } else {
          confidence += 15; // General terms
        }
      }
    }
    
    // Bonus for multiple matches
    if (matches.length > 1) confidence += matches.length * 5;
    
    // Category boost
    if (item.PT_Category.toLowerCase().includes('equipment') || 
        item.PT_Category.toLowerCase().includes('mobility') ||
        item.PT_Category.toLowerCase().includes('therapy')) {
      confidence += 20;
    }
    
    confidence = Math.min(confidence, 100);
    return { isPT: confidence >= 45, confidence, matches };
  };

  const isPTItem = (item: AnalysisResult): boolean => {
    // Use PT classification from analysis results if available
    if (item.pt_relevance) {
      return item.pt_relevance.isPT;
    }
    // Fallback to local classification
    return getPTConfidence(item).isPT;
  };

  const ptStats = useMemo(() => {
    // Use PT classification from analysis results if available, otherwise fallback to local classification
    const ptItems = results.map(item => {
      if (item.pt_relevance) {
        return {
          item,
          isPT: item.pt_relevance.isPT,
          confidence: item.pt_relevance.confidence,
          matches: item.pt_relevance.matches
        };
      } else {
        // Fallback to local classification for backward compatibility
        return { item, ...getPTConfidence(item) };
      }
    }).filter(result => result.isPT);
    
    const avgConfidence = ptItems.length > 0 
      ? ptItems.reduce((sum, r) => sum + r.confidence, 0) / ptItems.length 
      : 0;
    
    const highConfidence = ptItems.filter(r => r.confidence >= 70).length;
    const mediumConfidence = ptItems.filter(r => r.confidence >= 45 && r.confidence < 70).length;
    
    return {
      total: ptItems.length,
      avgConfidence: Math.round(avgConfidence),
      highConfidence,
      mediumConfidence
    };
  }, [results]);

  const handleQuickPTFilter = () => {
    setIsFiltering(true);
    
    setTimeout(() => {
      const filtered = results.filter(isPTItem);
      setPtResults(filtered);
      onFilteredResults(filtered);
      setIsFiltering(false);
    }, 100);
  };

  const handleClearFilter = () => {
    setPtResults(null);
    onFilteredResults(results);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-teal-400">
          🎯 {language === 'ar' ? 'مرشح العلاج الطبيعي الذكي' : 'Smart PT Filter'}
        </h3>
        <div className="text-sm text-slate-400">
          {language === 'ar' 
            ? `${ptStats.total} عنصر علاج طبيعي • ${ptStats.avgConfidence}% ثقة متوسطة`
            : `${ptStats.total} PT items • ${ptStats.avgConfidence}% avg confidence`}
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-700 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-white">{results.length}</div>
          <div className="text-xs text-slate-400">{language === 'ar' ? 'إجمالي' : 'Total'}</div>
        </div>
        <div className="bg-teal-900 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-teal-300">{ptStats.total}</div>
          <div className="text-xs text-teal-400">{language === 'ar' ? 'علاج طبيعي' : 'PT Items'}</div>
          <div className="text-xs text-teal-500 mt-1">
            {Math.round((ptStats.total / results.length) * 100)}%
          </div>
        </div>
        <div className="bg-green-900 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-green-300">{ptStats.highConfidence}</div>
          <div className="text-xs text-green-400">{language === 'ar' ? 'ثقة عالية (70%+)' : 'High Conf (70%+)'}</div>
        </div>
        <div className="bg-blue-900 p-3 rounded-lg text-center">
          <div className="text-xl font-bold text-blue-300">{ptResults?.length || 0}</div>
          <div className="text-xs text-blue-400">{language === 'ar' ? 'مفلتر حاليا' : 'Currently Filtered'}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleQuickPTFilter}
          disabled={isFiltering}
          className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {isFiltering ? (
            <>
              <span className="animate-spin">⚙️</span> {language === 'ar' ? 'جاري التصفية...' : 'Filtering...'}
            </>
          ) : (
            <>
              ⚡ {language === 'ar' ? 'تصفية سريعة للعلاج الطبيعي' : 'Quick PT Filter'}
            </>
          )}
        </button>
        
        {ptResults && (
          <button
            onClick={handleClearFilter}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            🔄 {language === 'ar' ? 'إظهار الكل' : 'Show All'}
          </button>
        )}
      </div>

      {/* Confidence Breakdown */}
      {ptStats.total > 0 && (
        <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
          <div className="text-sm text-slate-300 mb-3 font-medium">
            📊 {language === 'ar' ? 'تحليل الثقة' : 'Confidence Analysis'}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-900/30 p-2 rounded border border-green-600/30">
              <div className="text-lg font-bold text-green-300">{ptStats.highConfidence}</div>
              <div className="text-xs text-green-400">{language === 'ar' ? 'عالية 70%+' : 'High 70%+'}</div>
            </div>
            <div className="bg-yellow-900/30 p-2 rounded border border-yellow-600/30">
              <div className="text-lg font-bold text-yellow-300">{ptStats.mediumConfidence}</div>
              <div className="text-xs text-yellow-400">{language === 'ar' ? 'متوسطة 45-69%' : 'Medium 45-69%'}</div>
            </div>
            <div className="bg-slate-700/50 p-2 rounded border border-slate-500/30">
              <div className="text-lg font-bold text-slate-300">{ptStats.avgConfidence}%</div>
              <div className="text-xs text-slate-400">{language === 'ar' ? 'متوسط الثقة' : 'Avg Confidence'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Status */}
      {ptResults && (
        <div className="bg-teal-900/30 border border-teal-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-teal-300">
              🎯 {language === 'ar' 
                ? `تم العثور على ${ptResults.length} عنصر علاج طبيعي من ${results.length} عنصر`
                : `Found ${ptResults.length} PT items from ${results.length} total items`}
            </span>
            <span className="text-sm text-teal-400">
              {Math.round((ptResults.length / results.length) * 100)}% PT items
            </span>
          </div>
        </div>
      )}

    </div>
  );
};