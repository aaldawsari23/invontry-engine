
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { ProgressiveLoader } from './components/ProgressiveLoader';
import { VisualCategorySystem } from './components/VisualCategorySystem';
import { ContextualActions } from './components/ContextualActions';
import { SimplePTFilter } from './components/SimplePTFilter';
import { 
    LazyStreamlinedResultsViewWrapper as StreamlinedResultsView,
    LazyAdvancedFiltersWrapper as AdvancedFilters,
    LazyExplainModalWrapper as ExplainModal,
    LazyDashboardWrapper as Dashboard,
    LazySmartSearchWrapper as SmartSearch,
    usePerformanceMonitor
} from './components/LazyComponents';
import { useScreenReader } from './components/AccessibilityEnhancements';
import { useMobileDetection } from './components/MobileEnhancements';
import { ErrorBoundary, NetworkErrorBoundary } from './components/ErrorBoundary';
import { NotificationSystem, useNotifications } from './components/NotificationSystem';
import { FadeTransition } from './components/EnhancedTransitions';
import { analyzeInventoryWithWorker } from './services/analysisService';
import { analyzeWithBestAvailableEngine, getUltraFastAnalysisService } from './services/ultraFastAnalysisService';
import { parseFile } from './services/parserService';
import { AnalysisData, FilterState, AnalysisResult } from './types';
import { useTranslation } from './components/I18n';
import { exportToExcel } from './services/exportService';
import { KnowledgeManager } from './services/knowledge/knowledgeManager';
import { BackwardCompatibleKnowledgeManager } from './services/modernKnowledgeManager';
import { PerformanceIndicator, PerformanceMetricsPanel } from './components/PerformanceMetricsPanel';

type AppState = 'initializing' | 'idle' | 'loading' | 'success' | 'error';

// Use modern knowledge manager with backward compatibility
const knowledgeManager = new BackwardCompatibleKnowledgeManager();

const App: React.FC = () => {
    const { t, language } = useTranslation();
    const { notifications, removeNotification, success, error, warning, info } = useNotifications();
    const { announce, ScreenReaderAnnouncer } = useScreenReader();
    const { isMobile, isTablet } = useMobileDetection();
    const [appState, setAppState] = useState<AppState>('initializing');
    
    usePerformanceMonitor('App');
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    
    const [filters, setFilters] = useState<FilterState>({
        text: '',
        decision: 'All',
        category: 'All',
        scoreRange: { min: -100, max: 100 },
        manufacturer: 'All',
        supplier: 'All',
        specialty: 'All',
        region: 'All',
        area: 'All',
        type: 'All',
    });

    const [isExplainModalOpen, setExplainModalOpen] = useState(false);
    const [selectedItemForExplain, setSelectedItemForExplain] = useState<AnalysisResult | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [ptFilteredResults, setPtFilteredResults] = useState<AnalysisResult[] | null>(null);
    const [isPTFilterActive, setIsPTFilterActive] = useState(false);
    const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);

    useEffect(() => {
        const loadKnowledge = async () => {
            try {
                await knowledgeManager.load();
                setAppState('idle');
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to initialize application.';
                setErrorMessage(message);
                setAppState('error');
                error('Initialization Failed', message);
            }
        };
        loadKnowledge();
    }, [error]);
    
    useEffect(() => {
        if(appState === 'success') {
             setFilters({
                text: '',
                decision: 'All',
                category: 'All',
                scoreRange: { min: -100, max: 100 },
                manufacturer: 'All',
                supplier: 'All',
                specialty: 'All',
                region: 'All',
                area: 'All',
                type: 'All',
            });
        }
    }, [appState]);

    const handleFileSelect = useCallback(async (file: File) => {
        setAppState('loading');
        setErrorMessage(null);
        setAnalysisData(null);
        setProgress(0);
        try {
            info('Analysis Started', `Processing ${file.name} with Ultra-Fast Engine...`, { duration: 3000 });
            const parsedItems = await parseFile(file);
            
            // Use ultra-fast engine with fallback to legacy system
            const data = await analyzeWithBestAvailableEngine(
                parsedItems, 
                (progress, stats) => {
                    setProgress(progress);
                    if (stats?.rate) {
                        info('Processing...', `${stats.rate.toFixed(0)} items/sec`, { duration: 1000 });
                    }
                }, 
                true // prefer ultra-fast engine
            );
            
            setAnalysisData(data);
            setAppState('success');
            
            // Enhanced success message with performance metrics
            const performanceInfo = data.performance ? 
                ` (${data.performance.itemsPerSecond.toFixed(0)} items/sec, ${data.performance.profile} profile)` : '';
            
            success('Analysis Complete', `Successfully analyzed ${data.results.length} items${performanceInfo}`);
            announce(`Ultra-fast analysis complete. Found ${data.results.length} items.`, 'assertive');
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
            const fullMessage = message + ' Please check the file format and content.';
            setErrorMessage(fullMessage);
            setAppState('error');
            error('Analysis Failed', fullMessage);
        }
    }, [info, success, error]);
    
    const handleReset = useCallback(() => {
        setAppState('idle');
        setAnalysisData(null);
        setErrorMessage(null);
        setProgress(0);
    }, []);

    const openExplainModal = (item: AnalysisResult) => {
        setSelectedItemForExplain(item);
        setExplainModalOpen(true);
    };

    const closeExplainModal = () => {
        setSelectedItemForExplain(null);
        setExplainModalOpen(false);
    };

    const filteredResults = useMemo(() => {
        if (!analysisData) return [];
        
        // Use PT filtered results if PT filter is active
        const sourceResults = isPTFilterActive && ptFilteredResults ? ptFilteredResults : analysisData.results;
        
        const lowerText = filters.text.toLowerCase();

        // Helper: Convert single OR multi (arrays) to Set. Empty set == "All".
        const toSet = (field: keyof FilterState): Set<string> => {
            const multi = (filters as any)[`${field}_multi`] as string[] | undefined;
            if (Array.isArray(multi) && multi.length) return new Set(multi);
            const single = (filters as any)[field] as string | undefined;
            return single && single !== 'All' ? new Set([single]) : new Set();
        };

        const cats = toSet('category');
        const mans = toSet('manufacturer');  
        const specs = toSet('specialty');
        const regs = toSet('region');
        const areas = toSet('area');
        const types = toSet('type');
        // Advanced modal fields
        const countries = toSet('country');
        const suppliers = toSet('supplier');
        const models = toSet('model');

        const filtered = sourceResults.filter(item => {
            // Lock to Accepted per spec (UI decision removed)
            if (item.Decision !== 'Accepted') return false;

            // OR within each set, AND across sets
            if (cats.size && !cats.has(item.PT_Category)) return false;
            if (mans.size && item.manufacturer && !mans.has(item.manufacturer)) return false;
            if (specs.size && item.specialty && !specs.has(item.specialty)) return false;
            if (regs.size && item.region && !regs.has(item.region)) return false;
            if (areas.size && item.area && !areas.has(item.area)) return false;
            if (types.size && item.type && !types.has(item.type)) return false;
            
            // Advanced filters
            if (countries.size && item.manufacturer_country && !countries.has(item.manufacturer_country)) return false;
            if (suppliers.size && item.supplier && !suppliers.has(item.supplier)) return false;
            if (models.size) {
                // Extract model from item name for model filtering
                const modelMatch = item.item_name.match(/model\s+([\w\d-]+)/i);
                const itemModel = modelMatch ? modelMatch[1] : item.item_name;
                if (!models.has(itemModel)) return false;
            }

            // Score range
            if (item.Score < filters.scoreRange.min || item.Score > filters.scoreRange.max) return false;

            // Enhanced text search (supports Arabic and English)
            if (filters.text) {
                const searchFields = [
                    item.item_name || '',
                    item.sku || '',
                    item.PT_Category || '',
                    item.PT_Subcategory || '',
                    item.manufacturer || '',
                    item.description || ''
                ].join(' ').toLowerCase();
                
                // Support both Arabic and English search
                if (!searchFields.includes(lowerText)) return false;
            }
            
            return true;
        });

        // Enhanced sorting: Score desc, then Arabic name sorting
        const locale = language === 'ar' ? 'ar' : 'en';
        return [...filtered].sort((a, b) => {
            const scoreDiff = b.Score - a.Score;
            if (scoreDiff !== 0) return scoreDiff;
            
            // Arabic-aware name sorting
            return (a.item_name || '').localeCompare(b.item_name || '', locale, {
                numeric: true,
                sensitivity: 'base'
            });
        });
    }, [analysisData, filters, isPTFilterActive, ptFilteredResults, language]);

    const handleExport = (items?: AnalysisResult[]) => {
        if (!analysisData) return;
        const itemsToExport = items || analysisData.results;
        try {
            exportToExcel(itemsToExport, analysisData.summary, {
                includeSummary: true,
                includeAccepted: true,
                includeReview: true,
                includeRejected: false,
            });
            success('Export Complete', `Exported ${itemsToExport.length} items to Excel`);
        } catch (err) {
            error('Export Failed', 'Unable to export data. Please try again.');
        }
    };

    const handleSelectAll = () => {
        if (!analysisData) return;
        const allItemIds = new Set(filteredResults.map(item => item.id));
        setSelectedItems(allItemIds);
    };

    const handleClearSelection = () => {
        setSelectedItems(new Set());
    };

    const handleBulkUpdate = (action: string, items: AnalysisResult[]) => {
        // TODO: Implement bulk update functionality
        console.log(`Bulk update: ${action} for ${items.length} items`);
        // This would typically update the backend/data
        warning('Bulk Update', `Applied ${action} to ${items.length} items (demo mode)`, {
            duration: 3000
        });
    };

    const handlePTFilterResults = useCallback((filteredResults: AnalysisResult[]) => {
        setPtFilteredResults(filteredResults);
        setIsPTFilterActive(filteredResults.length < (analysisData?.results.length || 0));
        const ptCount = filteredResults.length;
        const totalCount = analysisData?.results.length || 0;
        if (ptCount < totalCount) {
            success('PT Filter Applied', `Found ${ptCount} PT-relevant items from ${totalCount} total items`);
            announce(`PT filter applied. Found ${ptCount} physiotherapy items.`, 'assertive');
        } else {
            info('Filter Cleared', 'Showing all results');
        }
    }, [analysisData, success, announce, info]);

    const clearPTFilter = useCallback(() => {
        setPtFilteredResults(null);
        setIsPTFilterActive(false);
        info('PT Filter Cleared', 'Showing all analysis results');
    }, [info]);

    const renderContent = () => {
        switch (appState) {
            case 'success':
                return analysisData && (
                    <FadeTransition show={true}>
                        <div className="space-y-8">
                        <div className="flex justify-end gap-4">
                             <button
                                onClick={handleExport}
                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors duration-200"
                            >
                                {t('button_export')}
                            </button>
                            <button
                                onClick={handleReset}
                                className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                            >
                                {t('button_analyze_another')}
                            </button>
                        </div>
                        
                        {/* Simple PT Filter - WORKING SMART FILTERING SYSTEM */}
                        <div className="relative">
                            <SimplePTFilter 
                                results={analysisData.results}
                                onFilteredResults={handlePTFilterResults}
                                language={language}
                            />
                            {isPTFilterActive && (
                                <div className="mt-4 p-3 bg-teal-900/30 border border-teal-500/30 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-teal-300">
                                            🎯 PT Filter Active: Showing {ptFilteredResults?.length || 0} PT items
                                        </span>
                                        <button
                                            onClick={clearPTFilter}
                                            className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded"
                                        >
                                            Clear PT Filter
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <Dashboard summary={analysisData.summary} results={filteredResults} filters={filters} setFilters={setFilters} />
                        
                        <AdvancedFilters filters={filters} setFilters={setFilters} results={analysisData.results} language={language} />
                        
                        <div className="space-y-6">
                            <StreamlinedResultsView 
                                results={filteredResults} 
                                onExplain={openExplainModal}
                                selectedItems={selectedItems}
                                onSelectItem={(itemId) => {
                                    const newSelected = new Set(selectedItems);
                                    if (newSelected.has(itemId)) {
                                        newSelected.delete(itemId);
                                    } else {
                                        newSelected.add(itemId);
                                    }
                                    setSelectedItems(newSelected);
                                }}
                                onSelectAll={handleSelectAll}
                                onExport={handleExport}
                                onBulkUpdate={handleBulkUpdate}
                                onClearSelection={handleClearSelection}
                            />
                        </div>
                        </div>
                    </FadeTransition>
                );
            case 'error':
                 return (
                    <FadeTransition show={true}>
                        <div className="space-y-6 max-w-2xl mx-auto text-center">
                            <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg">
                                <h3 className="text-xl font-bold text-red-400">{t('error_title')}</h3>
                                <p className="mt-2 text-red-300">{errorMessage}</p>
                            </div>
                             <button
                                onClick={handleReset}
                                className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                            >
                                {t('button_try_again')}
                            </button>
                        </div>
                    </FadeTransition>
                );
            case 'initializing':
                 return <div className="text-center p-8 text-slate-500">Initializing Analysis Engine...</div>;
            case 'loading':
            case 'idle':
            default:
                return (
                    <div className="space-y-8">
                        <FileUpload onFileSelect={handleFileSelect} disabled={appState === 'loading'} />
                        {appState === 'loading' && <ProgressiveLoader progress={progress} />}
                    </div>
                );
        }
    };
    
    return (
        <ErrorBoundary>
            <NetworkErrorBoundary>
                <div 
                    className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 font-sans relative overflow-x-hidden" 
                    key={language}
                >
                    {/* Background Pattern */}
                    <div className="fixed inset-0 opacity-30">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,_rgba(45,212,191,0.1)_0%,_transparent_50%)]"></div>
                        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,_rgba(59,130,246,0.1)_0%,_transparent_50%)]"></div>
                    </div>
                    
                    {/* Grid Pattern Overlay */}
                    <div className="fixed inset-0 bg-[linear-gradient(rgba(45,212,191,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                    
                    <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <Header />
                <div className="mt-8">
                   {renderContent()}
                </div>
                
                {/* Performance Metrics */}
                {appState === 'success' && analysisData && (
                    <>
                        <PerformanceIndicator 
                            onClick={() => setShowPerformanceMetrics(true)}
                        />
                        <PerformanceMetricsPanel
                            isVisible={showPerformanceMetrics}
                            onClose={() => setShowPerformanceMetrics(false)}
                        />
                    </>
                )}
                 <ExplainModal 
                    isOpen={isExplainModalOpen}
                    onClose={closeExplainModal}
                    item={selectedItemForExplain}
                />
                
                {/* Contextual Actions */}
                {appState === 'success' && analysisData && (
                    <ContextualActions
                        selectedItems={selectedItems}
                        results={filteredResults}
                        onExport={handleExport}
                        onClearSelection={handleClearSelection}
                        onSelectAll={handleSelectAll}
                        onBulkUpdate={handleBulkUpdate}
                    />
                )}
                
                {/* Notification System */}
                <NotificationSystem 
                    notifications={notifications} 
                    onRemove={removeNotification}
                    position="top-right"
                />
                
                {/* Screen Reader Announcements */}
                <ScreenReaderAnnouncer />
                    </main>
                </div>
            </NetworkErrorBoundary>
        </ErrorBoundary>
    );
};

export default App;
