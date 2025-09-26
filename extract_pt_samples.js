import XLSX from 'xlsx';
import fs from 'fs';

// PT-related keywords to look for
const ptKeywords = [
    // Equipment
    'wheelchair', 'walker', 'crutch', 'parallel bars', 'treadmill', 'exercise', 'rehabilitation', 'physio',
    'ultrasound therapy', 'tens', 'electrical stimulation', 'heat pack', 'cold pack', 'massage',
    'gait trainer', 'balance', 'range of motion', 'strength', 'mobility', 'therapy',
    
    // Arabic PT terms  
    'كرسي متحرك', 'مشاية', 'عكاز', 'علاج طبيعي', 'تأهيل', 'تمارين', 'موجات فوق صوتية',
    'تحفيز كهربائي', 'كمادة', 'مساج', 'توازن', 'قوة', 'حركة', 'علاج'
];

function isPotentiallyPT(description) {
    if (!description) return false;
    const desc = description.toString().toLowerCase();
    return ptKeywords.some(keyword => desc.includes(keyword.toLowerCase()));
}

function extractPTSamples(filePath, maxSamples = 50) {
    console.log(`\n=== Extracting PT samples from: ${filePath} ===`);
    
    const workbook = XLSX.readFile(filePath);
    const results = [];
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) return;
        
        const headers = jsonData[0];
        console.log(`\nSheet: ${sheetName}`);
        console.log(`Headers: ${headers.join(' | ')}`);
        
        // Find description columns
        const descCols = headers.map((h, i) => ({ col: i, header: h }))
            .filter(item => {
                const h = item.header?.toString().toLowerCase() || '';
                return h.includes('desc') || h.includes('وصف') || h.includes('item') || h.includes('product');
            });
        
        console.log(`Description columns found: ${descCols.map(c => c.header).join(', ')}`);
        
        let ptCount = 0;
        let nonPtCount = 0;
        
        for (let i = 1; i < jsonData.length && results.length < maxSamples; i++) {
            const row = jsonData[i];
            
            // Check all description columns for PT content
            let isPT = false;
            let descriptions = [];
            
            descCols.forEach(descCol => {
                const desc = row[descCol.col];
                if (desc) {
                    descriptions.push(desc);
                    if (isPotentiallyPT(desc)) {
                        isPT = true;
                    }
                }
            });
            
            if (isPT) {
                ptCount++;
                results.push({
                    sheet: sheetName,
                    row: i,
                    type: 'PT_RELATED',
                    descriptions,
                    fullRow: row
                });
            } else if (nonPtCount < 10) {
                nonPtCount++;
                results.push({
                    sheet: sheetName,
                    row: i,
                    type: 'NON_PT',
                    descriptions,
                    fullRow: row
                });
            }
        }
        
        console.log(`PT-related items found: ${ptCount}`);
        console.log(`Non-PT samples: ${nonPtCount}`);
    });
    
    return results;
}

// Analyze each file
const files = [
    '__عروض ميدفال نوبكو كامل عربي إنجليزي_20250426_بدون أسعار_.xlsx',
    '_⁨اكواد نبكو⁩.xlsx',
    '_⁨اكواد نوبكو محدث⁩.xlsx'
];

let allPTSamples = [];

files.forEach(file => {
    const filePath = `./xlxs-list-exampels-last-years/${file}`;
    const samples = extractPTSamples(filePath, 20);
    allPTSamples = allPTSamples.concat(samples);
});

// Show PT samples
console.log('\n\n🎯 PT-RELATED SAMPLES FOUND:');
console.log('=' .repeat(80));

const ptSamples = allPTSamples.filter(s => s.type === 'PT_RELATED').slice(0, 15);
ptSamples.forEach((sample, i) => {
    console.log(`\n${i+1}. [${sample.sheet}] ${sample.descriptions.join(' | ')}`);
});

console.log('\n\n❌ NON-PT SAMPLES (for comparison):');
console.log('=' .repeat(80));

const nonPtSamples = allPTSamples.filter(s => s.type === 'NON_PT').slice(0, 10);
nonPtSamples.forEach((sample, i) => {
    console.log(`\n${i+1}. [${sample.sheet}] ${sample.descriptions.join(' | ')}`);
});

console.log(`\n\n📊 SUMMARY:`);
console.log(`Total PT-related items found: ${allPTSamples.filter(s => s.type === 'PT_RELATED').length}`);
console.log(`Total non-PT samples: ${allPTSamples.filter(s => s.type === 'NON_PT').length}`);
console.log(`Challenge: Need to filter massive lists (48K+ items) to find PT-relevant equipment!`);