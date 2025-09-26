import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Function to analyze XLSX file
function analyzeXLSX(filePath) {
    try {
        console.log(`\n=== Analyzing: ${path.basename(filePath)} ===`);
        
        const workbook = XLSX.readFile(filePath);
        console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
        
        // Analyze each sheet
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
                console.log(`Rows: ${jsonData.length}`);
                console.log('Headers:', jsonData[0]);
                
                // Show first few data rows
                if (jsonData.length > 1) {
                    console.log('\nSample data:');
                    for (let i = 1; i < Math.min(4, jsonData.length); i++) {
                        console.log(`Row ${i}:`, jsonData[i]);
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
    }
}

// Analyze all XLSX files in the directory
const xlsxDir = './xlxs-list-exampels-last-years';
const files = fs.readdirSync(xlsxDir).filter(f => f.endsWith('.xlsx'));

console.log('Found XLSX files:', files);

files.forEach(file => {
    const filePath = path.join(xlsxDir, file);
    analyzeXLSX(filePath);
});