
import { normalizeArabic } from './arabicNormalize';
import { trigrams } from './tokenizer';

export interface MatchResult {
  confidence: number;
  strategy: 'exact' | 'substring' | 'affix' | 'fuzzy';
  hit: string;
}

export class HybridMatcher {
  private FUZZY_THRESHOLD = 0.7;
  
  private preProcess(s: string): string {
    return s ? normalizeArabic(s.toLowerCase()) : '';
  }

  private fuzzy(processedTerm: string, processedCorpus: string, originalTerm: string): MatchResult | null {
    const termGrams = trigrams(processedTerm);
    if (termGrams.size === 0) return null;

    const corpusWords = processedCorpus.split(/\s+/);
    let bestMatch = { similarity: 0 };

    for (const word of corpusWords) {
        if (word.length < 3) continue;
        
        const wordGrams = trigrams(word);
        if (wordGrams.size === 0) continue;

        let intersectionSize = 0;
        for (const gram of termGrams) {
            if (wordGrams.has(gram)) {
                intersectionSize++;
            }
        }
        
        const unionSize = termGrams.size + wordGrams.size - intersectionSize;
        const similarity = unionSize > 0 ? intersectionSize / unionSize : 0;
        
        if (similarity > bestMatch.similarity) {
            bestMatch.similarity = similarity;
        }
    }

    if (bestMatch.similarity >= this.FUZZY_THRESHOLD) {
        return {
            confidence: bestMatch.similarity,
            strategy: 'fuzzy',
            hit: originalTerm,
        };
    }
    
    return null;
  }

  match(term: string, corpus: string): MatchResult | null {
    const processedTerm = this.preProcess(term);
    const processedCorpus = this.preProcess(corpus);

    // Exact word match (most reliable)
    const exactRegex = new RegExp(`\\b${processedTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`);
    if (exactRegex.test(processedCorpus)) {
      return { confidence: 1.0, strategy: 'exact', hit: term };
    }
    
    // Substring match (good for compound terms)
    if (processedCorpus.includes(processedTerm)) {
      return { confidence: 0.9, strategy: 'substring', hit: term };
    }
    
    // Affix match (for SKUs, model numbers)
    const affixTerm = processedTerm.replace(/[^a-z0-9]/gi, '');
    if (affixTerm.length > 3) {
      const affixCorpus = processedCorpus.replace(/[^a-z0-9]/gi, '');
      if (affixCorpus.includes(affixTerm)) {
          return { confidence: 0.85, strategy: 'affix', hit: term };
      }
    }
    
    // Fuzzy match (last resort for variations/misspellings)
    return this.fuzzy(processedTerm, processedCorpus, term);
  }
}