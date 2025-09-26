import { InventoryItem } from '../types';

// Declare global variables provided by the CDN scripts
declare const XLSX: any;
declare const Papa: any;

// --- Column Normalization ---

const fieldAliases: { [key in keyof Required<InventoryItem>]: string[] } = {
    id: ['id', 'row', '#'],
    // Aliases for the primary identifier. 'description' remains as fallback for unlabelled catalogs.
    item_name: [
        'item name', 'product name', 'title', 'name', 'item_name', 'description', 'الوصف', 'اسم المنتج', 'اسم الصنف',
        'product description', 'english description', 'arabic description', 'item description english', 'item description arabic',
        'اسم المنتج انجليزي', 'اسم المنتج عربي', 'الوصف العربي', 'الوصف الانجليزي', 'item', 'item desc'
    ],
    category: ['category', 'type', 'product type', 'classification', 'group', 'الفئة', 'التصنيف', 'التخصص', 'التخصص العام'],
    subcategory: ['subcategory', 'sub category', 'sub-category', 'التصنيف الفرعي', 'sub group', 'subgroup'],
    // Aliases for secondary, more detailed descriptive text.
    description: [
        'details', 'full description', 'item description', 'الوصف التفصيلي', 'long description', 'description',
        'description en', 'description ar', 'الوصف الكامل', 'تفاصيل المنتج'
    ],
    brand: ['brand', 'manufacturer', 'الماركة', 'العلامة التجارية', 'mfr', 'brand name', 'اسم العلامة التجارية'],
    model: ['model', 'model number', 'model_number', 'الموديل', 'model name', 'item model', 'model no', 'موديل'],
    sku: [
        'sku', 'item code', 'product id', 'item_code', 'رقم المنتج', 'item no', 'smr code', 'item number',
        'catalog number', 'catalogue number', 'reference', 'reference number', 'nupco code', 'nupco', 'p-code', 'p code',
        'moh code', 'code', 'رقم الصنف', 'رقم نوبكو', 'كود نوبكو'
    ],
    manufacturer: ['manufacturer', 'المصنع', 'الشركة المصنعة', 'maker', 'brand owner', 'company', 'fabricante'],
    supplier: ['supplier', 'vendor', 'المورد', 'المورّد', 'الشركة', 'الوكيل'],
    manufacturer_country: ['manufacturer country', 'country of origin', 'manufacturing country', 'country', 'origin', 'بلد الصنع', 'بلد المنشأ', 'الدولة'],
    specialty: ['specialty', 'department', 'clinical area', 'service line', 'تخصص', 'القسم', 'قسم', 'التخصص السريري'],
    region: ['region', 'territory', 'منطقة', 'المنطقة'],
    area: ['area', 'site', 'unit', 'location', 'النطاق', 'المنطقة الفرعية'],
    type: ['type', 'device type', 'classification type', 'نوع', 'تصنيف', 'الفئة النوعية']
};

// Creates a map from the file's column index to our standard InventoryItem key
const createHeaderMap = (headerRow: string[]): { [index: number]: keyof InventoryItem } => {
    const headerMap: { [index: number]: keyof InventoryItem } = {};
    const normalizedAliases = Object.entries(fieldAliases).map(([key, aliases]) => ({
        key: key as keyof InventoryItem,
        aliases: aliases.map(a => a.toLowerCase().replace(/[\s_-]/g, '')),
    }));

    headerRow.forEach((header, index) => {
        if (!header) return;
        const normalizedHeader = header.toLowerCase().replace(/[\s_-]/g, '');
        const foundMapping = normalizedAliases.find(mapping => mapping.aliases.includes(normalizedHeader));
        if (foundMapping) {
            // Avoid mapping the same key to multiple columns
            if (!Object.values(headerMap).includes(foundMapping.key)) {
                headerMap[index] = foundMapping.key;
            }
        }
    });

    return headerMap;
};

// Normalizes raw data (array of arrays) into an array of InventoryItem objects
const normalizeData = (rows: any[][]): InventoryItem[] => {
    if (rows.length < 2) {
        throw new Error("Inventory file must contain a header row and at least one data row.");
    }

    const headerRow = rows[0].map(String);
    const dataRows = rows.slice(1);
    const headerMap = createHeaderMap(headerRow);

    // If 'item_name' is missing, try to promote 'description' to 'item_name'
    if (!Object.values(headerMap).includes('item_name')) {
        const descriptionEntry = Object.entries(headerMap).find(([, key]) => key === 'description');
        if (descriptionEntry) {
            const descriptionIndex = parseInt(descriptionEntry[0], 10);
            headerMap[descriptionIndex] = 'item_name';
        }
    }

    // Now, re-check if we have an item_name. If not, then we throw.
    if (!Object.values(headerMap).includes('item_name')) {
        const detectedHeaders = headerRow.filter(h => h).join(', ');
        throw new Error(
            `Could not find a required 'item_name' column (or a valid alias). Detected headers in your file are: [${detectedHeaders}]. Please check your column names.`
        );
    }

    const normalizedItems: InventoryItem[] = [];

    dataRows.forEach((row, rowIndex) => {
        // Skip empty rows
        if(row.every(cell => cell === null || cell === '' || cell === undefined)) return;

        const item: Partial<InventoryItem> = {
            id: `item-${rowIndex + 1}`
        };

        Object.entries(headerMap).forEach(([index, key]) => {
            const cellValue = row[parseInt(index, 10)];
            if(cellValue !== null && cellValue !== undefined) {
                 item[key] = String(cellValue);
            }
        });
        
        // Ensure item_name is not empty before adding
        if (item.item_name && item.item_name.trim() !== '') {
            normalizedItems.push(item as InventoryItem);
        }
    });

    return normalizedItems;
};

// --- Parsers ---

const parseXlsx = (file: File): Promise<InventoryItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const arrayBuffer = e.target?.result;
                if (!arrayBuffer) {
                    throw new Error("File could not be read into ArrayBuffer.");
                }
                // SheetJS expects a Uint8Array when the type is 'array'
                const data = new Uint8Array(arrayBuffer as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                resolve(normalizeData(jsonData));
            } catch (error) {
                console.error("XLSX parsing error:", error);
                reject(new Error("Failed to parse the Excel file. It may be corrupt or in an unsupported format."));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read the file."));
        reader.readAsArrayBuffer(file);
    });
};

const parseCsv = (file: File): Promise<InventoryItem[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            skipEmptyLines: true,
            complete: (results: any) => {
                try {
                    if (results.errors && results.errors.length > 0) {
                        return reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
                    }
                    resolve(normalizeData(results.data));
                } catch(e) {
                    reject(e);
                }
            },
            error: (csvParseError: Error) => reject(new Error(`CSV parsing failed: ${csvParseError.message}`)),
        });
    });
};

const parseJson = (file: File): Promise<InventoryItem[]> => {
     return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                if (!Array.isArray(data)) {
                     return reject(new Error("JSON file must contain an array of items."));
                }
                // Basic validation for JSON structure
                if (data.length > 0 && typeof data[0].item_name === 'undefined') {
                    return reject(new Error("JSON items must have an 'item_name' property."));
                }
                // Add unique IDs if they don't exist
                resolve(data.map((item, index) => ({ id: `item-${index}`, ...item })));
            } catch (err) {
                reject(new Error("Failed to parse the JSON file. Please ensure it is well-formed."));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read the file."));
        reader.readAsText(file);
    });
};

// --- Public API ---

export const parseFile = (file: File): Promise<InventoryItem[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
        case 'xlsx':
        case 'xls':
            return parseXlsx(file);
        case 'csv':
            return parseCsv(file);
        case 'json':
            return parseJson(file);
        default:
            return Promise.reject(new Error(`Unsupported file type: .${extension}. Please upload an Excel, CSV, or JSON file.`));
    }
};
