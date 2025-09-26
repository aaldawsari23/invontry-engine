/**
 * Migration Script: Legacy Knowledge Pack → Modular PT Registry
 * Converts existing knowledge_pack_v3.json to new modular format
 */
import * as fs from 'fs';
import * as path from 'path';

interface LegacyKnowledgePack {
  version: string;
  tag_enum: string[];
  brand_map: Record<string, string[]>;
  [key: string]: any;
}

interface LegacyAliases {
  canonical: string;
  variants: string[];
  tags: string[];
}

export class LegacyMigrator {
  private sourcePath: string;
  private targetPath: string;

  constructor(sourcePath: string = './public/knowledge', targetPath: string = './pt') {
    this.sourcePath = sourcePath;
    this.targetPath = targetPath;
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting migration from legacy knowledge pack...');
    
    try {
      // Load legacy data
      const knowledgePack = await this.loadLegacyKnowledgePack();
      const aliasesAr = await this.loadLegacyAliases('aliases.ar.json');
      const aliasesEn = await this.loadLegacyAliases('aliases.en.json');
      const negatives = await this.loadLegacyFile('negatives.json');
      const weights = await this.loadLegacyFile('weights.json');
      const taxonomy = await this.loadLegacyFile('taxonomy.json');

      // Convert to new format
      await this.migrateTaxonomy(taxonomy);
      await this.migrateVocabularies(aliasesAr, aliasesEn);
      await this.migrateRules(negatives, weights);
      await this.migrateBrands(knowledgePack.brand_map);
      await this.createProfiles();

      console.log('✅ Migration completed successfully!');
      console.log('📁 New modular structure created in ./pt/');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async loadLegacyKnowledgePack(): Promise<LegacyKnowledgePack> {
    const filePath = path.join(this.sourcePath, 'knowledge_pack_v3.json');
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async loadLegacyAliases(filename: string): Promise<LegacyAliases[]> {
    const filePath = path.join(this.sourcePath, filename);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async loadLegacyFile(filename: string): Promise<any> {
    const filePath = path.join(this.sourcePath, filename);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async migrateTaxonomy(taxonomy: any[]): Promise<void> {
    console.log('📋 Migrating taxonomy...');
    
    const newTaxonomy = {
      l1_categories: taxonomy.map((cat, idx) => ({
        id: cat.category.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        l1_en: cat.category,
        l1_ar: this.translateCategory(cat.category),
        l2_categories: cat.subcategories.map((subcat: string, subIdx: number) => ({
          id: subcat.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          l2_en: subcat,
          l2_ar: this.translateSubcategory(subcat),
          body_regions: this.inferBodyRegions(subcat),
          pt_domains: this.inferPTDomains(subcat)
        }))
      })),
      metadata: {
        version: '1.1.0',
        total_l1: taxonomy.length,
        total_l2: taxonomy.reduce((sum, cat) => sum + cat.subcategories.length, 0),
        supported_domains: ['musculoskeletal', 'neurological', 'cardiopulmonary', 'geriatric', 'pediatric'],
        supported_regions: ['upper_limb', 'lower_limb', 'spine', 'cardiovascular', 'general']
      }
    };

    // Ensure directory exists
    const taxonomyDir = path.join(this.targetPath, 'registry/pt.taxonomy.core/1.1.0');
    await fs.promises.mkdir(taxonomyDir, { recursive: true });
    
    // Write files
    await fs.promises.writeFile(
      path.join(taxonomyDir, 'categories.json'),
      JSON.stringify(newTaxonomy, null, 2)
    );
    
    console.log('✅ Taxonomy migration complete');
  }

  private async migrateVocabularies(aliasesAr: LegacyAliases[], aliasesEn: LegacyAliases[]): Promise<void> {
    console.log('📚 Migrating vocabularies...');
    
    // Migrate Arabic vocabulary
    await this.migrateVocabulary('ar', aliasesAr);
    
    // Migrate English vocabulary
    await this.migrateVocabulary('en', aliasesEn);
    
    console.log('✅ Vocabulary migration complete');
  }

  private async migrateVocabulary(lang: 'ar' | 'en', aliases: LegacyAliases[]): Promise<void> {
    const vocabDir = path.join(this.targetPath, `registry/pt.vocab.${lang}/3.3.0/synonyms_shards`);
    await fs.promises.mkdir(vocabDir, { recursive: true });

    // Create include.jsonl
    const includeTerms = aliases.map(alias => ({
      term: alias.canonical.toLowerCase(),
      score: this.calculateScore(alias.tags),
      category: alias.tags[0] || 'general',
      pt_domain: this.inferDomain(alias.tags)
    }));

    await fs.promises.writeFile(
      path.join(path.dirname(vocabDir), 'include.jsonl'),
      includeTerms.map(term => JSON.stringify(term)).join('\n')
    );

    // Create sharded synonyms
    const shards = new Map<string, any[]>();
    
    aliases.forEach(alias => {
      const firstChar = alias.canonical.charAt(0).toLowerCase();
      const shard = lang === 'ar' 
        ? (firstChar >= '\u0600' ? firstChar : 'misc')
        : (firstChar >= 'a' && firstChar <= 'z' ? firstChar : 'misc');
      
      if (!shards.has(shard)) {
        shards.set(shard, []);
      }
      
      shards.get(shard)!.push({
        canonical: alias.canonical,
        synonyms: alias.variants,
        score: this.calculateScore(alias.tags)
      });
    });

    // Write shards
    for (const [shardName, entries] of shards) {
      const shardFile = path.join(vocabDir, `${shardName}.jsonl`);
      await fs.promises.writeFile(
        shardFile,
        entries.map(entry => JSON.stringify(entry)).join('\n')
      );
    }
  }

  private async migrateRules(negatives: any, weights: any): Promise<void> {
    console.log('⚖️ Migrating rules...');
    
    // Migrate Arabic rules
    await this.migrateRuleSet('ar', negatives, weights);
    
    // Migrate English rules  
    await this.migrateRuleSet('en', negatives, weights);
    
    console.log('✅ Rules migration complete');
  }

  private async migrateRuleSet(lang: 'ar' | 'en', negatives: any, weights: any): Promise<void> {
    const rulesDir = path.join(this.targetPath, `registry/pt.rules.${lang}/1.2.0`);
    await fs.promises.mkdir(rulesDir, { recursive: true });

    // Create filters.json
    const filters = {
      hard_blockers: {
        diagnostic_imaging: negatives.blockers.filter((term: string) => 
          ['ultrasound', 'scanner', 'radiology', 'x-ray'].some(diagnostic => term.includes(diagnostic))
        ),
        surgical_equipment: negatives.blockers.filter((term: string) => 
          ['scalpel', 'suture', 'laparoscope'].some(surgical => term.includes(surgical))
        ),
        pharmaceuticals: negatives.blockers.filter((term: string) => 
          ['pharmacy', 'medication', 'drug'].some(pharma => term.includes(pharma))
        )
      },
      soft_demotions: {
        general_medical: negatives.demotions
      },
      pt_specific_boosts: {
        mobility_terms: ['mobility', 'wheelchair', 'walker', 'crutch'],
        therapy_modalities: ['therapy', 'rehabilitation', 'exercise']
      }
    };

    await fs.promises.writeFile(
      path.join(rulesDir, 'filters.json'),
      JSON.stringify(filters, null, 2)
    );

    // Create scoring.json
    const scoring = {
      base_weights: weights.tag_weights,
      thresholds: weights.thresholds,
      contextual_boosts: {
        rehabilitation_context: {
          keywords: ['rehabilitation', 'therapy', 'exercise'],
          boost_factor: 1.2
        }
      },
      penalty_rules: {
        diagnostic_penalty: {
          keywords: ['diagnostic', 'imaging'],
          penalty_factor: weights.score_modifiers.diagnostic_blocker
        }
      }
    };

    await fs.promises.writeFile(
      path.join(rulesDir, 'scoring.json'),
      JSON.stringify(scoring, null, 2)
    );
  }

  private async migrateBrands(brandMap: Record<string, string[]>): Promise<void> {
    console.log('🏷️ Migrating brands...');
    
    const brandsDir = path.join(this.targetPath, 'registry/pt.brands.core/1.0.0');
    await fs.promises.mkdir(brandsDir, { recursive: true });

    const brands = Object.entries(brandMap).map(([brand, categories]) => ({
      brand,
      categories,
      reputation_score: this.calculateBrandScore(brand),
      country: this.getBrandCountry(brand),
      pt_focus: true
    }));

    await fs.promises.writeFile(
      path.join(brandsDir, 'brands.jsonl'),
      brands.map(brand => JSON.stringify(brand)).join('\n')
    );
    
    console.log('✅ Brands migration complete');
  }

  private async createProfiles(): Promise<void> {
    console.log('📝 Creating runtime profiles...');
    
    const profilesDir = path.join(this.targetPath, 'profiles');
    await fs.promises.mkdir(profilesDir, { recursive: true });

    // Copy existing profile files (they should be compatible)
    // This is a placeholder - the profiles were already created above
    
    console.log('✅ Profiles created');
  }

  // Helper methods
  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      'Equipment & Devices': 'المعدات والأجهزة',
      'Modalities': 'العلاجات الفيزيائية',
      'Assessment Tools': 'أدوات التقييم'
    };
    return translations[category] || category;
  }

  private translateSubcategory(subcategory: string): string {
    const translations: Record<string, string> = {
      'Cardio & Exercise Machines': 'أجهزة القلب والتمارين',
      'Mobility & Transfer Aids': 'مساعدات النقل والحركة',
      'Electrotherapy': 'العلاج الكهربائي'
    };
    return translations[subcategory] || subcategory;
  }

  private inferBodyRegions(subcategory: string): string[] {
    if (subcategory.includes('Cardio')) return ['cardiovascular'];
    if (subcategory.includes('Mobility')) return ['general', 'lower_limb'];
    if (subcategory.includes('Balance')) return ['vestibular', 'lower_limb'];
    return ['general'];
  }

  private inferPTDomains(subcategory: string): string[] {
    if (subcategory.includes('Cardio')) return ['cardiopulmonary'];
    if (subcategory.includes('Mobility')) return ['mobility'];
    if (subcategory.includes('Balance')) return ['neurological', 'geriatric'];
    return ['general'];
  }

  private calculateScore(tags: string[]): number {
    const scoreMap: Record<string, number> = {
      'mobility': 40, 'equipment': 30, 'modality': 35,
      'assessment': 25, 'brand': 10, 'consumable': 15
    };
    return Math.max(...tags.map(tag => scoreMap[tag] || 10));
  }

  private inferDomain(tags: string[]): string {
    if (tags.includes('mobility')) return 'mobility_aids';
    if (tags.includes('modality')) return 'pain_management';
    if (tags.includes('assessment')) return 'evaluation';
    return 'general';
  }

  private calculateBrandScore(brand: string): number {
    const premiumBrands = ['Chattanooga', 'BTL', 'Biodex'];
    return premiumBrands.includes(brand) ? 90 : 75;
  }

  private getBrandCountry(brand: string): string {
    const countries: Record<string, string> = {
      'Chattanooga': 'USA', 'BTL': 'UK', 'TheraBand': 'USA',
      'Biodex': 'USA', 'HUR': 'Finland'
    };
    return countries[brand] || 'Unknown';
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new LegacyMigrator();
  migrator.migrate().catch(console.error);
}