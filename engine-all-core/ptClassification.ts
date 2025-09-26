/**
 * PT Classification Service
 * Provides PT relevance scoring and classification for items during analysis
 */

export interface PTClassificationResult {
  isPT: boolean;
  confidence: number;
  matches: string[];
  category: string;
  subcategory: string;
}

// Enhanced PT terms based on real NUPCO data analysis
const ptTerms = new Set([
  // Mobility & ADL
  'wheelchair', 'wheel chair', 'walker', 'crutch', 'crutches', 'rollator', 'walking frame',
  'mobility aid', 'transfer board', 'standing frame', 'gait trainer', 'commode',
  'chair stair', 'stair chair', 'patient lift', 'hoist', 'transfer aid',
  
  // Exercise Equipment
  'treadmill', 'exercise bike', 'stationary bike', 'parallel bars', 'pulleys',
  'resistance band', 'theraband', 'exercise mat', 'balance pad', 'wobble board',
  'stability ball', 'swiss ball', 'medicine ball', 'weights', 'dumbbells',
  'pedal exerciser', 'exercise equipment', 'training bike',
  
  // Electrotherapy & Modalities
  'tens unit', 'electrical stimulation', 'e-stim', 'ultrasound therapy',
  'diathermy', 'interferential', 'galvanic', 'faradism', 'iontophoresis',
  'biofeedback', 'emg biofeedback', 'neuromuscular stimulation',
  'electrotherapy', 'muscle stimulator', 'nerve stimulator',
  
  // Thermal Therapy
  'hot pack', 'cold pack', 'ice pack', 'heat pack', 'paraffin bath',
  'whirlpool', 'hydrocollator', 'cryotherapy', 'thermotherapy',
  'infrared lamp', 'heat lamp', 'warming unit', 'cooling unit',
  
  // Assessment Tools
  'goniometer', 'dynamometer', 'grip strength', 'pinch gauge',
  'posture grid', 'plumb line', 'inclinometer', 'monofilament',
  'reflex hammer', 'tuning fork', 'balance scale', 'force gauge',
  'pressure biofeedback', 'spirometer', 'peak flow meter',
  
  // Manual Therapy
  'massage table', 'treatment table', 'plinth', 'adjustable table',
  'cervical pillow', 'lumbar roll', 'wedge', 'bolster', 'therapy table',
  'treatment bed', 'examination table', 'positioning aids',
  
  // Orthotic & Prosthetic
  'orthosis', 'brace', 'splint', 'ankle foot orthosis', 'afo',
  'knee brace', 'back brace', 'cervical collar', 'wrist splint',
  'support belt', 'compression garment', 'elastic bandage',
  
  // PT-specific terms
  'physiotherapy', 'physical therapy', 'rehabilitation', 'rehab',
  'range of motion', 'rom', 'stretching', 'strengthening',
  'gait training', 'balance training', 'coordination', 'therapy',
  'rehabilitation equipment', 'therapeutic device', 'recovery aid',
  
  // Medical terms that could be PT-relevant
  'posture', 'balance', 'coordination', 'mobility', 'ambulation',
  'exercise', 'training', 'therapeutic', 'rehabilitation', 'recovery',
  'joint', 'muscle', 'strength', 'flexibility', 'movement',
  
  // Arabic PT terms
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

// PT category mapping based on matched terms
const ptCategoryMapping: Record<string, { category: string; subcategory: string }> = {
  // Mobility
  'wheelchair': { category: 'Mobility Aids', subcategory: 'Wheelchairs' },
  'walker': { category: 'Mobility Aids', subcategory: 'Walking Aids' },
  'crutch': { category: 'Mobility Aids', subcategory: 'Walking Aids' },
  'crutches': { category: 'Mobility Aids', subcategory: 'Walking Aids' },
  'rollator': { category: 'Mobility Aids', subcategory: 'Walking Aids' },
  'chair stair': { category: 'Transfer Equipment', subcategory: 'Patient Transfer' },
  
  // Exercise Equipment
  'treadmill': { category: 'Exercise Equipment', subcategory: 'Cardio Equipment' },
  'exercise bike': { category: 'Exercise Equipment', subcategory: 'Cardio Equipment' },
  'resistance band': { category: 'Exercise Equipment', subcategory: 'Strength Training' },
  'theraband': { category: 'Exercise Equipment', subcategory: 'Strength Training' },
  'balance pad': { category: 'Exercise Equipment', subcategory: 'Balance Training' },
  
  // Electrotherapy
  'tens unit': { category: 'Electrotherapy', subcategory: 'Pain Management' },
  'electrical stimulation': { category: 'Electrotherapy', subcategory: 'Muscle Stimulation' },
  'ultrasound therapy': { category: 'Modalities', subcategory: 'Therapeutic Ultrasound' },
  
  // Assessment Tools
  'goniometer': { category: 'Assessment Tools', subcategory: 'Range of Motion' },
  'dynamometer': { category: 'Assessment Tools', subcategory: 'Strength Testing' },
  'grip strength': { category: 'Assessment Tools', subcategory: 'Strength Testing' },
  
  // Manual Therapy
  'massage table': { category: 'Treatment Tables', subcategory: 'Manual Therapy' },
  'treatment table': { category: 'Treatment Tables', subcategory: 'Manual Therapy' },
  
  // Orthotics
  'brace': { category: 'Orthotics & Prosthetics', subcategory: 'Braces' },
  'splint': { category: 'Orthotics & Prosthetics', subcategory: 'Splints' },
  'orthosis': { category: 'Orthotics & Prosthetics', subcategory: 'Orthoses' }
};

export class PTClassificationService {
  /**
   * Classify an item for PT relevance
   */
  public classifyItem(itemName: string, description = '', category = ''): PTClassificationResult {
    const text = `${itemName} ${description} ${category}`.toLowerCase();
    
    // Check exclusions first (hard blockers)
    for (const exclude of excludeTerms) {
      if (text.includes(exclude.toLowerCase())) {
        return {
          isPT: false,
          confidence: 0,
          matches: [],
          category: 'Not PT-Related',
          subcategory: 'Excluded'
        };
      }
    }
    
    // Check PT inclusions with scoring
    let confidence = 0;
    const matches: string[] = [];
    let ptCategory = 'PT Equipment';
    let ptSubcategory = 'General';
    
    for (const term of ptTerms) {
      if (text.includes(term.toLowerCase())) {
        matches.push(term);
        
        // Scoring based on PT relevance
        if (term.includes('wheelchair') || term.includes('therapy') || term.includes('rehabilitation')) {
          confidence += 40; // Strong PT indicators
        } else if (term.length > 15 || term.includes('exercise') || term.includes('treatment')) {
          confidence += 30; // Very specific terms
        } else if (term.length > 10 || term.includes('chair') || term.includes('mobility')) {
          confidence += 25; // Specific terms  
        } else {
          confidence += 15; // General terms
        }
        
        // Set category based on first matched term with mapping
        if (ptCategoryMapping[term] && ptCategory === 'PT Equipment') {
          ptCategory = ptCategoryMapping[term].category;
          ptSubcategory = ptCategoryMapping[term].subcategory;
        }
      }
    }
    
    // Bonus for multiple matches
    if (matches.length > 1) {
      confidence += matches.length * 5;
    }
    
    // Category boost
    if (category.toLowerCase().includes('equipment') || 
        category.toLowerCase().includes('mobility') ||
        category.toLowerCase().includes('therapy')) {
      confidence += 20;
    }
    
    confidence = Math.min(confidence, 100);
    
    return {
      isPT: confidence >= 45,
      confidence,
      matches,
      category: confidence >= 45 ? ptCategory : 'Not PT-Related',
      subcategory: confidence >= 45 ? ptSubcategory : 'Non-PT'
    };
  }
  
  /**
   * Get PT statistics for a batch of items
   */
  public getBatchStatistics(items: Array<{ itemName: string; description?: string; category?: string }>): {
    total: number;
    ptItems: number;
    highConfidence: number;
    mediumConfidence: number;
    avgConfidence: number;
    categoryBreakdown: Record<string, number>;
  } {
    const results = items.map(item => 
      this.classifyItem(item.itemName, item.description, item.category)
    );
    
    const ptResults = results.filter(r => r.isPT);
    const avgConfidence = ptResults.length > 0 
      ? Math.round(ptResults.reduce((sum, r) => sum + r.confidence, 0) / ptResults.length)
      : 0;
    
    const highConfidence = ptResults.filter(r => r.confidence >= 70).length;
    const mediumConfidence = ptResults.filter(r => r.confidence >= 45 && r.confidence < 70).length;
    
    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    ptResults.forEach(result => {
      categoryBreakdown[result.category] = (categoryBreakdown[result.category] || 0) + 1;
    });
    
    return {
      total: items.length,
      ptItems: ptResults.length,
      highConfidence,
      mediumConfidence,
      avgConfidence,
      categoryBreakdown
    };
  }
}