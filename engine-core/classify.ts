/**
 * PT Classification Engine
 * Advanced PT relevance detection with confidence scoring
 */
import type { ComposedEngine, ClassificationResult, Item } from './types';

export class PTClassifier {
  private engine: ComposedEngine;
  private arabicNormalizer: (text: string) => string;
  private englishNormalizer: (text: string) => string;

  constructor(engine: ComposedEngine) {
    this.engine = engine;
    this.arabicNormalizer = this.createNormalizer(engine.normalizers.ar);
    this.englishNormalizer = this.createNormalizer(engine.normalizers.en);
  }

  classify(item: Item): ClassificationResult {
    const text = (item.name + ' ' + (item.description || '')).toLowerCase();
    const language = this.detectLanguage(text);
    
    // Normalize text
    const normalized = language === 'ar' 
      ? this.arabicNormalizer(text)
      : this.englishNormalizer(text);

    // Multi-stage classification
    const result: ClassificationResult = {
      item_id: item.id,
      is_pt: false,
      confidence: 0,
      category: null,
      pt_domain: null,
      explanation: [],
      language_detected: language
    };

    // Stage 1: Hard blockers
    if (this.checkBlockers(normalized, language)) {
      result.confidence = 0;
      result.explanation.push('Blocked by exclusion rules');
      return result;
    }

    // Stage 2: NUPCO code analysis (if available)
    if (this.engine.nupco && item.code) {
      const nupcoScore = this.analyzeNupcoCode(item.code);
      result.confidence += nupcoScore.score;
      if (nupcoScore.category) {
        result.category = nupcoScore.category;
      }
      result.explanation.push(`NUPCO analysis: ${nupcoScore.score}`);
    }

    // Stage 3: Vocabulary matching
    const vocabScore = this.matchVocabulary(normalized, language);
    result.confidence += vocabScore.score;
    if (vocabScore.category) {
      result.category = result.category || vocabScore.category;
      result.pt_domain = vocabScore.pt_domain;
    }
    result.explanation.push(`Vocabulary match: ${vocabScore.score}`);

    // Stage 4: Contextual scoring
    const contextScore = this.applyContextualRules(normalized, language);
    result.confidence += contextScore;
    result.explanation.push(`Contextual boost: ${contextScore}`);

    // Stage 5: Brand intelligence (if available)
    if (this.engine.brands) {
      const brandScore = this.analyzeBrands(normalized);
      result.confidence += brandScore;
      result.explanation.push(`Brand analysis: ${brandScore}`);
    }

    // Final determination
    const threshold = language === 'ar' 
      ? this.engine.rules.ar.scoring.thresholds.high_confidence
      : this.engine.rules.en.scoring.thresholds?.high_confidence || 45;

    result.is_pt = result.confidence >= threshold;
    result.confidence = Math.min(Math.max(result.confidence, 0), 100);

    return result;
  }

  private detectLanguage(text: string): 'ar' | 'en' {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
  }

  private createNormalizer(rules: any): (text: string) => string {
    return (text: string) => {
      let normalized = text;
      
      for (const step of rules.processing_order) {
        const rule = rules[step];
        if (typeof rule === 'object' && rule.pattern) {
          normalized = normalized.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
        } else if (typeof rule === 'object') {
          for (const [from, to] of Object.entries(rule)) {
            normalized = normalized.replace(new RegExp(from, 'g'), to as string);
          }
        }
      }
      
      return normalized.trim();
    };
  }

  private checkBlockers(text: string, language: 'ar' | 'en'): boolean {
    const blockers = this.engine.rules[language].filters.hard_blockers;
    
    for (const category of Object.values(blockers)) {
      for (const blocker of category as string[]) {
        if (text.includes(blocker.toLowerCase())) {
          return true;
        }
      }
    }
    
    return false;
  }

  private analyzeNupcoCode(code: string): { score: number; category?: string } {
    if (!this.engine.nupco) return { score: 0 };
    
    const prefix = code.substring(0, 2);
    const mapping = this.engine.nupco.codes.prefix_mapping[prefix];
    
    if (!mapping) return { score: 0 };
    
    switch (mapping.pt_relevance) {
      case 'high': return { score: 30, category: mapping.category };
      case 'medium': return { score: 15, category: mapping.category };
      case 'exclude': return { score: -50 };
      default: return { score: 0 };
    }
  }

  private matchVocabulary(text: string, language: 'ar' | 'en'): 
    { score: number; category?: string; pt_domain?: string } {
    const vocab = this.engine.vocabularies[language];
    let maxScore = 0;
    let bestMatch = null;

    // Check include terms
    for (const term of vocab.include) {
      if (text.includes(term.term)) {
        if (term.score > maxScore) {
          maxScore = term.score;
          bestMatch = term;
        }
      }
    }

    // Check synonym shards
    for (const [shard, synonyms] of Object.entries(vocab.shards)) {
      for (const synonym of synonyms as any[]) {
        if (text.includes(synonym.canonical)) {
          if (synonym.score > maxScore) {
            maxScore = synonym.score;
            bestMatch = synonym;
          }
        }
        // Check synonym variants
        for (const variant of synonym.synonyms || []) {
          if (text.includes(variant)) {
            if (synonym.score > maxScore) {
              maxScore = synonym.score;
              bestMatch = synonym;
            }
          }
        }
      }
    }

    return {
      score: maxScore,
      category: bestMatch?.category,
      pt_domain: bestMatch?.pt_domain
    };
  }

  private applyContextualRules(text: string, language: 'ar' | 'en'): number {
    const rules = this.engine.rules[language].scoring.contextual_boosts;
    let totalBoost = 0;

    for (const [ruleName, rule] of Object.entries(rules)) {
      const ruleObj = rule as { keywords: string[]; boost_factor: number };
      for (const keyword of ruleObj.keywords) {
        if (text.includes(keyword)) {
          totalBoost += (ruleObj.boost_factor - 1) * 20; // Convert factor to points
          break;
        }
      }
    }

    return totalBoost;
  }

  private analyzeBrands(text: string): number {
    if (!this.engine.brands) return 0;
    
    for (const brand of this.engine.brands) {
      if (text.includes(brand.brand.toLowerCase())) {
        return brand.pt_focus ? brand.reputation_score * 0.2 : 0;
      }
    }
    
    return 0;
  }
}