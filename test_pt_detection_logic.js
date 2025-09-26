#!/usr/bin/env node

// Test the PT detection logic directly
const ptTerms = new Set([
    'wheelchair', 'wheel chair', 'walker', 'crutch', 'crutches', 'rollator', 'walking frame',
    'mobility aid', 'transfer board', 'standing frame', 'gait trainer', 'commode',
    'chair stair', 'stair chair', 'patient lift', 'hoist', 'transfer aid',
    'chair', 'recliner', 'bariatric'
]);

const excludeTerms = new Set([
    'surgical', 'surgery', 'operating', 'laboratory', 'lab test',
    'ct scanner', 'mri', 'x-ray', 'ultrasound diagnostic', 'mammography',
    'injection', 'tablet', 'capsule', 'syrup', 'antibiotic',
    'ventilator', 'defibrillator', 'dialysis', 'ambulance'
]);

function getPTConfidence(itemName, description = '', category = '') {
    const text = `${itemName} ${description} ${category}`.toLowerCase();
    console.log(`Testing: "${text}"`);
    
    // Check exclusions first (hard blockers)
    for (const exclude of excludeTerms) {
        if (text.includes(exclude.toLowerCase())) {
            console.log(`  ❌ Excluded by: ${exclude}`);
            return { isPT: false, confidence: 0, matches: [] };
        }
    }
    
    // Check PT inclusions with scoring
    let confidence = 0;
    const matches = [];
    
    for (const term of ptTerms) {
        if (text.includes(term.toLowerCase())) {
            matches.push(term);
            console.log(`  ✅ Matched: ${term}`);
            // Higher score for more specific terms
            if (term.length > 15) confidence += 25; // Very specific terms
            else if (term.length > 10) confidence += 15; // Specific terms  
            else confidence += 10; // General terms
        }
    }
    
    // Bonus for multiple matches
    if (matches.length > 1) confidence += matches.length * 5;
    
    // Category boost
    if (category.toLowerCase().includes('equipment') || 
        category.toLowerCase().includes('mobility') ||
        category.toLowerCase().includes('therapy')) {
        confidence += 20;
    }
    
    confidence = Math.min(confidence, 100);
    console.log(`  📊 Final: isPT=${confidence >= 60}, confidence=${confidence}%, matches=[${matches.join(', ')}]`);
    return { isPT: confidence >= 60, confidence, matches };
}

// Test with actual NUPCO items
const testItems = [
    'CHAIR STAIR',
    'WHEELCHAIR BARIATRIC',
    'CHAIR RECLINER PROCEDURE ELECTRIC',
    'CHAIR RECLINER MANUAL',
    'WHEELCHAIR COMMODE 2 LARGE REAR WHEEL SIZE 12',
    'AMBULANCE VEHICLE 4X4',
    'VENTILATOR TRANSPORT ADULT AND PEDIATRIC',
    'ULTRASOUND CARDIAC HANDHELD'
];

console.log('🧪 Testing PT Detection Logic');
console.log('==============================\n');

testItems.forEach((item, i) => {
    console.log(`Test ${i+1}: ${item}`);
    const result = getPTConfidence(item);
    console.log('');
});