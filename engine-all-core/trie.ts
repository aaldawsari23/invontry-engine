/**
 * Compressed Trie (Radix Tree) for Ultra-Fast Prefix Matching
 * Optimized for medical terminology with memory compression
 */

interface TrieNode {
  key: string;
  value?: TrieValue;
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
}

interface TrieValue {
  term: string;
  score: number;
  category: string;
  pt_domain: string;
  frequency?: number;
}

export class CompressedTrie {
  private root: TrieNode;
  private nodeCount: number;
  private termCount: number;

  constructor() {
    this.root = {
      key: '',
      children: new Map(),
      isEndOfWord: false
    };
    this.nodeCount = 1;
    this.termCount = 0;
  }

  /**
   * Insert term with metadata into trie
   */
  insert(term: string, value: TrieValue): void {
    let current = this.root;
    let i = 0;

    while (i < term.length) {
      let found = false;
      
      // Look for existing child that shares prefix
      for (const [childKey, childNode] of current.children) {
        const commonPrefix = this.getCommonPrefix(term.substring(i), childKey);
        
        if (commonPrefix.length > 0) {
          found = true;
          
          if (commonPrefix === childKey) {
            // Perfect match, continue down this path
            current = childNode;
            i += commonPrefix.length;
          } else {
            // Partial match, need to split the node
            this.splitNode(current, childKey, childNode, commonPrefix);
            current = current.children.get(commonPrefix)!;
            i += commonPrefix.length;
          }
          break;
        }
      }
      
      if (!found) {
        // No matching child, create new node
        const remainingKey = term.substring(i);
        const newNode: TrieNode = {
          key: remainingKey,
          value: value,
          children: new Map(),
          isEndOfWord: true
        };
        
        current.children.set(remainingKey, newNode);
        this.nodeCount++;
        this.termCount++;
        return;
      }
    }
    
    // Mark as end of word and store value
    current.isEndOfWord = true;
    current.value = value;
    this.termCount++;
  }

  /**
   * Search for exact term
   */
  search(term: string): TrieValue | null {
    const node = this.findNode(term);
    return (node && node.isEndOfWord) ? node.value || null : null;
  }

  /**
   * Find all terms with given prefix
   */
  getWordsWithPrefix(prefix: string, maxResults: number = 10): TrieValue[] {
    const node = this.findNode(prefix);
    if (!node) return [];
    
    const results: TrieValue[] = [];
    this.collectWords(node, prefix, results, maxResults);
    
    // Sort by score descending, then by frequency
    return results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.frequency || 0) - (a.frequency || 0);
    });
  }

  /**
   * Find best matching terms using fuzzy matching
   */
  fuzzySearch(query: string, maxDistance: number = 2, maxResults: number = 5): TrieValue[] {
    const results: Array<{value: TrieValue, distance: number}> = [];
    this.fuzzySearchRecursive(this.root, '', query, 0, maxDistance, results, maxResults);
    
    return results
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return b.value.score - a.value.score;
      })
      .slice(0, maxResults)
      .map(r => r.value);
  }

  /**
   * Get suggestions for autocomplete
   */
  getSuggestions(partial: string, maxSuggestions: number = 5): string[] {
    const words = this.getWordsWithPrefix(partial, maxSuggestions);
    return words.map(w => w.term);
  }

  /**
   * Find node for given term
   */
  private findNode(term: string): TrieNode | null {
    let current = this.root;
    let i = 0;

    while (i < term.length && current) {
      let found = false;
      
      for (const [childKey, childNode] of current.children) {
        if (term.substring(i).startsWith(childKey)) {
          current = childNode;
          i += childKey.length;
          found = true;
          break;
        }
      }
      
      if (!found) return null;
    }
    
    return current;
  }

  /**
   * Collect all words from a node
   */
  private collectWords(node: TrieNode, prefix: string, results: TrieValue[], maxResults: number): void {
    if (results.length >= maxResults) return;
    
    if (node.isEndOfWord && node.value) {
      results.push(node.value);
    }
    
    for (const [childKey, childNode] of node.children) {
      if (results.length >= maxResults) break;
      this.collectWords(childNode, prefix + childKey, results, maxResults);
    }
  }

  /**
   * Fuzzy search recursive helper
   */
  private fuzzySearchRecursive(
    node: TrieNode, 
    currentWord: string, 
    target: string, 
    targetIndex: number,
    maxDistance: number,
    results: Array<{value: TrieValue, distance: number}>,
    maxResults: number
  ): void {
    if (results.length >= maxResults) return;
    
    // If we've processed all characters in target
    if (targetIndex >= target.length) {
      if (node.isEndOfWord && node.value) {
        const distance = Math.abs(currentWord.length - target.length);
        if (distance <= maxDistance) {
          results.push({ value: node.value, distance });
        }
      }
      return;
    }
    
    const targetChar = target[targetIndex];
    
    // Try exact match
    for (const [childKey, childNode] of node.children) {
      if (childKey[0] === targetChar) {
        this.fuzzySearchRecursive(
          childNode,
          currentWord + childKey,
          target,
          targetIndex + childKey.length,
          maxDistance,
          results,
          maxResults
        );
      }
    }
    
    // Try fuzzy matches if we have distance left
    if (maxDistance > 0) {
      // Skip character in target (deletion)
      this.fuzzySearchRecursive(node, currentWord, target, targetIndex + 1, maxDistance - 1, results, maxResults);
      
      // Try substitution and insertion for each child
      for (const [childKey, childNode] of node.children) {
        // Substitution
        this.fuzzySearchRecursive(
          childNode,
          currentWord + childKey,
          target,
          targetIndex + 1,
          maxDistance - 1,
          results,
          maxResults
        );
        
        // Insertion
        this.fuzzySearchRecursive(
          childNode,
          currentWord + childKey,
          target,
          targetIndex,
          maxDistance - 1,
          results,
          maxResults
        );
      }
    }
  }

  /**
   * Get common prefix of two strings
   */
  private getCommonPrefix(str1: string, str2: string): string {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.substring(0, i);
  }

  /**
   * Split a node when partial match occurs
   */
  private splitNode(parent: TrieNode, childKey: string, childNode: TrieNode, commonPrefix: string): void {
    // Remove the old child
    parent.children.delete(childKey);
    
    // Create intermediate node with common prefix
    const intermediateNode: TrieNode = {
      key: commonPrefix,
      children: new Map(),
      isEndOfWord: false
    };
    
    // Update the original child node
    const remainingKey = childKey.substring(commonPrefix.length);
    childNode.key = remainingKey;
    intermediateNode.children.set(remainingKey, childNode);
    
    // Add intermediate node to parent
    parent.children.set(commonPrefix, intermediateNode);
    this.nodeCount++;
  }

  /**
   * Serialize trie for storage
   */
  serialize(): string {
    const data = {
      root: this.serializeNode(this.root),
      nodeCount: this.nodeCount,
      termCount: this.termCount
    };
    return JSON.stringify(data);
  }

  /**
   * Serialize individual node
   */
  private serializeNode(node: TrieNode): any {
    const children: any = {};
    for (const [key, child] of node.children) {
      children[key] = this.serializeNode(child);
    }
    
    return {
      k: node.key,
      v: node.value,
      c: children,
      e: node.isEndOfWord
    };
  }

  /**
   * Deserialize trie from storage
   */
  static deserialize(data: string): CompressedTrie {
    const parsed = JSON.parse(data);
    const trie = new CompressedTrie();
    trie.root = CompressedTrie.deserializeNode(parsed.root);
    trie.nodeCount = parsed.nodeCount;
    trie.termCount = parsed.termCount;
    return trie;
  }

  /**
   * Deserialize individual node
   */
  private static deserializeNode(data: any): TrieNode {
    const node: TrieNode = {
      key: data.k,
      value: data.v,
      children: new Map(),
      isEndOfWord: data.e
    };
    
    for (const [key, childData] of Object.entries(data.c)) {
      node.children.set(key, CompressedTrie.deserializeNode(childData));
    }
    
    return node;
  }

  /**
   * Get memory usage statistics
   */
  getStats() {
    return {
      nodeCount: this.nodeCount,
      termCount: this.termCount,
      avgBranchingFactor: this.calculateAvgBranching(),
      memoryEstimate: this.estimateMemoryUsage()
    };
  }

  private calculateAvgBranching(): number {
    let totalChildren = 0;
    let nodeCount = 0;
    
    const traverse = (node: TrieNode) => {
      nodeCount++;
      totalChildren += node.children.size;
      for (const child of node.children.values()) {
        traverse(child);
      }
    };
    
    traverse(this.root);
    return nodeCount > 0 ? totalChildren / nodeCount : 0;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate: each node ~100 bytes (key + value + children map)
    return this.nodeCount * 100;
  }
}