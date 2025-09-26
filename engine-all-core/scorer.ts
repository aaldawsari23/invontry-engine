import type { ScoreBreakdown } from '../types';

// src/core/scorer.ts - Intelligent Scoring with Explainability
export class Scorer {
  private config: any;
  private includeTerms: Set<string>;
  private ignoreTerms: Set<string>;
  private diagnosticBlockers: Set<string>;
  private strongPTTerms: Set<string>;
  private brandMap: Map<string, string[]>;
  private categoryRules: Map<string, string[]>;
  
  constructor(config: any) {
    this.config = config;
    this.initializeSets();
  }
  
  /**
   * Score an item with full breakdown
   */
  score(item: any): {
    score: number;
    scoreBreakdown: ScoreBreakdown;
    matchedPositive: string[];
    matchedNegative: string[];
    matchedSynonyms: string[];
    blockedByGate?: string;
  } {
    const breakdown: ScoreBreakdown = {
      baseScore: 40, // Start with base score
      titleMatch: 0,
      brandMatch: 0,
      categoryMatch: 0,
      descriptionMatch: 0,
      modelMatch: 0,
      exactBonus: 0,
      synonymBonus: 0,
      diagnosticPenalty: 0,
      ignorePenalty: 0,
      strongPTBonus: 0
    };
    
    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];
    const matchedSynonyms: string[] = [];
    let blockedByGate: string | undefined;
    
    // Gate checks first
    const gateResult = this.checkGates(item);
    if (gateResult.blocked) {
      blockedByGate = gateResult.reason;
      breakdown.ignorePenalty = -100; // Hard block
    }
    
    // Check title/name
    if (item.normalized.name) {
      const titleScore = this.scoreField(
        item.normalized.name,
        item.tokens,
        'title'
      );
      breakdown.titleMatch = titleScore.score;
      matchedPositive.push(...titleScore.matched);
      matchedNegative.push(...titleScore.negative);
    }
    
    // Check brand
    if (item.normalized.brand) {
      const brandScore = this.scoreBrand(item.normalized.brand);
      breakdown.brandMatch = brandScore;
      if (brandScore > 0) {
        matchedPositive.push(`brand:${item.brand}`);
      }
    }
    
    // Check category
    if (item.normalized.category) {
      const categoryScore = this.scoreCategory(
        item.normalized.category,
        item.category
      );
      breakdown.categoryMatch = categoryScore;
      if (categoryScore > 0) {
        matchedPositive.push(`category:${item.category}`);
      }
    }
    
    // Check description
    if (item.normalized.description) {
      const descScore = this.scoreField(
        item.normalized.description,
        item.tokens,
        'description'
      );
      breakdown.descriptionMatch = descScore.score;
      matchedPositive.push(...descScore.matched);
    }
    
    // Check model
    if (item.normalized.model) {
      const modelScore = this.scoreField(
        item.normalized.model,
        item.tokens,
        'model'
      );
      breakdown.modelMatch = modelScore.score;
    }
    
    // Check for strong PT terms
    const strongMatches = this.checkStrongPTTerms(item.tokens);
    if (strongMatches.length > 0) {
      breakdown.strongPTBonus = strongMatches.length * 10;
      matchedPositive.push(...strongMatches.map(t => `strong:${t}`));
    }
    
    // Check for diagnostic blockers
    const diagnosticMatches = this.checkDiagnosticBlockers(item.tokens);
    if (diagnosticMatches.length > 0) {
      breakdown.diagnosticPenalty = diagnosticMatches.length * -15;
      matchedNegative.push(...diagnosticMatches.map(t => `diagnostic:${t}`));
    }
    
    // Calculate final score
    let finalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    finalScore = Math.max(0, Math.min(100, finalScore)); // Clamp 0-100
    
    return {
      score: finalScore,
      scoreBreakdown: breakdown,
      matchedPositive,
      matchedNegative,
      matchedSynonyms,
      blockedByGate
    };
  }
  
  /**
   * Check gate conditions
   */
  private checkGates(item: any): { blocked: boolean; reason?: string } {
    const allText = `${item.normalized.name} ${item.normalized.description} ${item.normalized.brand}`;
    
    // Check hard ignore terms
    for (const term of this.ignoreTerms) {
      if (allText.includes(term)) {
        return { blocked: true, reason: `blocked by ignore term: ${term}` };
      }
    }
    
    // Check conditional includes
    if (this.config.gates?.conditional_includes) {
      for (const condition of this.config.gates.conditional_includes) {
        if (allText.includes(condition.term)) {
          // Check if any required terms are present
          if (condition.require_any) {
            const hasRequired = condition.require_any.some((req: string) => 
              allText.includes(req.toLowerCase())
            );
            if (!hasRequired) {
              return { 
                blocked: true, 
                reason: `${condition.term} requires one of: ${condition.require_any.join(', ')}` 
              };
            }
          }
          
          // Check if any blocking terms are present
          if (condition.block_if_any) {
            const hasBlocker = condition.block_if_any.some((block: string) => 
              allText.includes(block.toLowerCase())
            );
            if (hasBlocker) {
              return { 
                blocked: true, 
                reason: `${condition.term} blocked by diagnostic context` 
              };
            }
          }
        }
      }
    }
    
    return { blocked: false };
  }
  
  /**
   * Score a specific field
   */
  private scoreField(
    fieldText: string,
    tokens: string[],
    fieldType: string
  ): { score: number; matched: string[]; negative: string[] } {
    const matched: string[] = [];
    const negative: string[] = [];
    let score = 0;
    
    const weight = this.config.weights[fieldType] || 1;
    
    // Check for include terms
    for (const term of this.includeTerms) {
      if (fieldText.includes(term) || tokens.includes(term)) {
        score += weight * 5;
        matched.push(term);
      }
    }
    
    // Check for ignore terms (penalty)
    for (const term of this.ignoreTerms) {
      if (fieldText.includes(term) || tokens.includes(term)) {
        score -= weight * 8;
        negative.push(term);
      }
    }
    
    return { score, matched, negative };
  }
  
  /**
   * Score brand matching
   */
  private scoreBrand(brandText: string): number {
    if (!brandText) return 0;
    
    for (const [brand, products] of this.brandMap) {
      if (brandText.includes(brand.toLowerCase())) {
        return this.config.weights.brand * 10;
      }
    }
    
    return 0;
  }
  
  /**
   * Score category matching
   */
  private scoreCategory(categoryText: string, originalCategory: string): number {
    if (!categoryText) return 0;
    
    const weight = this.config.weights.category || 1;
    
    // Check category rules
    for (const [category, keywords] of this.categoryRules) {
      if (originalCategory === category || categoryText.includes(category.toLowerCase())) {
        return weight * 8;
      }
      
      // Check if any keywords match
      for (const keyword of keywords) {
        if (categoryText.includes(keyword.toLowerCase())) {
          return weight * 5;
        }
      }
    }
    
    return 0;
  }
  
  /**
   * Check for strong PT terms
   */
  private checkStrongPTTerms(tokens: string[]): string[] {
    const matched: string[] = [];
    
    for (const term of this.strongPTTerms) {
      if (tokens.some(t => t.includes(term.toLowerCase()))) {
        matched.push(term);
      }
    }
    
    return matched;
  }
  
  /**
   * Check for diagnostic blockers
   */
  private checkDiagnosticBlockers(tokens: string[]): string[] {
    const matched: string[] = [];
    
    for (const blocker of this.diagnosticBlockers) {
      if (tokens.some(t => t.includes(blocker.toLowerCase()))) {
        matched.push(blocker);
      }
    }
    
    return matched;
  }
  
  /**
   * Initialize sets from config
   */
  private initializeSets(): void {
    this.includeTerms = new Set(
      (this.config.gates?.include_terms || []).map((t: string) => t.toLowerCase())
    );
    
    this.ignoreTerms = new Set(
      (this.config.gates?.ignore_terms || []).map((t: string) => t.toLowerCase())
    );
    
    this.diagnosticBlockers = new Set(
      (this.config.diagnostic_blockers || []).map((t: string) => t.toLowerCase())
    );
    
    this.strongPTTerms = new Set(
      (this.config.strong_pt_terms || []).map((t: string) => t.toLowerCase())
    );
    
    this.brandMap = new Map();
    if (this.config.brand_map) {
      for (const [brand, products] of Object.entries(this.config.brand_map)) {
        this.brandMap.set(brand.toLowerCase(), products as string[]);
      }
    }
    
    this.categoryRules = new Map();
    if (this.config.category_rules) {
      for (const [category, keywords] of Object.entries(this.config.category_rules)) {
        this.categoryRules.set(
          category.toLowerCase(), 
          (keywords as string[]).map(k => k.toLowerCase())
        );
      }
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: any): void {
    this.config = config;
    this.initializeSets();
  }
}