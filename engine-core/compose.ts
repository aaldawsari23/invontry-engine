/**
 * Package Composition Engine
 * Loads and merges PT packages into runtime format
 */
import type { 
  PackageManifest, 
  RuntimeConfig, 
  ComposedEngine,
  PTProfile 
} from './types';

export class PackageComposer {
  private loadedPackages: Map<string, any> = new Map();
  private profile: PTProfile | null = null;

  async loadProfile(profilePath: string): Promise<void> {
    const response = await fetch(profilePath);
    this.profile = await response.json();
    console.log(`Loaded PT profile: ${this.profile?.profile_name}`);
  }

  async composeEngine(): Promise<ComposedEngine> {
    if (!this.profile) {
      throw new Error('Profile must be loaded before composing engine');
    }

    const engine: ComposedEngine = {
      taxonomy: await this.loadTaxonomy(),
      normalizers: await this.loadNormalizers(),
      vocabularies: await this.loadVocabularies(),
      rules: await this.loadRules(),
      brands: this.profile.features.brand_intelligence ? await this.loadBrands() : null,
      nupco: this.profile.features.nupco_integration ? await this.loadNupco() : null,
      config: this.profile.runtime_config
    };

    console.log('PT Engine composition complete');
    return engine;
  }

  private async loadTaxonomy() {
    const version = this.profile!.packages['pt.taxonomy.core'];
    const path = `/pt/registry/pt.taxonomy.core/${version}/categories.json`;
    return await this.fetchJson(path);
  }

  private async loadNormalizers() {
    const arVersion = this.profile!.packages['pt.normalization.ar'];
    const enVersion = this.profile!.packages['pt.normalization.en'];
    
    return {
      ar: await this.fetchJson(`/pt/registry/pt.normalization.ar/${arVersion}/rules.json`),
      en: await this.fetchJson(`/pt/registry/pt.normalization.en/${enVersion}/rules.json`)
    };
  }

  private async loadVocabularies() {
    const arConfig = this.profile!.packages['pt.vocab.ar'];
    const enConfig = this.profile!.packages['pt.vocab.en'];
    
    return {
      ar: await this.loadShardedVocab('ar', arConfig),
      en: await this.loadShardedVocab('en', enConfig)
    };
  }

  private async loadShardedVocab(lang: string, config: any) {
    const version = typeof config === 'string' ? config : config.version;
    const basePath = `/pt/registry/pt.vocab.${lang}/${version}`;
    
    // Load core vocabulary
    const include = await this.fetchJsonl(`${basePath}/include.jsonl`);
    
    // Load shards if specified
    let shards = {};
    if (config.shards) {
      for (const shard of config.shards) {
        shards[shard] = await this.fetchJsonl(`${basePath}/synonyms_shards/${shard}.jsonl`);
      }
    }
    
    return { include, shards };
  }

  private async loadRules() {
    const arVersion = this.profile!.packages['pt.rules.ar'];
    const enVersion = this.profile!.packages['pt.rules.en'];
    
    return {
      ar: {
        filters: await this.fetchJson(`/pt/registry/pt.rules.ar/${arVersion}/filters.json`),
        scoring: await this.fetchJson(`/pt/registry/pt.rules.ar/${arVersion}/scoring.json`)
      },
      en: {
        filters: await this.fetchJson(`/pt/registry/pt.rules.en/${arVersion}/filters.json`),
        scoring: await this.fetchJson(`/pt/registry/pt.rules.en/${arVersion}/scoring.json`)
      }
    };
  }

  private async loadBrands() {
    if (!this.profile!.packages['pt.brands.core']) return null;
    const version = this.profile!.packages['pt.brands.core'];
    return await this.fetchJsonl(`/pt/registry/pt.brands.core/${version}/brands.jsonl`);
  }

  private async loadNupco() {
    if (!this.profile!.packages['pt.nupco.core']) return null;
    const version = this.profile!.packages['pt.nupco.core'];
    return {
      codes: await this.fetchJson(`/pt/registry/pt.nupco.core/${version}/code_prefix_rules.json`),
      golden: await this.fetchJsonl(`/pt/registry/pt.nupco.core/${version}/golden_records.jsonl`)
    };
  }

  private async fetchJson(path: string): Promise<any> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.json();
  }

  private async fetchJsonl(path: string): Promise<any[]> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    const text = await response.text();
    return text.trim().split('\n').map(line => JSON.parse(line));
  }
}