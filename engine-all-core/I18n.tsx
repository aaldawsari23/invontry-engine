import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

// Helper for pluralization
const pluralize = (lang: Language, count: number, single: string, plural: string) => {
    if (lang === 'ar') {
        // Simplified Arabic pluralization
        if (count === 1) return single;
        if (count === 2) return single; // Needs dual form, but using plural for simplicity
        if (count > 2 && count < 11) return plural;
        return plural;
    }
    // English
    return count === 1 ? single : plural;
}

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['en'], options?: { count: number }) => string;
}

const translations = {
    en: {
        header_title: "PhysioTherapy Inventory Analyzer",
        header_subtitle: "Upload your inventory file to instantly classify and score items for PT relevance.",
        toggle_language_aria: "Toggle language to Arabic",
        upload_click: "Click to upload",
        upload_drag_drop: "or drag and drop",
        upload_supported_files: "Excel, CSV, or JSON inventory file",
        button_analyzing: "Analyzing...",
        button_analyze_now: "Analyze Now",
        alert_invalid_file: "Please upload a valid JSON, CSV, or Excel file.",
        loader_analyzing: "Analyzing Your Inventory",
        dashboard_title: "Analysis Summary",
        dashboard_category_breakdown: "Category Breakdown",
        stat_total: "Total Items",
        stat_accepted: "Accepted",
        stat_review: "Needs Review",
        stat_rejected: "Rejected",
        table_title: "Detailed Results",
        table_variants: "variants",
        table_header_item: "Item",
        table_header_category: "Category",
        table_header_score: "Score",
        table_header_status: "Status",
        table_no_results: "No results match your filters.",
        filter_search_label: "Search",
        filter_search_placeholder: "Filter by name, SKU, category...",
        filter_category_label: "Category",
        filter_score_label: "Score Range",
        decision_all: "All",
        decision_accepted: "Accepted",
        decision_review: "Review",
        decision_rejected: "Rejected",
        error_title: "Analysis Failed",
        button_try_again: "Try Again",
        button_analyze_another: "Analyze Another File",
        button_export: "Export Results",
        visual_analysis_title: "Visual Analysis",
        card_variants: "variants",
        card_codes: "Codes:",
        card_score: "Score:",
        card_item_count: "({count} item)",
    },
    ar: {
        header_title: "محلل مخزون العلاج الطبيعي",
        header_subtitle: "ارفع ملف المخزون لتصنيف وتقييم الأصناف فوراً حسب أهميتها للعلاج الطبيعي.",
        toggle_language_aria: "تبديل اللغة إلى الإنجليزية",
        upload_click: "انقر للرفع",
        upload_drag_drop: "أو اسحب وأفلت",
        upload_supported_files: "ملف مخزون بصيغة Excel, CSV, أو JSON",
        button_analyzing: "جارٍ التحليل...",
        button_analyze_now: "حلل الآن",
        alert_invalid_file: "يرجى رفع ملف صالح بصيغة JSON, CSV, أو Excel.",
        loader_analyzing: "تحليل مخزونك",
        dashboard_title: "ملخص التحليل",
        dashboard_category_breakdown: "توزيع الفئات",
        stat_total: "إجمالي الأصناف",
        stat_accepted: "مقبول",
        stat_review: "يحتاج مراجعة",
        stat_rejected: "مرفوض",
        table_title: "النتائج التفصيلية",
        table_variants: "متغيرات",
        table_header_item: "الصنف",
        table_header_category: "الفئة",
        table_header_score: "التقييم",
        table_header_status: "الحالة",
        table_no_results: "لا توجد نتائج تطابق الفلاتر.",
        filter_search_label: "بحث",
        filter_search_placeholder: "فلترة بالاسم، SKU، الفئة...",
        filter_category_label: "الفئة",
        filter_score_label: "نطاق التقييم",
        decision_all: "الكل",
        decision_accepted: "مقبول",
        decision_review: "مراجعة",
        decision_rejected: "مرفوض",
        error_title: "فشل التحليل",
        button_try_again: "حاول مرة أخرى",
        button_analyze_another: "تحليل ملف آخر",
        button_export: "تصدير النتائج",
        visual_analysis_title: "التحليل المرئي",
        card_variants: "متغيرات",
        card_codes: "الأكواد:",
        card_score: "التقييم:",
        card_item_count: "({count} عنصر)",
    }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    const t = (key: keyof typeof translations['en'], options?: { count: number }): string => {
        let translation = translations[language][key] || translations['en'][key];
        if (options && typeof options.count !== 'undefined') {
            translation = translation.replace('{count}', String(options.count));
            if (key === 'card_item_count') {
                const plural = pluralize(language, options.count, language === 'en' ? 'item' : 'عنصر', language === 'en' ? 'items' : 'عناصر');
                translation = `(${options.count} ${plural})`
            }
        }
        return translation;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useTranslation = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
};
