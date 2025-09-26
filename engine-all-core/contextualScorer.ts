
import { KnowledgePack } from '../knowledge/schemas';

interface ScorerContext {
  matchedCanonicals: Set<string>;
  textCorpus: string;
  baseScore: number;
  brand?: string;
}

interface ScoreOutput {
    finalScore: number;
    explanation: string[];
}

export class ContextualScorer {
  private knowledge: KnowledgePack;

  constructor(knowledgePack: KnowledgePack) {
    this.knowledge = knowledgePack;
  }

  calculate(ctx: ScorerContext): ScoreOutput {
    let score = ctx.baseScore;
    const explanation: string[] = [`Base score from keywords: ${score.toFixed(2)}`];
    const corpusLower = ctx.textCorpus.toLowerCase();
    
    // 1. Negative Blockers & Demotions
    for (const blocker of this.knowledge.negatives.blockers) {
      if (corpusLower.includes(blocker)) {
        score += this.knowledge.weights.score_modifiers.diagnostic_blocker;
        explanation.push(`[BLOCKER] Found '${blocker}'. Score decreased by ${this.knowledge.weights.score_modifiers.diagnostic_blocker}.`);
        // Early exit for major blockers
        return { finalScore: Math.round(score), explanation };
      }
    }
    for (const demotion of this.knowledge.negatives.demotions) {
      if (corpusLower.includes(demotion)) {
        score += this.knowledge.weights.score_modifiers.demotion_term;
        explanation.push(`[DEMOTION] Found '${demotion}'. Score decreased by ${this.knowledge.weights.score_modifiers.demotion_term}.`);
      }
    }
    
    // 2. Co-occurrence rules (example)
    if(ctx.matchedCanonicals.has('Ultrasound Therapy') && corpusLower.includes('therapeutic')){
        score += 15;
        explanation.push(`[BOOST] "Ultrasound" + "therapeutic" co-occurrence. Score increased by 15.`);
    }
    if(ctx.matchedCanonicals.has('TENS Unit') && ctx.matchedCanonicals.has('Electrode')){
        score += 10;
        explanation.push(`[BOOST] "TENS" + "Electrode" co-occurrence. Score increased by 10.`);
    }

    // 3. Brand boost
    if(ctx.brand) {
        const brandLower = ctx.brand.toLowerCase();
        const boost = this.knowledge.weights.brand_boost[brandLower as keyof typeof this.knowledge.weights.brand_boost] ?? 0;
        if(boost > 0) {
            score += boost;
            explanation.push(`[BOOST] Brand '${ctx.brand}' boost. Score increased by ${boost}.`);
        }
    }
    
    return { finalScore: Math.round(score), explanation };
  }
}
