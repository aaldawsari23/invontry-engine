import { describe, it, expect, beforeEach } from 'vitest';
import { PTFilterEngine } from '../src/engine';
import { Normalizer } from '../src/core/normalizer';

describe('Normalizer', () => {
  let normalizer: Normalizer;
  
  beforeEach(() => {
    normalizer = new Normalizer();
  });
  
  describe('Arabic normalization', () => {
    it('should normalize hamza variants', () => {
      expect(normalizer.normalize('أحمد')).toBe('احمد');
      expect(normalizer.normalize('إبراهيم')).toBe('ابراهيم');
      expect(normalizer.normalize('آلة')).toBe('الة');
    });
    
    it('should normalize ya variants', () => {
      expect(normalizer.normalize('مستشفى')).toBe('مستشفي');
    });
    
    it('should normalize tah marbuta', () => {
      expect(normalizer.normalize('مدرسة')).toBe('مدرسه');
    });
  });
  
  describe('Fingerprint generation', () => {
    it('should generate token-based fingerprints', () => {
      const fp1 = normalizer.fingerprint('wheelchair manual');
      const fp2 = normalizer.fingerprint('manual wheelchair');
      expect(fp1).toBe(fp2); // Same tokens, different order
    });
  });
});

describe('PTFilterEngine', () => {
  let engine: PTFilterEngine;
  
  beforeEach(() => {
    const config = {
      weights: {
        title: 2.0,
        brand: 1.5
      },
      thresholds: {
        accept_min_score: 60,
        review_lower_bound: 40
      },
      gates: {
        ignore_terms: ['surgical'],
        include_terms: ['therapy']
      },
      diagnostic_blockers: [],
      strong_pt_terms: [],
      variant_patterns: {}
    };
    
    engine = new PTFilterEngine(config as any);
  });
  
  it('should process items and assign scores', () => {
    const items = [
      {
        id: '1',
        name: 'Therapy Device'
      }
    ];
    
    const result = engine.process(items as any);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].score).toBeGreaterThan(0);
  });
});
