
import { AnalysisResult, SummaryStats } from '../types';

declare const XLSX: any;

export interface ExportOptions {
    includeSummary: boolean;
    includeAccepted: boolean;
    includeReview: boolean;
    includeRejected: boolean;
}

const generateRecommendation = (item: AnalysisResult): string => {
    if (item.Matched_Keywords.length === 0) {
        return "Review: No relevant PT keywords found.";
    }
    if (item.Score < 15) {
        return `Review: Low score. Check if description is missing key details. Matched: ${item.Matched_Keywords.map(k => k.canonical).slice(0,2).join(', ')}.`;
    }
    return "General review needed.";
};

export const exportToExcel = (
    results: AnalysisResult[], 
    summary: SummaryStats,
    options: ExportOptions
) => {
    const wb = XLSX.utils.book_new();

    if (options.includeSummary) {
        const summaryData = [
            { Stat: "Total Items Analyzed", Value: summary.totalItems },
            { Stat: "Accepted Items", Value: summary.accepted },
            { Stat: "Needs Review", Value: summary.review },
            { Stat: "Rejected Items", Value: summary.rejected },
            ...Object.entries(summary.categoryCounts).map(([cat, count]) => ({
                Stat: `Category: ${cat}`,
                Value: count
            }))
        ];
        const ws = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
    }

    const transformResults = (data: AnalysisResult[], includeRecommendation = false) => {
        return data.map(r => ({
            "Item Name": r.item_name,
            "SKU": r.sku,
            "Decision": r.Decision,
            "Score": r.Score,
            "PT Category": r.PT_Category,
            "PT Subcategory": r.PT_Subcategory,
            "Matched Keywords": r.Matched_Keywords.map(k => `${k.canonical} (${k.strategy}, ${k.confidence.toFixed(2)})`).join('; '),
            "Decision Reason": r.Decision_Reason,
            ...(includeRecommendation && { "Recommendation": generateRecommendation(r) }),
            "Explanation": Array.isArray(r.explanation.context)
                ? r.explanation.context.join('; ')
                : JSON.stringify(r.explanation.context),
            "Description": r.description
        }));
    };

    if (options.includeAccepted) {
        const acceptedData = results.filter(r => r.Decision === 'Accepted');
        const ws = XLSX.utils.json_to_sheet(transformResults(acceptedData));
        XLSX.utils.book_append_sheet(wb, ws, "Accepted Items");
    }
    
    if (options.includeReview) {
        const reviewData = results.filter(r => r.Decision === 'Review');
        const ws = XLSX.utils.json_to_sheet(transformResults(reviewData, true));
        XLSX.utils.book_append_sheet(wb, ws, "Needs Review");
    }

    if (options.includeRejected) {
        const rejectedData = results.filter(r => r.Decision === 'Rejected');
        const ws = XLSX.utils.json_to_sheet(transformResults(rejectedData));
        XLSX.utils.book_append_sheet(wb, ws, "Rejected Items");
    }

    const filename = `PT_Inventory_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
};
