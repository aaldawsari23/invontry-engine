/**
 * Modern Knowledge Manager
 * Bridge between legacy knowledge system and new modular PT registry
 */

import { KnowledgeManager as LegacyKnowledgeManager } from './knowledge/knowledgeManager';
import { getUltraFastAnalysisService } from './ultraFastAnalysisService';

interface ModernKnowledgeConfig {
  useModularRegistry: boolean;
  fallbackToLegacy: boolean;
  profile: 'lite' | 'full';
  autoMigrate: boolean;
}

export class ModernKnowledgeManager {
  private legacyManager: LegacyKnowledgeManager;
  private ultraFastService = getUltraFastAnalysisService();
  private config: ModernKnowledgeConfig;
  private isInitialized = false;

  constructor(config: Partial<ModernKnowledgeConfig> = {}) {
    this.legacyManager = new LegacyKnowledgeManager();
    this.config = {
      useModularRegistry: true,
      fallbackToLegacy: true,
      profile: 'lite',
      autoMigrate: false,
      ...config
    };
  }

  /**
   * Initialize knowledge system with modular registry preference
   */
  async load(base = '/knowledge'): Promise<void> {
    console.log('🔄 Initializing Modern Knowledge Manager...');
    
    try {
      if (this.config.useModularRegistry) {
        // Try to initialize ultra-fast service with modular registry
        try {
          await this.ultraFastService.initialize({
            profile: this.config.profile,
            enableProfiling: true
          });
          
          console.log('✅ Modular PT registry loaded successfully');
          this.isInitialized = true;
          return;
          
        } catch (error) {
          console.warn('Modular registry initialization failed:', error);
          
          if (!this.config.fallbackToLegacy) {
            throw error;
          }
        }
      }
      
      // Fallback to legacy knowledge system
      if (this.config.fallbackToLegacy) {
        console.log('🔄 Falling back to legacy knowledge system...');
        await this.legacyManager.load(base);
        this.isInitialized = true;
        
        // Auto-migrate if enabled
        if (this.config.autoMigrate) {
          await this.attemptMigration();
        }
      }
      
    } catch (error) {
      console.error('❌ Knowledge system initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get knowledge pack (with modern enhancements)
   */
  getPack() {
    if (this.ultraFastService.getStatus().initialized) {
      // Return enhanced knowledge pack from ultra-fast service
      const stats = this.ultraFastService.getPerformanceStats();
      return {
        // Legacy compatibility
        taxonomy: this.generateLegacyTaxonomy(),
        aliases: this.generateLegacyAliases(),
        negatives: this.generateLegacyNegatives(),
        weights: this.generateLegacyWeights(),
        
        // Modern enhancements
        version: '2.0-modular',
        engine_stats: stats,
        performance_profile: this.config.profile,
        modular_registry: true
      };
    }
    
    // Return legacy knowledge pack
    return this.legacyManager.getPack();
  }

  /**
   * Get version information
   */
  getVersion(): string {
    if (this.ultraFastService.getStatus().initialized) {
      return '2.0-modular';
    }
    return this.legacyManager.getVersion();
  }

  /**
   * Check if system is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Switch between lite and full profiles
   */
  async switchProfile(profile: 'lite' | 'full'): Promise<void> {
    if (this.ultraFastService.getStatus().initialized) {
      await this.ultraFastService.switchProfile(profile);
      this.config.profile = profile;
    }
  }

  /**
   * Get system statistics
   */
  getStats() {
    const baseStats = {
      initialized: this.isInitialized,
      system: this.ultraFastService.getStatus().initialized ? 'modular' : 'legacy',
      profile: this.config.profile
    };

    if (this.ultraFastService.getStatus().initialized) {
      return {
        ...baseStats,
        performance: this.ultraFastService.getPerformanceStats(),
        status: this.ultraFastService.getStatus()
      };
    }

    return baseStats;
  }

  // Private helper methods
  private async attemptMigration(): Promise<void> {
    console.log('🔄 Attempting automatic migration to modular registry...');
    
    try {
      // This would trigger the migration script
      // For now, just log the attempt
      console.log('Migration script would run here');
      console.log('📋 Manual migration: node pt/scripts/migrate_from_master.ts');
      
    } catch (error) {
      console.warn('Auto-migration failed:', error);
    }
  }

  private generateLegacyTaxonomy(): any[] {
    // Generate compatible taxonomy for legacy systems
    return [
      {
        category: "Equipment & Devices",
        subcategories: [
          "Mobility & Transfer Aids",
          "Exercise & Rehabilitation Equipment", 
          "Assessment Tools",
          "Therapeutic Modalities"
        ]
      },
      {
        category: "Modalities",
        subcategories: [
          "Electrotherapy",
          "Thermal Therapy",
          "Mechanical Therapy"
        ]
      }
    ];
  }

  private generateLegacyAliases(): any[] {
    // Generate compatible aliases
    return [
      { canonical: "wheelchair", variants: ["mobility chair", "transport chair"], tags: ["mobility"] },
      { canonical: "tens unit", variants: ["electrotherapy", "e-stim"], tags: ["modality"] },
      { canonical: "treadmill", variants: ["walking machine", "gait trainer"], tags: ["equipment"] }
    ];
  }

  private generateLegacyNegatives(): any {
    return {
      blockers: ["diagnostic", "surgical", "pharmaceutical", "laboratory"],
      demotions: ["general medical", "office supplies"]
    };
  }

  private generateLegacyWeights(): any {
    return {
      tag_weights: {
        mobility: 40,
        modality: 35,
        equipment: 30,
        assessment: 25
      },
      thresholds: {
        accept_min_score: 45,
        reject_threshold: -10
      }
    };
  }
}

// Singleton instance for global use
let globalModernManager: ModernKnowledgeManager | null = null;

export const getModernKnowledgeManager = (): ModernKnowledgeManager => {
  if (!globalModernManager) {
    globalModernManager = new ModernKnowledgeManager({
      useModularRegistry: true,
      fallbackToLegacy: true,
      profile: 'lite',
      autoMigrate: false
    });
  }
  return globalModernManager;
};

/**
 * Drop-in replacement for legacy KnowledgeManager
 */
export class BackwardCompatibleKnowledgeManager extends ModernKnowledgeManager {
  constructor() {
    super({
      useModularRegistry: true,
      fallbackToLegacy: true,
      profile: 'lite',
      autoMigrate: true // Enable auto-migration for smoother transition
    });
  }
}