/**
 * Token Index System for Ultra-Fast Medical Term Lookups
 * Pre-compiled token mapping with inverted indices
 */

export interface TokenEntry {
  token: string;
  termIds: Set<number>;
  frequency: number;
  idf?: number; // Inverse Document Frequency
}

export interface TermEntry {
  id: number;
  term: string;
  normalizedTerm: string;
  tokens: string[];
  score: number;
  category: string;
  pt_domain: string;
  tf?: Map<string, number>; // Term Frequency per token
}

export class TokenIndex {
  private tokenMap: Map<string, TokenEntry>;
  private termMap: Map<number, TermEntry>;
  private termIdCounter: number;
  private totalTerms: number;

  constructor() {
    this.tokenMap = new Map();
    this.termMap = new Map();
    this.termIdCounter = 0;
    this.totalTerms = 0;
  }

  /**
   * Add a medical term to the index
   */
  addTerm(
    term: string,
    normalizedTerm: string,
    score: number,
    category: string,
    pt_domain: string,
    tokenizer: (text: string) => string[]
  ): number {
    const termId = this.termIdCounter++;
    const tokens = tokenizer(normalizedTerm);
    
    // Create term entry
    const termEntry: TermEntry = {
      id: termId,
      term,
      normalizedTerm,
      tokens,
      score,
      category,
      pt_domain,
      tf: new Map()
    };

    // Calculate term frequency for each token
    const tokenCounts = new Map<string, number>();
    tokens.forEach(token => {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });

    // Add tokens to index
    tokens.forEach(token => {
      const tokenFreq = tokenCounts.get(token)!;
      termEntry.tf!.set(token, tokenFreq / tokens.length); // Normalized TF
      
      if (!this.tokenMap.has(token)) {
        this.tokenMap.set(token, {
          token,
          termIds: new Set(),
          frequency: 0
        });
      }
      
      const tokenEntry = this.tokenMap.get(token)!;
      tokenEntry.termIds.add(termId);
      tokenEntry.frequency++;
    });

    this.termMap.set(termId, termEntry);
    this.totalTerms++;
    
    return termId;
  }

  /**
   * Finalize index by calculating IDF values
   */
  finalizeIndex(): void {
    // Calculate IDF for each token
    for (const tokenEntry of this.tokenMap.values()) {
      const documentFreq = tokenEntry.termIds.size;
      tokenEntry.idf = Math.log(this.totalTerms / documentFreq);
    }
    
    console.log(`Finalized token index: ${this.tokenMap.size} unique tokens, ${this.totalTerms} terms`);
  }

  /**
   * Search for terms using token-based matching
   */
  search(
    query: string,
    tokenizer: (text: string) => string[],
    maxResults: number = 10
  ): Array<{term: TermEntry, score: number}> {
    const queryTokens = tokenizer(query);
    if (queryTokens.length === 0) return [];

    // Find candidate terms
    const candidates = new Map<number, number>(); // termId -> score
    const queryTokenSet = new Set(queryTokens);
    
    queryTokens.forEach(token => {
      const tokenEntry = this.tokenMap.get(token);
      if (tokenEntry) {
        tokenEntry.termIds.forEach(termId => {
          const currentScore = candidates.get(termId) || 0;
          
          // Calculate TF-IDF score
          const termEntry = this.termMap.get(termId)!;
          const tf = termEntry.tf?.get(token) || 0;
          const idf = tokenEntry.idf || 0;
          const tfidf = tf * idf;
          
          // Boost score for exact token match
          const boost = queryTokenSet.has(token) ? 1.5 : 1.0;
          
          candidates.set(termId, currentScore + (tfidf * boost));
        });
      }
    });

    // Sort and return results
    const results = Array.from(candidates.entries())
      .map(([termId, searchScore]) => ({
        term: this.termMap.get(termId)!,
        score: searchScore * this.termMap.get(termId)!.score // Combine with base PT score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return results;
  }

  /**
   * Get terms that contain all query tokens
   */
  searchExact(query: string, tokenizer: (text: string) => string[]): TermEntry[] {
    const queryTokens = new Set(tokenizer(query));
    if (queryTokens.size === 0) return [];

    // Find terms that contain ALL query tokens
    const candidates: TermEntry[] = [];
    
    for (const termEntry of this.termMap.values()) {
      const termTokens = new Set(termEntry.tokens);
      const hasAllTokens = Array.from(queryTokens).every(token => termTokens.has(token));
      
      if (hasAllTokens) {
        candidates.push(termEntry);
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Get terms that contain any of the query tokens
   */
  searchPartial(query: string, tokenizer: (text: string) => string[]): TermEntry[] {
    const queryTokens = tokenizer(query);
    const matches = new Set<number>();
    
    queryTokens.forEach(token => {
      const tokenEntry = this.tokenMap.get(token);
      if (tokenEntry) {
        tokenEntry.termIds.forEach(termId => matches.add(termId));
      }
    });

    return Array.from(matches)
      .map(termId => this.termMap.get(termId)!)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get token statistics
   */
  getTokenStats(token: string): TokenEntry | null {
    return this.tokenMap.get(token) || null;
  }

  /**
   * Get most frequent tokens
   */
  getTopTokens(limit: number = 20): TokenEntry[] {
    return Array.from(this.tokenMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Serialize index for storage
   */
  serialize(): any {
    const tokenMapSerialized = Array.from(this.tokenMap.entries()).map(([token, entry]) => ({
      token,
      termIds: Array.from(entry.termIds),
      frequency: entry.frequency,
      idf: entry.idf
    }));

    const termMapSerialized = Array.from(this.termMap.entries()).map(([id, entry]) => ({
      id,
      term: entry.term,
      normalizedTerm: entry.normalizedTerm,
      tokens: entry.tokens,
      score: entry.score,
      category: entry.category,
      pt_domain: entry.pt_domain,
      tf: entry.tf ? Array.from(entry.tf.entries()) : []
    }));

    return {
      tokenMap: tokenMapSerialized,
      termMap: termMapSerialized,
      termIdCounter: this.termIdCounter,
      totalTerms: this.totalTerms
    };
  }

  /**
   * Deserialize index from storage
   */
  static deserialize(data: any): TokenIndex {
    const index = new TokenIndex();
    
    // Restore token map
    data.tokenMap.forEach((entry: any) => {
      index.tokenMap.set(entry.token, {
        token: entry.token,
        termIds: new Set(entry.termIds),
        frequency: entry.frequency,
        idf: entry.idf
      });
    });

    // Restore term map
    data.termMap.forEach((entry: any) => {
      index.termMap.set(entry.id, {
        id: entry.id,
        term: entry.term,
        normalizedTerm: entry.normalizedTerm,
        tokens: entry.tokens,
        score: entry.score,
        category: entry.category,
        pt_domain: entry.pt_domain,
        tf: new Map(entry.tf)
      });
    });

    index.termIdCounter = data.termIdCounter;
    index.totalTerms = data.totalTerms;
    
    return index;
  }

  /**
   * Get index statistics
   */
  getStats() {
    const tokenLengths = Array.from(this.tokenMap.keys()).map(t => t.length);
    const avgTokenLength = tokenLengths.reduce((sum, len) => sum + len, 0) / tokenLengths.length;
    
    return {
      uniqueTokens: this.tokenMap.size,
      totalTerms: this.totalTerms,
      avgTokenLength: avgTokenLength.toFixed(2),
      avgTokensPerTerm: (Array.from(this.termMap.values())
        .reduce((sum, term) => sum + term.tokens.length, 0) / this.totalTerms).toFixed(2),
      memoryEstimate: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): string {
    // Rough estimate
    const tokenMapSize = this.tokenMap.size * 50; // 50 bytes per token entry
    const termMapSize = this.totalTerms * 200; // 200 bytes per term entry
    const totalBytes = tokenMapSize + termMapSize;
    
    if (totalBytes > 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (totalBytes > 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${totalBytes} bytes`;
    }
  }
}

/**
 * Medical Tokenizer - Specialized for medical terminology
 */
export class MedicalTokenizer {
  private language: 'ar' | 'en';
  private stopWords: Set<string>;

  constructor(language: 'ar' | 'en') {
    this.language = language;
    this.stopWords = new Set(this.getStopWords());
  }

  /**
   * Tokenize medical text
   */
  tokenize(text: string): string[] {
    let tokens: string[];
    
    if (this.language === 'ar') {
      tokens = this.tokenizeArabic(text);
    } else {
      tokens = this.tokenizeEnglish(text);
    }
    
    // Remove stop words and short tokens
    return tokens.filter(token => 
      token.length > 1 && 
      !this.stopWords.has(token.toLowerCase())
    );
  }

  private tokenizeArabic(text: string): string[] {
    return text
      .replace(/[^\u0600-\u06FF\s]/g, ' ') // Keep only Arabic characters
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private tokenizeEnglish(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Keep only alphanumeric
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private getStopWords(): string[] {
    if (this.language === 'ar') {
      return ['في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي'];
    } else {
      return ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    }
  }
}