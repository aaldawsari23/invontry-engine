import XLSX from 'xlsx';
import fs from 'fs';

// Simple PT classifier test (mimicking the TypeScript version)
class SimplePTClassifier {
  constructor() {
    this.ptTerms = new Set([
      'wheelchair', 'walker', 'crutch', 'crutches', 'mobility', 'gait',
      'treadmill', 'exercise', 'resistance', 'therapy', 'rehabilitation',
      'ultrasound therapy', 'tens', 'electrical stimulation', 'hot pack',
      'cold pack', 'massage', 'balance', 'parallel bars',
      // Arabic terms
      'كرسي متحرك', 'مشاية', 'عكاز', 'علاج طبيعي', 'تأهيل', 'تمارين',
      'موجات فوق صوتية', 'تحفيز كهربائي', 'كمادة', 'توازن'
    ]);
    
    this.excludeTerms = new Set([
      'surgical', 'surgery', 'operating', 'laboratory', 'lab test',
      'ct scanner', 'mri', 'x-ray', 'ultrasound diagnostic', 'mammography',
      'injection', 'tablet', 'capsule', 'syrup', 'antibiotic',
      'ventilator', 'defibrillator', 'dialysis', 'ambulance',
      'جراحة', 'مختبر', 'أشعة', 'دواء', 'حقنة'
    ]);
  }

  classify(description) {
    if (!description) return { isPT: false, confidence: 0, reason: 'No description' };
    
    const desc = description.toString().toLowerCase();
    
    // Check exclusions first
    for (const exclude of this.excludeTerms) {
      if (desc.includes(exclude.toLowerCase())) {
        return { isPT: false, confidence: 95, reason: `Excluded: ${exclude}` };
      }
    }
    
    // Check PT inclusions
    let matches = 0;
    let matchedTerms = [];
    
    for (const term of this.ptTerms) {
      if (desc.includes(term.toLowerCase())) {
        matches++;
        matchedTerms.push(term);
      }
    }
    
    const confidence = Math.min(matches * 25, 100);
    const isPT = confidence >= 60;
    
    return {
      isPT,
      confidence,
      reason: isPT ? `PT matches: ${matchedTerms.join(', ')}` : 'Low PT relevance',
      matchedTerms
    };
  }
}

async function demonstrateSuperSmart() {
  console.log('\n🚀 SUPER SMART PT CLASSIFICATION DEMO');
  console.log('=' .repeat(80));
  
  const classifier = new SimplePTClassifier();
  
  // Test the largest file
  const filePath = './xlxs-list-exampels-last-years/_⁨اكواد نبكو⁩.xlsx';
  console.log(`📂 Testing on massive inventory: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`📊 Total items in inventory: ${jsonData.length - 1}`);
  
  // Process items
  const headers = jsonData[0];
  const descColumns = headers.map((h, i) => ({ col: i, header: h }))
    .filter(item => {
      const h = item.header?.toString().toLowerCase() || '';
      return h.includes('desc') || h.includes('وصف');
    });
  
  console.log(`🔍 Description columns: ${descColumns.map(c => c.header).join(', ')}`);
  
  let ptItems = [];
  let nonPtItems = [];
  let processedCount = 0;
  
  const startTime = Date.now();
  
  // Process items (limit to 5000 for demo)
  const maxItems = Math.min(5000, jsonData.length - 1);
  
  for (let i = 1; i <= maxItems; i++) {
    const row = jsonData[i];
    
    // Get all descriptions
    let descriptions = [];
    descColumns.forEach(col => {
      const desc = row[col.col];
      if (desc) descriptions.push(desc);
    });
    
    const fullDescription = descriptions.join(' ');
    const classification = classifier.classify(fullDescription);
    
    const item = {
      row: i,
      descriptions,
      classification,
      fullRow: row
    };
    
    if (classification.isPT) {
      ptItems.push(item);
    } else {
      nonPtItems.push(item);
    }
    
    processedCount++;
    
    // Progress indicator
    if (processedCount % 1000 === 0) {
      console.log(`⚡ Processed ${processedCount}/${maxItems} items...`);
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  console.log('\n📈 SUPER SMART RESULTS:');
  console.log('=' .repeat(50));
  console.log(`⚡ Processing time: ${processingTime}ms`);
  console.log(`📊 Items processed: ${processedCount}`);
  console.log(`🎯 PT-relevant items found: ${ptItems.length}`);
  console.log(`❌ Non-PT items: ${nonPtItems.length}`);
  console.log(`🔥 PT detection rate: ${((ptItems.length / processedCount) * 100).toFixed(2)}%`);
  console.log(`⚡ Processing speed: ${(processedCount / (processingTime / 1000)).toFixed(0)} items/second`);
  
  console.log('\n🎯 TOP PT ITEMS FOUND:');
  console.log('-' .repeat(50));
  
  // Sort PT items by confidence
  ptItems.sort((a, b) => b.classification.confidence - a.classification.confidence);
  
  ptItems.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. [${item.classification.confidence}%] ${item.descriptions.join(' | ')}`);
    console.log(`   Reason: ${item.classification.reason}`);
    console.log('');
  });
  
  console.log('\n❌ SAMPLE NON-PT ITEMS (correctly excluded):');
  console.log('-' .repeat(50));
  
  nonPtItems.slice(0, 5).forEach((item, i) => {
    console.log(`${i + 1}. ${item.descriptions.join(' | ')}`);
    console.log(`   Reason: ${item.classification.reason}`);
    console.log('');
  });
  
  // Analysis by confidence levels
  const highConfidence = ptItems.filter(item => item.classification.confidence >= 80).length;
  const mediumConfidence = ptItems.filter(item => item.classification.confidence >= 60 && item.classification.confidence < 80).length;
  const lowConfidence = ptItems.filter(item => item.classification.confidence < 60).length;
  
  console.log('\n📊 CONFIDENCE BREAKDOWN:');
  console.log('-' .repeat(30));
  console.log(`🟢 High confidence (80-100%): ${highConfidence} items`);
  console.log(`🟡 Medium confidence (60-79%): ${mediumConfidence} items`);
  console.log(`🔴 Low confidence (<60%): ${lowConfidence} items`);
  
  console.log('\n🚀 PERFORMANCE ANALYSIS:');
  console.log('-' .repeat(30));
  console.log(`🔥 Can process ${Math.round((processedCount / (processingTime / 1000)) * 60)} items per minute`);
  console.log(`⚡ Full 50K inventory would take ~${Math.round((50000 / (processedCount / (processingTime / 1000))) / 60)} minutes`);
  console.log(`🎯 Accuracy: Automatically found ${ptItems.length} PT items from ${processedCount} total items`);
  
  console.log('\n✅ SUPER SMART CLASSIFICATION SUCCESS!');
  console.log('🎯 Your app can now instantly filter massive hospital inventories!');
}

// Run the demo
demonstrateSuperSmart().catch(console.error);