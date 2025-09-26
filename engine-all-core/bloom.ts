/**
 * Bloom Filter Implementation for Ultra-Fast Negative Lookups
 * Optimized for medical terminology with configurable false positive rates
 */

export class BloomFilter {
  private bitArray: Uint8Array;
  private size: number;
  private hashFunctions: number;
  private itemCount: number;

  constructor(expectedItems: number, falsePositiveRate: number = 0.01) {
    // Calculate optimal size and hash functions
    this.size = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    this.hashFunctions = Math.ceil((this.size / expectedItems) * Math.log(2));
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    this.itemCount = 0;
  }

  /**
   * Add item to bloom filter
   */
  add(item: string): void {
    const hashes = this.getHashes(item);
    for (const hash of hashes) {
      const index = hash % this.size;
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bitArray[byteIndex] |= (1 << bitIndex);
    }
    this.itemCount++;
  }

  /**
   * Check if item might exist (can have false positives, no false negatives)
   */
  mightContain(item: string): boolean {
    const hashes = this.getHashes(item);
    for (const hash of hashes) {
      const index = hash % this.size;
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if (!(this.bitArray[byteIndex] & (1 << bitIndex))) {
        return false; // Definitely not in set
      }
    }
    return true; // Might be in set
  }

  /**
   * Get multiple hash values for an item using double hashing
   */
  private getHashes(item: string): number[] {
    const hash1 = this.djb2Hash(item);
    const hash2 = this.sdbmHash(item);
    const hashes: number[] = [];
    
    for (let i = 0; i < this.hashFunctions; i++) {
      hashes.push(Math.abs(hash1 + i * hash2) >>> 0); // Unsigned 32-bit
    }
    
    return hashes;
  }

  /**
   * DJB2 hash function - fast and good distribution
   */
  private djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  /**
   * SDBM hash function - good for second hash
   */
  private sdbmHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash) >>> 0;
    }
    return hash;
  }

  /**
   * Get current false positive probability
   */
  getFalsePositiveRate(): number {
    const ratio = this.itemCount / this.size;
    return Math.pow(1 - Math.exp(-this.hashFunctions * ratio), this.hashFunctions);
  }

  /**
   * Serialize bloom filter for storage
   */
  serialize(): ArrayBuffer {
    const header = new Uint32Array(4);
    header[0] = this.size;
    header[1] = this.hashFunctions;
    header[2] = this.itemCount;
    header[3] = this.bitArray.length;
    
    const result = new ArrayBuffer(header.byteLength + this.bitArray.byteLength);
    new Uint32Array(result, 0, 4).set(header);
    new Uint8Array(result, header.byteLength).set(this.bitArray);
    
    return result;
  }

  /**
   * Deserialize bloom filter from storage
   */
  static deserialize(buffer: ArrayBuffer): BloomFilter {
    const header = new Uint32Array(buffer, 0, 4);
    const [size, hashFunctions, itemCount, bitArrayLength] = header;
    
    const filter = new BloomFilter(1, 0.01); // Dummy values
    filter.size = size;
    filter.hashFunctions = hashFunctions;
    filter.itemCount = itemCount;
    filter.bitArray = new Uint8Array(buffer, 16, bitArrayLength);
    
    return filter;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.bitArray.byteLength + 16; // 16 bytes for metadata
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      size: this.size,
      hashFunctions: this.hashFunctions,
      itemCount: this.itemCount,
      memoryUsage: this.getMemoryUsage(),
      falsePositiveRate: this.getFalsePositiveRate(),
      fillRatio: (this.itemCount / this.size).toFixed(4)
    };
  }
}

/**
 * Medical Term Bloom Filter - Optimized for PT vocabulary
 */
export class MedicalTermBloomFilter extends BloomFilter {
  private language: 'ar' | 'en';
  private normalizer: (text: string) => string;

  constructor(expectedItems: number, language: 'ar' | 'en', normalizer: (text: string) => string) {
    super(expectedItems, 0.005); // Lower false positive rate for medical terms
    this.language = language;
    this.normalizer = normalizer;
  }

  /**
   * Add normalized medical term
   */
  addTerm(term: string): void {
    const normalized = this.normalizer(term);
    this.add(normalized);
    
    // Also add word variations for better coverage
    const words = normalized.split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) { // Skip short words
        this.add(word);
      }
    });
  }

  /**
   * Check if medical term might exist
   */
  mightContainTerm(term: string): boolean {
    const normalized = this.normalizer(term);
    
    // Check full term
    if (this.mightContain(normalized)) {
      return true;
    }
    
    // Check individual significant words
    const words = normalized.split(/\s+/).filter(word => word.length > 2);
    return words.some(word => this.mightContain(word));
  }

  /**
   * Batch add terms from vocabulary
   */
  addVocabulary(terms: Array<{term: string}>): void {
    terms.forEach(({ term }) => this.addTerm(term));
  }
}

/**
 * Bloom Filter Builder for PT System
 */
export class PTBloomFilterBuilder {
  static async buildFromVocabulary(
    vocabularyPath: string,
    language: 'ar' | 'en',
    normalizer: (text: string) => string
  ): Promise<MedicalTermBloomFilter> {
    try {
      const response = await fetch(vocabularyPath);
      const text = await response.text();
      const terms = text.trim().split('\n')
        .map(line => JSON.parse(line))
        .filter(term => term.term);

      const filter = new MedicalTermBloomFilter(terms.length * 2, language, normalizer);
      filter.addVocabulary(terms);
      
      console.log(`Built ${language} bloom filter:`, filter.getStats());
      return filter;
      
    } catch (error) {
      console.error(`Failed to build bloom filter for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Build combined bloom filter from multiple shards
   */
  static async buildFromShards(
    basePath: string,
    shards: string[],
    language: 'ar' | 'en',
    normalizer: (text: string) => string
  ): Promise<MedicalTermBloomFilter> {
    let totalTerms = 0;
    const allTerms: Array<{term: string}> = [];

    // Load all shards
    for (const shard of shards) {
      try {
        const response = await fetch(`${basePath}/${shard}.jsonl`);
        const text = await response.text();
        const shardTerms = text.trim().split('\n')
          .map(line => JSON.parse(line))
          .flatMap(entry => [
            { term: entry.canonical },
            ...entry.synonyms.map((syn: string) => ({ term: syn }))
          ]);
        
        allTerms.push(...shardTerms);
        totalTerms += shardTerms.length;
      } catch (error) {
        console.warn(`Failed to load shard ${shard}:`, error);
      }
    }

    const filter = new MedicalTermBloomFilter(totalTerms, language, normalizer);
    filter.addVocabulary(allTerms);
    
    console.log(`Built ${language} bloom filter from ${shards.length} shards:`, filter.getStats());
    return filter;
  }
}