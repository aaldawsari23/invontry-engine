import { Normalizer } from './normalizer';

// src/core/dedupe.ts - Intelligent Deduplication
export class Deduplicator {
  private config: any;
  private normalizer: Normalizer;
  
  constructor(config: any) {
    this.config = config;
    this.normalizer = new Normalizer();
  }
  
  /**
   * Deduplicate items based on fingerprint and variant patterns
   */
  dedupe(items: any[]): any[] {
    const seen = new Map<string, any>();
    const variantGroups = new Map<string, any[]>();
    
    // First pass: identify exact duplicates and variants
    for (const item of items) {
      const baseKey = this.getBaseKey(item);
      const variantKey = this.getVariantKey(item);
      
      // Check for exact duplicate
      if (seen.has(item.fingerprint)) {
        const existing = seen.get(item.fingerprint);
        // Keep the one with more complete data
        if (this.getCompleteness(item) > this.getCompleteness(existing)) {
          seen.set(item.fingerprint, item);
        }
        continue;
      }
      
      seen.set(item.fingerprint, item);
      
      // Group variants
      if (!variantGroups.has(baseKey)) {
        variantGroups.set(baseKey, []);
      }
      variantGroups.get(baseKey)!.push(item);
    }
    
    // Second pass: consolidate variants
    const deduplicated: any[] = [];
    
    for (const [baseKey, variants] of variantGroups) {
      if (variants.length === 1) {
        deduplicated.push(variants[0]);
      } else {
        // Consolidate variants into a single item
        const consolidated = this.consolidateVariants(variants);
        deduplicated.push(consolidated);
      }
    }
    
    return deduplicated;
  }
  
  /**
   * Get base key for variant grouping (removes size, color, side variations)
   */
  private getBaseKey(item: any): string {
    let key = `${item.sku || ''}_${item.brand || ''}_${item.normalized.name || ''}`;
    
    // Remove variant patterns
    if (this.config.variant_patterns) {
      for (const pattern of Object.values(this.config.variant_patterns)) {
        const regex = new RegExp(pattern as string, 'gi');
        key = key.replace(regex, '');
      }
    }
    
    return this.normalizer.fingerprint(key);
  }
  
  /**
   * Get variant key (includes variations)
   */
  private getVariantKey(item: any): string {
    const variantInfo = this.extractVariantInfo(item);
    return `${this.getBaseKey(item)}_${variantInfo.join('_')}`;
  }
  
  /**
   * Extract variant information from item
   */
  private extractVariantInfo(item: any): string[] {
    const variants: string[] = [];
    const text = `${item.name || ''} ${item.description || ''}`;
    
    if (this.config.variant_patterns) {
      // Extract size
      if (this.config.variant_patterns.size) {
        const sizeMatch = text.match(new RegExp(this.config.variant_patterns.size, 'i'));
        if (sizeMatch) variants.push(`size:${sizeMatch[0]}`);
      }
      
      // Extract side
      if (this.config.variant_patterns.side) {
        const sideMatch = text.match(new RegExp(this.config.variant_patterns.side, 'i'));
        if (sideMatch) variants.push(`side:${sideMatch[0]}`);
      }
      
      // Extract color
      if (this.config.variant_patterns.color) {
        const colorMatch = text.match(new RegExp(this.config.variant_patterns.color, 'i'));
        if (colorMatch) variants.push(`color:${colorMatch[0]}`);
      }
      
      // Extract resistance level
      if (this.config.variant_patterns.resistance) {
        const resistanceMatch = text.match(new RegExp(this.config.variant_patterns.resistance, 'i'));
        if (resistanceMatch) variants.push(`resistance:${resistanceMatch[0]}`);
      }
    }
    
    return variants;
  }
  
  /**
   * Consolidate multiple variants into a single item
   */
  private consolidateVariants(variants: any[]): any {
    // Sort by completeness and choose the most complete as base
    variants.sort((a, b) => this.getCompleteness(b) - this.getCompleteness(a));
    
    const base = { ...variants[0] };
    const variantInfo: any[] = [];
    const allPrices: number[] = [];
    
    // Collect all variant information
    for (const variant of variants) {
      const info = this.extractVariantInfo(variant);
      if (info.length > 0) {
        variantInfo.push({
          sku: variant.sku,
          variants: info,
          price: variant.price
        });
      }
      if (variant.price) allPrices.push(variant.price);
    }
    
    // Add variant information to base item
    base.availableVariants = variantInfo;
    base.variantCount = variants.length;
    
    // Set price range if applicable
    if (allPrices.length > 0) {
      base.priceMin = Math.min(...allPrices);
      base.priceMax = Math.max(...allPrices);
      base.price = base.priceMin; // Use minimum for sorting
    }
    
    // Merge descriptions if different
    const descriptions = new Set(
      variants
        .map(v => v.description)
        .filter(d => d && d.trim())
    );
    if (descriptions.size > 1) {
      base.description = Array.from(descriptions).join(' | ');
    }
    
    return base;
  }
  
  /**
   * Calculate item completeness score
   */
  private getCompleteness(item: any): number {
    let score = 0;
    
    if (item.name) score += 3;
    if (item.description) score += 2;
    if (item.brand) score += 2;
    if (item.model) score += 1;
    if (item.sku) score += 1;
    if (item.price) score += 1;
    if (item.category) score += 1;
    if (item.image) score += 1;
    
    // Prefer English over Arabic for base items
    if (item.name && !this.hasArabic(item.name)) score += 1;
    
    return score;
  }
  
  /**
   * Check if text contains Arabic characters
   */
  private hasArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text);
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: any): void {
    this.config = config;
  }
}