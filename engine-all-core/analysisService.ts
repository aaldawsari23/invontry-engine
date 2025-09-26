import { AnalysisResult, SummaryStats, InventoryItem, AnalysisData } from '../types';
import { KnowledgeManager } from './knowledge/knowledgeManager';

const CHUNK_SIZE = 500;

export const analyzeInventoryWithWorker = (
    inventory: InventoryItem[], 
    knowledgeManager: KnowledgeManager,
    onProgress: (progress: number) => void
): Promise<AnalysisData> => {
    return new Promise((resolve, reject) => {
        const totalItems = inventory.length;

        if (totalItems === 0) {
            const emptySummary: SummaryStats = {
                totalItems: 0,
                accepted: 0,
                review: 0,
                rejected: 0,
                categoryCounts: {},
            };
            onProgress(100);
            return resolve({ results: [], summary: emptySummary });
        }

        // Use Vite-friendly worker URL construction for proper bundling
        const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
        
        const knowledgePack = knowledgeManager.get();
        
        const chunks: InventoryItem[][] = [];
        for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
            chunks.push(inventory.slice(i, i + CHUNK_SIZE));
        }

        let completedChunks = 0;
        const allResults: AnalysisResult[] = [];
        const summary: SummaryStats = {
            totalItems,
            accepted: 0,
            review: 0,
            rejected: 0,
            categoryCounts: {},
        };

        worker.onmessage = (e: MessageEvent<{ results?: AnalysisResult[], error?: string }>) => {
            if (e.data.error) {
                worker.terminate();
                return reject(new Error(e.data.error));
            }
            
            const chunkResults = e.data.results;
            if (chunkResults) {
                allResults.push(...chunkResults);

                chunkResults.forEach(result => {
                    if (result.Decision === 'Accepted') summary.accepted++;
                    else if (result.Decision === 'Review') summary.review++;
                    else if (result.Decision === 'Rejected') summary.rejected++;

                    if (result.Decision === 'Accepted' || result.Decision === 'Review') {
                        summary.categoryCounts[result.PT_Category] = (summary.categoryCounts[result.PT_Category] || 0) + 1;
                    }
                });
            }

            completedChunks++;
            const progress = Math.min(100, Math.round((completedChunks / chunks.length) * 100));
            onProgress(progress);

            if (completedChunks === chunks.length) {
                worker.terminate();
                resolve({ results: allResults, summary });
            }
        };
        
        worker.onerror = (e) => {
            console.error('Worker error event:', e);
            worker.terminate();
            // Provide a more specific error message from the ErrorEvent
            const errorMessage = e.message ? `Worker error: ${e.message}` : "An unknown error occurred in the analysis worker.";
            reject(new Error(errorMessage));
        };

        onProgress(0);
        chunks.forEach(chunk => {
            worker.postMessage({ chunk, knowledgePack });
        });
    });
};
