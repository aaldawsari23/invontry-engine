import { Normalizer } from './normalizer';
import type { FilterOptions } from '../types';

// src/core/filter.ts - Advanced Filtering System
export class Filter {
  private config: any;
  private normalizer: Normalizer;
  
  constructor(config: any) {
    this.config = config;
    this.normalizer = new Normalizer();
  }
  
  /**
   * Apply filters to processed items
   */
  apply(items: any[], filters: FilterOptions): any[] {
    let filtered = [...items];
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(item => 
        filters.status!.includes(item.status)
      );
    }
    
    // Category filter
    if (filters.category && filters.category.length > 0) {
      const normalizedCategories = filters.category.map(c => 
        this.normalizer.normalize(c)
      );
      filtered = filtered.filter(item => {
        const itemCategory = this.normalizer.normalize(item.category || '');
        return normalizedCategories.some(cat => 
          itemCategory.includes(cat) || cat.includes(itemCategory)
        );
      });
    }
    
    // Brand filter
    if (filters.brand && filters.brand.length > 0) {
      const normalizedBrands = filters.brand.map(b => 
        this.normalizer.normalize(b)
      );
      filtered = filtered.filter(item => {
        const itemBrand = this.normalizer.normalize(item.brand || '');
        return normalizedBrands.some(brand => 
          itemBrand.includes(brand) || brand.includes(itemBrand)
        );
      });
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.tags || item.tags.length === 0) return false;
        const itemTags = item.tags.map((t: string) => 
          this.normalizer.normalize(t)
        );
        return filters.tags!.some(tag => 
          itemTags.includes(this.normalizer.normalize(tag))
        );
      });
    }
    
    // Region filter
    if (filters.region && filters.region.length > 0) {
      filtered = filtered.filter(item => 
        filters.region!.includes(item.region)
      );
    }
    
    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(item => 
        filters.type!.includes(item.type)
      );
    }
    
    // Free-text query filter
    if (filters.query && filters.query.trim()) {
      const query = this.normalizer.normalize(filters.query);
      const queryTokens = query.split(/\s+/);
      
      filtered = filtered.filter(item => {
        const searchableText = this.normalizer.normalize(
          `${item.name || ''} ${item.description || ''} ${item.brand || ''} ${item.model || ''}`
        );
        
        // Check if all query tokens are present
        return queryTokens.every(token => 
          searchableText.includes(token) || 
          item.tokens.some((t: string) => t.includes(token))
        );
      });
    }
    
    // Score range filter
    if (filters.minScore !== undefined) {
      filtered = filtered.filter(item => item.score >= filters.minScore!);
    }
    if (filters.maxScore !== undefined) {
      filtered = filtered.filter(item => item.score <= filters.maxScore!);
    }
    
    return filtered;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: any): void {
    this.config = config;
  }
}