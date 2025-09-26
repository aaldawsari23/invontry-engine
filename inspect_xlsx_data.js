#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

function inspectExcelFile(filePath) {
    console.log(`📁 Inspecting: ${path.basename(filePath)}`);
    
    try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length < 2) {
            console.log('❌ No data found in file');
            return;
        }
        
        // Show headers
        console.log('\n📋 Headers:');
        const headers = data[0];
        headers.forEach((header, i) => {
            console.log(`  ${i}: "${header}"`);
        });
        
        // Show first 5 data rows
        console.log('\n📊 First 5 data rows:');
        for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
            const row = data[i];
            console.log(`\nRow ${i}:`);
            row.forEach((cell, j) => {
                if (cell && String(cell).trim()) {
                    console.log(`  Col${j}: "${cell}"`);
                }
            });
        }
        
    } catch (error) {
        console.error(`❌ Error inspecting ${filePath}:`, error.message);
    }
}

// Main execution
const xlsxDir = './xlxs-list-exampels-last-years';
const xlsxFiles = fs.readdirSync(xlsxDir)
    .filter(file => file.endsWith('.xlsx') && !file.includes(':Zone.Identifier'))
    .slice(0, 1); // Just first file

xlsxFiles.forEach(file => {
    inspectExcelFile(path.join(xlsxDir, file));
    console.log('\n' + '='.repeat(50) + '\n');
});