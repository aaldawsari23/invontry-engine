#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

function debugItems(filePath) {
    console.log(`📁 Debugging: ${path.basename(filePath)}`);
    
    try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length < 2) {
            console.log('❌ No data found in file');
            return;
        }
        
        // Get description column (column 7)
        const headers = data[0];
        const descCol = 7; // Description column
        
        console.log('\n🔍 Sample items from the dataset:');
        console.log('================================');
        
        const uniqueItems = new Set();
        
        for (let i = 1; i < Math.min(data.length, 100); i++) {
            const row = data[i];
            if (!row || !row[descCol]) continue;
            
            const description = String(row[descCol] || '').trim();
            if (description && !uniqueItems.has(description)) {
                uniqueItems.add(description);
                if (uniqueItems.size <= 20) {
                    console.log(`${uniqueItems.size}. ${description}`);
                }
            }
        }
        
        console.log(`\n📊 Found ${uniqueItems.size} unique items in first 100 rows`);
        
        // Look for potential PT items
        console.log('\n🎯 Searching for potential PT items...');
        const ptKeywords = ['chair', 'wheel', 'mobility', 'therapy', 'exercise', 'rehabilitation', 'walking', 'support', 'brace', 'splint'];
        const potentialPT = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[descCol]) continue;
            
            const description = String(row[descCol] || '').toLowerCase();
            for (const keyword of ptKeywords) {
                if (description.includes(keyword)) {
                    potentialPT.push(row[descCol]);
                    break;
                }
            }
            
            if (potentialPT.length >= 10) break;
        }
        
        if (potentialPT.length > 0) {
            console.log('\n✅ Found potential PT items:');
            potentialPT.forEach((item, i) => {
                console.log(`${i+1}. ${item}`);
            });
        } else {
            console.log('\n❌ No obvious PT items found in the dataset');
        }
        
    } catch (error) {
        console.error(`❌ Error debugging ${filePath}:`, error.message);
    }
}

// Main execution
const xlsxDir = './xlxs-list-exampels-last-years';
const xlsxFiles = fs.readdirSync(xlsxDir)
    .filter(file => file.endsWith('.xlsx') && !file.includes(':Zone.Identifier'))
    .slice(0, 1); // Just first file

xlsxFiles.forEach(file => {
    debugItems(path.join(xlsxDir, file));
});