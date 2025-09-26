#!/usr/bin/env node

/**
 * Test SimplePTFilter Logic with Real NUPCO Dataset
 * This script validates the enhanced PT detection against the user's 3,224 item dataset
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// PT Terms - Enhanced based on real NUPCO data analysis
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

function getPTConfidence(itemName, description = '', category = '') {
    const text = `${itemName} ${description} ${category}`.toLowerCase();
    
    // Check exclusions first (hard blockers)
    for (const exclude of excludeTerms) {
        if (text.includes(exclude.toLowerCase())) {
            return { isPT: false, confidence: 0, matches: [] };
        }
    }
    
    // Check PT inclusions with scoring
    let confidence = 0;
    const matches = [];
    
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
    if (category.toLowerCase().includes('equipment') || 
        category.toLowerCase().includes('mobility') ||
        category.toLowerCase().includes('therapy')) {
        confidence += 20;
    }
    
    confidence = Math.min(confidence, 100);
    return { isPT: confidence >= 45, confidence, matches };
}

function analyzeExcelFile(filePath) {
    console.log(`📁 Analyzing: ${path.basename(filePath)}`);
    
    try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length < 2) {
            console.log('❌ No data found in file');
            return;
        }
        
        // Find column indices (based on NUPCO format)
        const headers = data[0].map(h => String(h || '').toLowerCase());
        const nameCol = headers.findIndex(h => h === 'description'); // Column 7
        const modelCol = headers.findIndex(h => h === 'model'); // Column 12  
        const descCol = -1; // No separate description column
        const catCol = -1; // No category column
        
        if (nameCol === -1) {
            console.log('❌ Could not find item name column');
            return;
        }
        
        console.log(`📊 Found columns: Description(${nameCol}), Model(${modelCol})`);
        
        // Process items
        const results = {
            total: 0,
            ptItems: 0,
            highConfidence: 0,
            mediumConfidence: 0,
            avgConfidence: 0,
            samples: []
        };
        
        let totalConfidence = 0;
        
        for (let i = 1; i < Math.min(data.length, 2000); i++) { // Test up to 2000 items
            const row = data[i];
            if (!row || !row[nameCol]) continue;
            
            const itemName = String(row[nameCol] || '');
            const model = modelCol !== -1 ? String(row[modelCol] || '') : '';
            const description = model; // Use model as additional description
            const category = ''; // No category available
            
            const ptResult = getPTConfidence(itemName, description, category);
            results.total++;
            
            if (ptResult.isPT) {
                results.ptItems++;
                totalConfidence += ptResult.confidence;
                
                if (ptResult.confidence >= 70) {
                    results.highConfidence++;
                } else if (ptResult.confidence >= 45) {
                    results.mediumConfidence++;
                }
                
                // Collect samples for review
                if (results.samples.length < 10) {
                    results.samples.push({
                        name: itemName,
                        confidence: ptResult.confidence,
                        matches: ptResult.matches
                    });
                }
            }
        }
        
        results.avgConfidence = results.ptItems > 0 ? Math.round(totalConfidence / results.ptItems) : 0;
        
        // Display results
        console.log('\n📊 PT FILTER ANALYSIS RESULTS:');
        console.log('================================');
        console.log(`📈 Total Items Analyzed: ${results.total}`);
        console.log(`🎯 PT Items Found: ${results.ptItems} (${Math.round((results.ptItems/results.total)*100)}%)`);
        console.log(`🟢 High Confidence (70%+): ${results.highConfidence}`);
        console.log(`🟡 Medium Confidence (45-69%): ${results.mediumConfidence}`);
        console.log(`📊 Average Confidence: ${results.avgConfidence}%`);
        
        console.log('\n🔍 Sample PT Items Found:');
        results.samples.forEach((sample, i) => {
            console.log(`${i+1}. ${sample.name} (${sample.confidence}%) - [${sample.matches.slice(0,3).join(', ')}]`);
        });
        
    } catch (error) {
        console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
}

// Main execution
console.log('🚀 SimplePTFilter Validation Test');
console.log('==================================');

const xlsxDir = './xlxs-list-exampels-last-years';
if (!fs.existsSync(xlsxDir)) {
    console.log('❌ XLSX directory not found');
    process.exit(1);
}

const xlsxFiles = fs.readdirSync(xlsxDir)
    .filter(file => file.endsWith('.xlsx') && !file.includes(':Zone.Identifier'))
    .slice(0, 2); // Test first 2 files

if (xlsxFiles.length === 0) {
    console.log('❌ No XLSX files found');
    process.exit(1);
}

console.log(`📁 Found ${xlsxFiles.length} XLSX files to test\n`);

xlsxFiles.forEach(file => {
    analyzeExcelFile(path.join(xlsxDir, file));
    console.log('\n' + '='.repeat(50) + '\n');
});

console.log('✅ SimplePTFilter validation complete!');