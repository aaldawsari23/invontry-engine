
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { Dashboard } from './components/Dashboard';
import { ResultsTable } from './components/ResultsTable';
import { analyzeInventory } from './services/analysisService';
import { parseFile } from './services/parserService';
import { AnalysisData } from './types';

type AppState = 'idle' | 'loading' | 'success' | 'error';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('idle');
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        setAppState('loading');
        setError(null);
        setAnalysisData(null);
        try {
            // Step 1: Parse the file into a normalized InventoryItem[] array
            const parsedItems = await parseFile(file);

            // Step 2: Convert the array to a JSON string for the analysis service
            const jsonString = JSON.stringify(parsedItems);

            // Step 3: Analyze the JSON string
            const data = await analyzeInventory(jsonString);

            setAnalysisData(data);
            setAppState('success');
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
            setError(errorMessage + ' Please check the file format and content.');
            setAppState('error');
        }
    }, []);
    
    const handleReset = useCallback(() => {
        setAppState('idle');
        setAnalysisData(null);
        setError(null);
    }, []);

    const renderContent = () => {
        switch (appState) {
            case 'success':
                return analysisData && (
                    <div className="space-y-8">
                        <div className="flex justify-end">
                            <button
                                onClick={handleReset}
                                className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                            >
                                Analyze Another File
                            </button>
                        </div>
                        <Dashboard summary={analysisData.summary} />
                        <ResultsTable results={analysisData.results} />
                    </div>
                );
            case 'error':
                 return (
                    <div className="space-y-6 max-w-2xl mx-auto text-center">
                        <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg">
                            <h3 className="text-xl font-bold text-red-400">Analysis Failed</h3>
                            <p className="mt-2 text-red-300">{error}</p>
                        </div>
                         <button
                            onClick={handleReset}
                            className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                        >
                            Try Again
                        </button>
                    </div>
                );
            case 'loading':
            case 'idle':
            default:
                return (
                    <div className="space-y-8">
                        <FileUpload onFileSelect={handleFileSelect} disabled={appState === 'loading'} />
                        {appState === 'loading' && <Loader />}
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-slate-300 font-sans">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <Header />
                <div className="mt-8">
                   {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
