// src/core/normalizer.ts - Text Normalization for Arabic/English
export class Normalizer {
  private readonly arabicDiacritics = /[\u064B-\u065F\u0670]/g;
  private readonly tatweel = /\u0640/g;
  
  /**
   * Comprehensive normalization for Arabic and English text
   */
  normalize(text: string): string {
    if (!text) return '';
    
    let normalized = text;
    
    // Arabic normalization
    normalized = this.normalizeArabic(normalized);
    
    // English normalization
    normalized = normalized.toLowerCase();
    
    // Whitespace normalization
    normalized = normalized
      .trim()
      .replace(/\s+/g, ' ');
    
    return normalized;
  }
  
  /**
   * Arabic-specific normalization
   */
  private normalizeArabic(text: string): string {
    return text
      // Remove diacritics
      .replace(this.arabicDiacritics, '')
      // Remove tatweel
      .replace(this.tatweel, '')
      // Normalize hamza variants to alef
      .replace(/[أإآ]/g, 'ا')
      // Normalize ya variants
      .replace(/ى/g, 'ي')
      // Normalize tah marbuta
      .replace(/ة/g, 'ه')
      // Normalize waw hamza
      .replace(/ؤ/g, 'و')
      // Normalize ya hamza
      .replace(/ئ/g, 'ي')
      // Convert Arabic-Indic digits to Western
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
  }
  
  /**
   * Generate token-based fingerprint for deduplication
   */
  fingerprint(text: string): string {
    const normalized = this.normalize(text);
    const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
    return tokens
      .sort()
      .join('');
  }
}