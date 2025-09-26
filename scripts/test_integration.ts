/**
 * Integration Test Script
 * Tests the new PT modular architecture against legacy system
 */
import { BrowserPTLoader } from '../adapters/browser/loader';

interface TestItem {
  id: string;
  name: string;
  description?: string;
  code?: string;
  expected_pt: boolean;
  expected_confidence_min?: number;
}

const TEST_ITEMS: TestItem[] = [
  // High confidence PT items
  {
    id: '1',
    name: 'Wheelchair Manual Standard',
    expected_pt: true,
    expected_confidence_min: 80
  },
  {
    id: '2', 
    name: 'كرسي متحرك يدوي',
    expected_pt: true,
    expected_confidence_min: 80
  },
  {
    id: '3',
    name: 'TENS Unit Dual Channel',
    expected_pt: true,
    expected_confidence_min: 70
  },
  {
    id: '4',
    name: 'جهاز تحفيز كهربائي',
    expected_pt: true,
    expected_confidence_min: 70
  },
  
  // Medium confidence items
  {
    id: '5',
    name: 'Treadmill Medical Grade',
    expected_pt: true,
    expected_confidence_min: 60
  },
  {
    id: '6',
    name: 'Resistance Band Set',
    expected_pt: true,
    expected_confidence_min: 50
  },
  
  // Should be excluded
  {
    id: '7',
    name: 'CT Scanner 64 Slice',
    expected_pt: false
  },
  {
    id: '8',
    name: 'جهاز أشعة مقطعية',
    expected_pt: false
  },
  {
    id: '9',
    name: 'Surgical Scalpel Set',
    expected_pt: false
  },
  {
    id: '10',
    name: 'Antibiotic Medication',
    expected_pt: false
  }
];

export class PTIntegrationTester {
  private engine: BrowserPTLoader;
  private results: any[] = [];

  constructor() {
    this.engine = new BrowserPTLoader();
  }

  async runTests(): Promise<void> {
    console.log('🧪 Starting PT Engine Integration Tests...\n');

    try {
      // Initialize engine
      console.log('Initializing PT Engine (lite profile)...');
      await this.engine.initialize('lite');
      console.log('✅ Engine initialized\n');

      // Run classification tests
      await this.runClassificationTests();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }
  }

  private async runClassificationTests(): Promise<void> {
    console.log('🎯 Running Classification Accuracy Tests...\n');

    let passed = 0;
    let failed = 0;

    for (const testItem of TEST_ITEMS) {
      try {
        const result = this.engine.classify(testItem);
        
        const isCorrect = result.is_pt === testItem.expected_pt &&
                         (!testItem.expected_confidence_min || result.confidence >= testItem.expected_confidence_min);
        
        if (isCorrect) {
          passed++;
          console.log(`✅ ${testItem.name} - PT: ${result.is_pt}, Confidence: ${result.confidence}%`);
        } else {
          failed++;
          console.log(`❌ ${testItem.name} - Expected PT: ${testItem.expected_pt}, Got: ${result.is_pt}, Confidence: ${result.confidence}%`);
        }

        this.results.push({
          item: testItem,
          result: result,
          passed: isCorrect
        });

      } catch (error) {
        failed++;
        console.log(`❌ ${testItem.name} - Error: ${error.message}`);
      }
    }

    console.log(`\n📊 Classification Results: ${passed} passed, ${failed} failed`);
    console.log(`Accuracy: ${((passed / TEST_ITEMS.length) * 100).toFixed(1)}%\n`);
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...\n');

    // Generate test dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `perf_${i}`,
      name: i % 2 === 0 ? 'Wheelchair Standard' : 'CT Scanner Medical',
      description: 'Performance test item'
    }));

    const startTime = Date.now();
    
    const results = await this.engine.classifyBatch(
      largeDataset,
      (processed, total) => {
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${total} items...`);
        }
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    const itemsPerSecond = (largeDataset.length / duration) * 1000;

    console.log(`\n📈 Performance Results:`);
    console.log(`- Total items: ${largeDataset.length}`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Speed: ${itemsPerSecond.toFixed(1)} items/second`);
    console.log(`- Average: ${(duration / largeDataset.length).toFixed(2)}ms per item\n`);

    // Memory usage (if available)
    if (typeof performance !== 'undefined' && performance.memory) {
      console.log(`💾 Memory Usage:`);
      console.log(`- Used: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Total: ${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`);
    }
  }

  private generateReport(): void {
    console.log('📋 Test Summary Report\n');
    console.log('='.repeat(50));

    // Accuracy by language
    const arabicTests = this.results.filter(r => /[\u0600-\u06FF]/.test(r.item.name));
    const englishTests = this.results.filter(r => !/[\u0600-\u06FF]/.test(r.item.name));
    
    if (arabicTests.length > 0) {
      const arabicAccuracy = (arabicTests.filter(r => r.passed).length / arabicTests.length) * 100;
      console.log(`Arabic Classification Accuracy: ${arabicAccuracy.toFixed(1)}%`);
    }
    
    if (englishTests.length > 0) {
      const englishAccuracy = (englishTests.filter(r => r.passed).length / englishTests.length) * 100;
      console.log(`English Classification Accuracy: ${englishAccuracy.toFixed(1)}%`);
    }

    // Confidence distribution
    const confidences = this.results.map(r => r.result.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const maxConfidence = Math.max(...confidences);
    const minConfidence = Math.min(...confidences);

    console.log(`\nConfidence Score Distribution:`);
    console.log(`- Average: ${avgConfidence.toFixed(1)}%`);
    console.log(`- Range: ${minConfidence}% - ${maxConfidence}%`);

    // Engine stats
    const stats = this.engine.getStats();
    if (stats) {
      console.log(`\nEngine Statistics:`);
      console.log(`- Vocabulary Terms (AR): ${stats.vocabulary_terms.ar}`);
      console.log(`- Vocabulary Terms (EN): ${stats.vocabulary_terms.en}`);
      console.log(`- Taxonomy Categories: ${stats.taxonomy_categories}`);
      console.log(`- NUPCO Integration: ${stats.has_nupco ? 'Yes' : 'No'}`);
      console.log(`- Brand Intelligence: ${stats.has_brands ? 'Yes' : 'No'}`);
    }

    console.log('\n✅ Integration tests completed successfully!');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PTIntegrationTester();
  tester.runTests().catch(console.error);
}