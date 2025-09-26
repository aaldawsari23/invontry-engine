import { describe, it, expect, beforeEach } from 'vitest';
import { UltraRehabDetector, UltraConfig } from '../src/ultra-rehab-detector';

describe('UltraRehabDetector - 500% Accuracy System', () => {
  let detector: UltraRehabDetector;
  
  beforeEach(() => {
    // Configure with representative sample data
    const config: UltraConfig = {
      includeTerms: [
        'wheelchair', 'walker', 'crutches', 'therapeutic ultrasound', 'tens unit', 
        'goniometer', 'dynamometer', 'treadmill', 'exercise bike', 'therapy table',
        'resistance band', 'hot pack', 'cold pack', 'cervical collar', 'knee brace'
      ],
      excludeTerms: [
        'surgical scalpel', 'diagnostic ultrasound', 'x-ray', 'CT scanner', 
        'defibrillator', 'anesthesia', 'surgical drill', 'laboratory equipment'
      ],
      strongPtTerms: [
        'goniometer', 'inclinometer', 'dynamometer', 'TheraBand', 'AFO', 'KAFO',
        'CPM', 'BOSU', 'GAITRite', 'Biodex', 'Chattanooga', 'cervical traction'
      ],
      diagnosticBlockers: [
        'diagnostic ultrasound', 'CT scanner', 'MRI coil', 'mammography', 
        'angiography', 'TEE', 'vascular ultrasound'
      ],
      brandMap: {
        'Chattanooga': ['ultrasound', 'e-stim', 'traction', 'hydrocollator'],
        'BTL': ['ultrasound', 'e-stim', 'laser', 'diathermy'],
        'Biodex': ['isokinetic', 'balance', 'gait'],
        'GAITRite': ['gait', 'pressure']
      },
      categoryRules: {
        'Modalities': ['ultrasound', 'tens', 'laser', 'heat pack', 'traction'],
        'Exercise & Active Rehab': ['treadmill', 'bike', 'resistance band', 'dumbbell'],
        'Assessment Tools': ['goniometer', 'dynamometer', 'force plate'],
        'ADL & Mobility': ['wheelchair', 'walker', 'crutches', 'cane'],
        'Orthotics & Supports': ['brace', 'splint', 'orthosis', 'collar']
      },
      conditionalIncludes: [
        {
          term: 'ultrasound gel',
          require_any: ['therapeutic ultrasound', 'chattanooga', '1 mhz'],
          block_if_any: ['diagnostic', 'probe', 'transvaginal']
        }
      ],
      arabicAliases: {
        'wheelchair': ['كرسي متحرك', 'عربة متحركة'],
        'walker': ['مشاية', 'ووكر'],
        'brace': ['دعامة', 'مشد', 'جبيرة']
      },
      weights: {
        include: 10,
        include_brand_or_model: 20,
        include_strong_pt: 25,
        ignore: -15,
        diagnostic_blocker: -25
      },
      thresholds: {
        accept_min_score: 10,
        review_lower_bound: 5
      }
    };
    
    detector = new UltraRehabDetector(config);
  });

  describe('Advanced Detection Capabilities', () => {
    it('should detect physiotherapy equipment with very high confidence', () => {
      const items = [{
        id: '1',
        name: 'Chattanooga Intelect Legend XT 4-Channel Electrotherapy Unit with Ultrasound',
        brand: 'Chattanooga',
        model: 'Intelect Legend XT',
        category: 'Electrotherapy',
        description: 'Professional electrotherapy and therapeutic ultrasound system for physical therapy'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.score).toBeGreaterThan(80);
      expect(result.confidence_level).toBe('very_high');
      expect(result.category_detected).toBe('Modalities');
      expect(result.semantic_matches.length).toBeGreaterThan(0);
      expect(result.market_intelligence.saudi_relevance).toBeGreaterThan(0);
    });

    it('should identify mobility equipment accurately', () => {
      const items = [{
        id: '2',
        name: 'Invacare MyOn+ Power Wheelchair with Tilt-in-Space Seating System',
        brand: 'Invacare',
        model: 'MyOn+',
        description: 'Advanced power wheelchair for mobility and independence'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.score).toBeGreaterThan(60);
      expect(result.category_detected).toBe('ADL & Mobility');
      expect(result.subcategory_detected).toBe('Wheelchairs');
      expect(result.semantic_matches.some(match => match.includes('mobility'))).toBeTruthy();
    });

    it('should reject non-PT equipment with high accuracy', () => {
      const items = [{
        id: '3',
        name: 'GE Vivid E90 Cardiovascular Diagnostic Ultrasound System',
        brand: 'GE Healthcare',
        description: 'Advanced diagnostic ultrasound for cardiology examinations'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.score).toBeLessThan(20);
      expect(['low', 'medium'].includes(result.confidence_level)).toBeTruthy();
    });

    it('should handle Arabic equipment names', () => {
      const items = [{
        id: '4',
        name: 'كرسي متحرك يدوي خفيف الوزن - Manual Lightweight Wheelchair',
        description: 'كرسي متحرك للمرضى - wheelchair for patients mobility'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.score).toBeGreaterThan(50);
      expect(result.language_detection.primary).toBe('mixed');
      expect(result.language_detection.arabic_terms.length).toBeGreaterThan(0);
      expect(result.category_detected).toBe('ADL & Mobility');
    });

    it('should apply brand intelligence correctly', () => {
      const items = [{
        id: '5',
        name: 'BTL-4000 Series Laser Therapy System',
        brand: 'BTL',
        model: '4000 Series',
        description: 'High-intensity laser therapy for pain management'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.validation_layers.brand_layer).toBeGreaterThan(15);
      expect(result.score).toBeGreaterThan(70);
      expect(result.category_detected).toBe('Modalities');
    });

    it('should use fuzzy matching for misspelled terms', () => {
      const items = [{
        id: '6',
        name: 'Goniometre Range of Motion Measurement Device',
        description: 'Digital goniometre for measuring joint angles'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.fuzzy_matches.length).toBeGreaterThan(0);
      expect(result.fuzzy_matches.some(match => match.term === 'goniometer')).toBeTruthy();
      expect(result.score).toBeGreaterThan(40);
    });

    it('should handle conditional includes properly', () => {
      const items = [{
        id: '7',
        name: 'Therapeutic Ultrasound Coupling Gel 1MHz Compatible',
        description: 'Professional ultrasound gel for Chattanooga therapy units'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.validation_layers.contextual_layer).toBeGreaterThan(10);
      expect(result.score).toBeGreaterThan(30);
    });

    it('should detect Saudi market relevance', () => {
      const items = [{
        id: '8',
        name: 'SEERS Medical Hi-Lo Treatment Table - SFDA Approved',
        brand: 'SEERS Medical',
        description: 'Electric height adjustable therapy table, CE marked and SFDA certified'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.market_intelligence.saudi_relevance).toBeGreaterThan(2);
      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('Multi-Layer Validation System', () => {
    it('should score all validation layers for comprehensive equipment', () => {
      const items = [{
        id: '9',
        name: 'Biodex Balance System SD - Advanced Balance Assessment and Training Platform',
        brand: 'Biodex',
        model: 'Balance System SD',
        category: 'Assessment Equipment',
        description: 'Computer-controlled balance training system for rehabilitation and research'
      }];

      const results = detector.processItems(items);
      const result = results[0];
      const layers = result.validation_layers;

      expect(layers.keyword_layer).toBeGreaterThan(20); // Strong PT terms
      expect(layers.semantic_layer).toBeGreaterThan(10); // Semantic matches
      expect(layers.pattern_layer).toBeGreaterThan(5);   // ML patterns
      expect(layers.brand_layer).toBeGreaterThan(15);    // Brand intelligence
      expect(layers.contextual_layer).toBeGreaterThan(0); // Context analysis
      
      expect(result.confidence_level).toBe('very_high');
      expect(result.score).toBeGreaterThan(85);
    });

    it('should provide detailed decision reasoning', () => {
      const items = [{
        id: '10',
        name: 'HUR Pneumatic Rehabilitation Exercise Equipment',
        brand: 'HUR',
        description: 'Pneumatic resistance training for elderly and rehabilitation'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.decision_reason).toContain('keyword');
      expect(result.decision_reason.length).toBeGreaterThan(10);
      expect(result.semantic_matches.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Statistics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = detector.getStats();
      
      expect(stats.detector_version).toBe('500% Ultra Accuracy');
      expect(stats.validation_layers).toBe(6);
      expect(stats.semantic_groups).toBe(12);
      expect(stats.ml_patterns).toBe(15);
      expect(stats.fuzzy_algorithms).toBe(2);
      expect(stats.saudi_suppliers).toBe(20);
      expect(stats.confidence_levels).toBe(4);
    });

    it('should process multiple items efficiently', () => {
      const items = Array.from({length: 50}, (_, i) => ({
        id: `test-${i}`,
        name: `Test Equipment ${i} - Therapy Device`,
        description: 'Sample rehabilitation equipment for testing'
      }));

      const startTime = Date.now();
      const results = detector.processItems(items);
      const processingTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(processingTime).toBeLessThan(1000); // Should process 50 items in under 1 second
      expect(results.every(r => r.score !== undefined)).toBeTruthy();
    });
  });

  describe('Language Detection', () => {
    it('should detect English content', () => {
      const items = [{
        id: '11',
        name: 'Physical Therapy Exercise Equipment',
        description: 'Professional rehabilitation training system'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.language_detection.primary).toBe('en');
      expect(result.language_detection.confidence).toBeGreaterThan(0.7);
      expect(result.language_detection.english_terms.length).toBeGreaterThan(0);
    });

    it('should detect Arabic content', () => {
      const items = [{
        id: '12',
        name: 'أجهزة العلاج الطبيعي والتأهيل الطبي',
        description: 'معدات طبية متخصصة للعلاج الطبيعي'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.language_detection.primary).toBe('ar');
      expect(result.language_detection.arabic_terms.length).toBeGreaterThan(0);
    });

    it('should detect mixed language content', () => {
      const items = [{
        id: '13',
        name: 'Rehabilitation Equipment - أجهزة تأهيل طبي',
        description: 'Physical therapy device - جهاز علاج طبيعي'
      }];

      const results = detector.processItems(items);
      const result = results[0];

      expect(result.language_detection.primary).toBe('mixed');
      expect(result.language_detection.arabic_terms.length).toBeGreaterThan(0);
      expect(result.language_detection.english_terms.length).toBeGreaterThan(0);
    });
  });
});