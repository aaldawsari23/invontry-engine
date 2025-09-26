#!/usr/bin/env node

/**
 * Test PT Classification Service
 * Verify the integrated PT classification works properly
 */

import { PTClassificationService } from './services/ptClassification.js';

const ptClassifier = new PTClassificationService();

// Test items from actual NUPCO data
const testItems = [
    { itemName: 'WHEELCHAIR BARIATRIC', description: '', category: '' },
    { itemName: 'CHAIR STAIR', description: '', category: '' },
    { itemName: 'CHAIR RECLINER PROCEDURE ELECTRIC', description: '', category: '' },
    { itemName: 'WHEELCHAIR COMMODE 2 LARGE REAR WHEEL SIZE 12', description: '', category: '' },
    { itemName: 'AMBULANCE VEHICLE 4X4', description: '', category: '' },
    { itemName: 'VENTILATOR TRANSPORT ADULT AND PEDIATRIC', description: '', category: '' },
    { itemName: 'ULTRASOUND CARDIAC HANDHELD', description: '', category: '' },
    { itemName: 'EXERCISE BIKE STATIONARY', description: '', category: 'Exercise Equipment' },
    { itemName: 'TENS UNIT PORTABLE', description: 'Pain management device', category: 'Electrotherapy' }
];

console.log('🧪 Testing PT Classification Service');
console.log('===================================\n');

testItems.forEach((item, i) => {
    const result = ptClassifier.classifyItem(item.itemName, item.description, item.category);
    
    console.log(`Test ${i+1}: ${item.itemName}`);
    console.log(`  🎯 PT Relevant: ${result.isPT ? '✅ YES' : '❌ NO'}`);
    console.log(`  📊 Confidence: ${result.confidence}%`);
    console.log(`  📂 Category: ${result.category}`);
    console.log(`  📋 Subcategory: ${result.subcategory}`);
    console.log(`  🔍 Matches: [${result.matches.slice(0, 3).join(', ')}]`);
    console.log('');
});

// Test batch statistics
console.log('📊 Batch Statistics Test:');
console.log('========================');

const batchStats = ptClassifier.getBatchStatistics(testItems);
console.log(`📈 Total Items: ${batchStats.total}`);
console.log(`🎯 PT Items: ${batchStats.ptItems} (${Math.round((batchStats.ptItems/batchStats.total)*100)}%)`);
console.log(`🟢 High Confidence: ${batchStats.highConfidence}`);
console.log(`🟡 Medium Confidence: ${batchStats.mediumConfidence}`);
console.log(`📊 Average Confidence: ${batchStats.avgConfidence}%`);

console.log('\n📂 Category Breakdown:');
Object.entries(batchStats.categoryBreakdown).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} items`);
});

console.log('\n✅ PT Classification Service test complete!');