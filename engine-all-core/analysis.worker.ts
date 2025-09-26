
/// <reference lib="webworker" />
import { analyzeBatch } from './analysisCore';
import { InventoryItem } from '../types';
import { KnowledgePack } from './knowledge/schemas';

self.onmessage = (e: MessageEvent<{ chunk: InventoryItem[], knowledgePack: KnowledgePack }>) => {
  const { chunk, knowledgePack } = e.data;
  try {
    if (!knowledgePack) {
      throw new Error("Worker received a chunk without the required knowledge pack.");
    }
    
    console.log(`Worker processing chunk of ${chunk.length} items with knowledge pack version ${knowledgePack.weights?.thresholds ? 'v3 (engine3v)' : 'legacy'}`);
    
    const results = analyzeBatch(chunk, knowledgePack);
    
    console.log(`Worker completed chunk: ${results.length} results, ${results.filter(r => r.explanation?.context?.engine === 'engine3v').length} processed by engine3v`);
    
    self.postMessage({ results });
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ error: error instanceof Error ? error.message : "Unknown worker error" });
  }
};

export {};
