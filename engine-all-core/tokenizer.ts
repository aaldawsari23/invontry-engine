// src/core/tokenizer.ts - Smart Tokenization with Stopword Removal
export class Tokenizer {
  private stopwords: Set<string>;
  private synonymMap: Map<string, string>;
  
  // Common Arabic stopwords
  private readonly arabicStopwords = new Set([
    'في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي',
    'كان', 'كانت', 'هو', 'هي', 'نحن', 'هم', 'أن', 'إن', 'مع', 'عن',
    'بعد', 'قبل', 'عند', 'لكن', 'حتى', 'لم', 'لن', 'قد', 'كل', 'بعض'
  ]);
  
  // Common English stopwords
  private readonly englishStopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'down', 'out', 'over', 'under',
    'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
  ]);
  
  constructor(config: any) {
    this.stopwords = new Set([
      ...this.arabicStopwords,
      ...this.englishStopwords,
      ...(config.stopwords || [])
    ]);
    
    this.synonymMap = new Map();
    this.buildSynonymMap(config);
  }
  
  /**
   * Tokenize text into meaningful terms
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    
    // Split on word boundaries (handles Arabic and English)
    const tokens = text
      .split(/[\s\-_,;:!?.()[\]{}'"]+/)
      .filter(token => token.length > 0)
      .filter(token => !this.isStopword(token))
      .map(token => this.expandSynonym(token));
    
    return [...new Set(tokens)]; // Unique tokens only
  }
  
  /**
   * Check if token is a stopword
   */
  private isStopword(token: string): boolean {
    return this.stopwords.has(token.toLowerCase());
  }
  
  /**
   * Expand token to canonical form if it's a synonym
   */
  private expandSynonym(token: string): string {
    const normalized = token.toLowerCase();
    return this.synonymMap.get(normalized) || normalized;
  }
  
  /**
   * Build synonym map from config
   */
  private buildSynonymMap(config: any): void {
    if (!config.synonyms?.mappings) return;
    
    for (const [canonical, aliases] of Object.entries(config.synonyms.mappings)) {
      for (const alias of aliases as string[]) {
        this.synonymMap.set(alias.toLowerCase(), canonical.toLowerCase());
      }
    }
    
    // Add Arabic aliases
    if (config.synonyms?.arabic_aliases) {
      for (const [canonical, aliases] of Object.entries(config.synonyms.arabic_aliases)) {
        for (const alias of aliases as string[]) {
          this.synonymMap.set(alias, canonical);
        }
      }
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: any): void {
    this.stopwords.clear();
    this.stopwords = new Set([
      ...this.arabicStopwords,
      ...this.englishStopwords,
      ...(config.stopwords || [])
    ]);
    
    this.synonymMap.clear();
    this.buildSynonymMap(config);
  }
  
  /**
   * Get n-grams from tokens
   */
  getNgrams(tokens: string[], n: number = 2): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
}