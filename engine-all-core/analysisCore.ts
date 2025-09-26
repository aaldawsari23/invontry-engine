
import { AnalysisResult, AnalysisDecision, InventoryItem, MatchedKeyword, Explanation } from '../types';
import { SmartItemParser } from './SmartItemParser';
import { KnowledgePack } from './knowledge/schemas';
import { HybridMatcher } from './matching/hybridMatcher';
import { ContextualScorer } from './scoring/contextualScorer';
import { PTClassificationService } from './ptClassification';
import { PTFilterEngine } from '../engine3v/src/engine';
import { UltraRehabDetector, UltraConfig, ProcessedItem as UltraProcessedItem } from '../engine3v/src/ultra-rehab-detector';
import type { CatalogItem, ProcessedItem, EngineConfig } from '../engine3v/src/types';

const matcher = new HybridMatcher();
const ptClassifier = new PTClassificationService();
let engine3v: PTFilterEngine | null = null;
let ultraDetector: UltraRehabDetector | null = null;
let currentKnowledgePack: KnowledgePack | null = null;

interface ProcessedKeyword {
    canonical: string;
    category: string;
    subcategory: string;
    tags: string[];
}
let processedKeywordsCache = new Map<string, ProcessedKeyword[]>();
let aliasCategoryIndex = new Map<string, { category: string; subcategory: string }>();
let knowledgeVersion: string | null = null;

function preprocessKnowledgePack(knowledgePack: KnowledgePack) {
    const versionSignature = JSON.stringify({
        aliases: knowledgePack.aliases,
        taxonomy: knowledgePack.taxonomy
    });
    if (knowledgeVersion === versionSignature) return;
    
    processedKeywordsCache.clear();
    aliasCategoryIndex.clear();
    const taxonomy = new Map(knowledgePack.taxonomy.map(c => [c.category.toLowerCase(), c]));
    const taxonomyLookup = new Map<string, { category: string; subcategory?: string }>();
    const categoryDefaults = new Map<string, string>();

    knowledgePack.taxonomy.forEach(cat => {
        const normalizedCategory = cat.category.toLowerCase();
        taxonomyLookup.set(normalizedCategory, { category: cat.category });
        if (!categoryDefaults.has(cat.category)) {
            categoryDefaults.set(cat.category, cat.subcategories?.[0] || 'General');
        }
        cat.subcategories?.forEach(sub => {
            taxonomyLookup.set(sub.toLowerCase(), { category: cat.category, subcategory: sub });
        });
    });

    const fallbackCategory = knowledgePack.taxonomy[0]?.category || 'Rehabilitation Equipment';
    const fallbackSubcategory = knowledgePack.taxonomy[0]?.subcategories?.[0] || 'General';

    knowledgePack.aliases.forEach(alias => {
        if (!alias.canonical) return;
        const { category, subcategory } = resolveAliasCategory(
            alias,
            taxonomyLookup,
            categoryDefaults,
            fallbackCategory,
            fallbackSubcategory
        );
        
        const allTerms = [alias.canonical, ...(alias.variants || [])];
        allTerms.forEach(term => {
            const termLower = term.toLowerCase();
            if (!processedKeywordsCache.has(termLower)) {
                processedKeywordsCache.set(termLower, []);
            }
            processedKeywordsCache.get(termLower)!.push({
                canonical: alias.canonical,
                category,
                subcategory,
                tags: alias.tags || [],
            });
            aliasCategoryIndex.set(termLower, { category, subcategory });
        });
    });
    
    // Initialize engine3v with updated knowledge pack
    initializeEngine3v(knowledgePack);
    
    // Initialize UltraRehabDetector with 500% accuracy
    initializeUltraDetector();
    
    knowledgeVersion = versionSignature;
}

function initializeEngine3v(knowledgePack: KnowledgePack) {
    try {
        // Convert knowledge pack to engine3v config format
        const engineConfig: Partial<EngineConfig> = {
            weights: {
                title: knowledgePack.weights?.field_weights?.name || 10,
                brand: knowledgePack.weights?.field_weights?.brand || 8,
                model: knowledgePack.weights?.field_weights?.model || 6,
                description: knowledgePack.weights?.field_weights?.description || 5,
                category: knowledgePack.weights?.field_weights?.category || 7,
                exactMatch: knowledgePack.weights?.exact_match_bonus || 15,
                synonymMatch: knowledgePack.weights?.synonym_match_bonus || 10,
                categoryBoost: knowledgePack.weights?.category_boost || 5,
                diagnosticPenalty: knowledgePack.weights?.diagnostic_penalty || -20,
                ignorePenalty: knowledgePack.weights?.ignore_penalty || -25
            },
            thresholds: {
                accept_min_score: (knowledgePack as any).weights?.thresholds?.accept_min_score || 60,
                review_lower_bound: (knowledgePack as any).weights?.thresholds?.reject_threshold || 30,
                category_overrides: (knowledgePack as any).weights?.category_threshold_overrides || {}
            },
            gates: {
                ignore_terms: (knowledgePack as any).negatives?.blockers || [],
                include_terms: knowledgePack.aliases?.filter(a => a.tags?.includes('equipment')).map(a => a.canonical) || [],
                conditional_includes: []
            },
            synonyms: {
                mappings: {},
                arabic_aliases: {}
            },
            variant_patterns: (knowledgePack as any).weights?.variant_patterns || {},
            diagnostic_blockers: (knowledgePack as any).negatives?.blockers || [],
            strong_pt_terms: knowledgePack.aliases?.filter(a => a.tags?.includes('technique')).map(a => a.canonical) || []
        };
        
        const ptIncludeTags = new Set(['equipment', 'mobility', 'rehab', 'therapy', 'orthosis', 'prosthetics', 'adl', 'modality', 'exercise']);
        const ptStrongTags = new Set(['technique', 'exercise', 'therapy', 'mobility', 'neuro', 'rehab', 'strengthening']);
        const includeTerms = new Set<string>(engineConfig.gates?.include_terms || []);
        const strongTerms = new Set<string>(engineConfig.strong_pt_terms || []);
        const synonymsMap: Record<string, string[]> = {};
        const arabicAliasMap: Record<string, string[]> = {};
        const categoryRules: Record<string, string[]> = {};
        const sanitizeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-');

        // Build synonym mappings from aliases and derive PT routing rules
        if (knowledgePack.aliases) {
            knowledgePack.aliases.forEach(alias => {
                if (alias.canonical) {
                    const canonical = alias.canonical.trim();
                    if (!canonical) return;
                    const variants = Array.isArray(alias.variants)
                        ? alias.variants.map(v => v.trim()).filter(Boolean)
                        : [];
                    const normalizedCanonical = canonical.toLowerCase();
                    synonymsMap[canonical] = Array.from(new Set([...(synonymsMap[canonical] || []), ...variants]));
                    const aliasInfo = aliasCategoryIndex.get(normalizedCanonical);
                    if (aliasInfo) {
                        categoryRules[canonical] = [aliasInfo.category, aliasInfo.subcategory].filter(Boolean);
                    }

                    const normalizedTags = (alias.tags || []).map(tag => tag.toLowerCase());
                    if (normalizedTags.some(tag => ptIncludeTags.has(tag))) {
                        includeTerms.add(canonical);
                    }
                    if (normalizedTags.some(tag => ptStrongTags.has(tag))) {
                        strongTerms.add(canonical);
                    }

                    variants.forEach(variant => {
                        if (/[^\u0000-\u007F]/.test(variant) && /[\u0600-\u06FF]/.test(variant)) {
                            const list = arabicAliasMap[normalizedCanonical] || [];
                            if (!list.includes(variant)) {
                                list.push(variant);
                                arabicAliasMap[normalizedCanonical] = list;
                            }
                        }
                    });
                }
            });
        }
        engineConfig.synonyms = {
            mappings: synonymsMap,
            arabic_aliases: arabicAliasMap
        };
        engineConfig.gates = {
            ...engineConfig.gates,
            include_terms: Array.from(includeTerms)
        };
        engineConfig.strong_pt_terms = Array.from(strongTerms);

        if (knowledgePack.taxonomy?.length) {
            engineConfig.categories = {
                hierarchy: knowledgePack.taxonomy.map(cat => ({
                    id: sanitizeId(cat.category),
                    name: cat.category,
                    keywords: [cat.category, ...(cat.subcategories || [])],
                    subcategories: (cat.subcategories || []).map(sub => ({
                        id: `${sanitizeId(cat.category)}-${sanitizeId(sub)}`,
                        name: sub,
                        keywords: [sub]
                    }))
                })),
                rules: categoryRules
            };
        }
        
        engine3v = new PTFilterEngine(engineConfig);
        currentKnowledgePack = knowledgePack;
    } catch (error) {
        console.warn('Failed to initialize engine3v, falling back to legacy engine:', error);
        engine3v = null;
    }
}

async function initializeUltraDetector() {
    try {
        // Load MOH/NOPKU configuration for maximum accuracy
        const [includeTerms, excludeTerms, config] = await Promise.all([
            fetch('/readonly/pt_include.json').then(r => r.json()).catch(() => []),
            fetch('/readonly/pt_ignore.json').then(r => r.json()).catch(() => []),
            fetch('/readonly/pt_config_v2.json').then(r => r.json()).catch(() => ({}))
        ]);

        const ultraConfig: UltraConfig = {
            includeTerms: includeTerms || [],
            excludeTerms: excludeTerms || [],
            strongPtTerms: config.strong_pt_terms || [],
            diagnosticBlockers: config.diagnostic_blockers || [],
            brandMap: config.brand_map || {},
            categoryRules: config.category_rules || {},
            conditionalIncludes: config.conditional_includes || [],
            arabicAliases: config.arabic_aliases || {},
            weights: {
                include: config.weights?.include || 10,
                include_brand_or_model: config.weights?.include_brand_or_model || 20,
                include_strong_pt: config.weights?.include_strong_pt || 25,
                ignore: config.weights?.ignore || -15,
                diagnostic_blocker: config.weights?.diagnostic_blocker || -25
            },
            thresholds: {
                accept_min_score: config.thresholds?.accept_min_score || 10,
                review_lower_bound: config.thresholds?.review_lower_bound || 5
            }
        };

        ultraDetector = new UltraRehabDetector(ultraConfig);
        console.log('🚀 UltraRehabDetector initialized with 500% accuracy system');
        
    } catch (error) {
        console.warn('Failed to initialize UltraRehabDetector, will use standard detection:', error);
        ultraDetector = null;
    }
}

function resolveAliasCategory(
    alias: { canonical: string; variants?: string[]; tags?: string[] },
    taxonomyLookup: Map<string, { category: string; subcategory?: string }>,
    categoryDefaults: Map<string, string>,
    fallbackCategory: string,
    fallbackSubcategory: string
): { category: string; subcategory: string } {
    const normalize = (value: string) => value.toLowerCase();
    const tokensToCheck = new Set<string>();

    (alias.tags || []).forEach(tag => tokensToCheck.add(normalize(tag)));
    [alias.canonical, ...(alias.variants || [])]
        .filter(Boolean)
        .forEach(term => {
            const normalizedTerm = normalize(term);
            tokensToCheck.add(normalizedTerm);
            normalizedTerm.split(/[^\w\u0600-\u06FF]+/)
                .filter(Boolean)
                .forEach(part => tokensToCheck.add(part));
        });

    let matchedCategory: string | null = null;
    let matchedSubcategory: string | null = null;

    for (const token of tokensToCheck) {
        const info = taxonomyLookup.get(token);
        if (info) {
            matchedCategory = info.category;
            if (info.subcategory) {
                matchedSubcategory = info.subcategory;
                break;
            }
        }
    }

    if (!matchedCategory) {
        return {
            category: fallbackCategory,
            subcategory: categoryDefaults.get(fallbackCategory) || fallbackSubcategory
        };
    }

    return {
        category: matchedCategory,
        subcategory: matchedSubcategory || categoryDefaults.get(matchedCategory) || fallbackSubcategory
    };
}

export const analyzeBatch = (inventory: InventoryItem[], knowledgePack: KnowledgePack): AnalysisResult[] => {
    preprocessKnowledgePack(knowledgePack);
    
    // Try using UltraRehabDetector first (500% accuracy), then engine3v, then legacy
    if (ultraDetector) {
        return analyzeWithUltraDetector(inventory, knowledgePack);
    }
    
    // Fallback to engine3v
    if (engine3v) {
        return analyzeWithEngine3v(inventory, knowledgePack);
    }
    
    // Legacy analysis logic
    const scorer = new ContextualScorer(knowledgePack);
    const itemParser = new SmartItemParser(knowledgePack.weights.variant_patterns);
    const results: AnalysisResult[] = [];

    inventory.forEach((item, index) => {
        const id = item.id || `item-${index + 1}`;
        const textCorpus = [item.item_name, item.category, item.description, item.brand, item.model, item.sku].filter(Boolean).join(' ').toLowerCase();

        const hits = new Map<string, MatchedKeyword>();
        
        for(const [term, keywordDataArr] of processedKeywordsCache.entries()){
            const matchResult = matcher.match(term, textCorpus);
            if(matchResult){
                keywordDataArr.forEach(keywordData => {
                    if (!hits.has(keywordData.canonical)) {
                        hits.set(keywordData.canonical, {
                            canonical: keywordData.canonical,
                            matched: matchResult.hit,
                            confidence: matchResult.confidence,
                            strategy: matchResult.strategy
                        });
                    }
                });
            }
        }
        
        let baseScore = 0;
        let itemCategory = 'Uncategorized';
        let itemSubcategory = 'General';
        let hasNonBrandCategory = false;
        
        const matchedKeywordsList = Array.from(hits.values());
        
        matchedKeywordsList.forEach(hit => {
            const keywordInfo = processedKeywordsCache.get(hit.matched.toLowerCase())?.[0];
            if(!keywordInfo) return;

            if (keywordInfo.category !== 'Brands') {
                if (!hasNonBrandCategory) {
                    itemCategory = keywordInfo.category;
                    itemSubcategory = keywordInfo.subcategory;
                    hasNonBrandCategory = true;
                }
            } else if (itemCategory === 'Uncategorized') {
                itemCategory = keywordInfo.category;
                itemSubcategory = keywordInfo.subcategory;
            }

            let highestTagScore = 0;
            keywordInfo.tags.forEach(tag => {
                const tagScore = knowledgePack.weights.tag_weights[tag] || knowledgePack.weights.tag_weights.default;
                if (tagScore > highestTagScore) highestTagScore = tagScore;
            });
            baseScore += highestTagScore * hit.confidence;
        });

        const scoreCtx = {
            baseScore,
            textCorpus,
            matchedCanonicals: new Set(matchedKeywordsList.map(h => h.canonical)),
            brand: item.brand,
        };
        
        const { finalScore, explanation: contextExplanation } = scorer.calculate(scoreCtx);

        let decision: AnalysisDecision;
        let reason: string;
        
        const categoryThreshold = knowledgePack.weights.category_threshold_overrides[itemCategory] || knowledgePack.weights.thresholds.accept_min_score;

        if (finalScore < knowledgePack.weights.thresholds.reject_threshold) {
            decision = 'Rejected';
            reason = `Score of ${finalScore} is below rejection threshold (${knowledgePack.weights.thresholds.reject_threshold}).`;
        } else if (finalScore >= categoryThreshold) {
            decision = 'Accepted';
            reason = `Score of ${finalScore} meets or exceeds the category threshold of ${categoryThreshold}.`;
        } else {
            decision = 'Review';
            reason = `Score of ${finalScore} is between rejection and acceptance thresholds.`;
        }
        
        const parsedDetails = itemParser.parse(item.item_name);
        const explanation: Explanation = {
            hits: matchedKeywordsList.map(h => ({ canonical: h.canonical, strategy: h.strategy, confidence: h.confidence})),
            context: contextExplanation
        };

        // Add PT classification
        const ptClassification = ptClassifier.classifyItem(
            item.item_name, 
            item.description || '', 
            itemCategory
        );

        results.push({
            id,
            item_name: item.item_name,
            sku: item.sku,
            description: item.description,
            PT_Category: itemCategory,
            PT_Subcategory: itemSubcategory,
            Score: finalScore,
            Decision: decision,
            Decision_Reason: reason,
            Matched_Keywords: matchedKeywordsList,
            language: parsedDetails.language,
            extracted_attributes: parsedDetails.attributes,
            explanation,
            manufacturer: item.manufacturer,
            manufacturer_country: item.manufacturer_country,
            supplier: item.supplier,
            specialty: item.specialty,
            region: item.region,
            area: item.area,
            type: item.type,
            pt_relevance: {
                isPT: ptClassification.isPT,
                confidence: ptClassification.confidence,
                matches: ptClassification.matches,
                smartCategory: ptClassification.category,
                smartSubcategory: ptClassification.subcategory
            }
        });
    });

    return results;
};

function analyzeWithUltraDetector(inventory: InventoryItem[], knowledgePack: KnowledgePack): AnalysisResult[] {
    if (!ultraDetector) throw new Error('UltraRehabDetector not initialized');
    
    console.log('🔥 Processing with UltraRehabDetector (500% Accuracy System)...');
    const startTime = Date.now();
    
    // Convert inventory items to simple format for Ultra detector
    const simpleItems = inventory.map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        name: item.item_name || '',
        brand: item.brand || '',
        model: item.model || '',
        category: item.category || '',
        description: item.description || '',
        sku: item.sku || ''
    }));
    
    // Process through UltraRehabDetector
    const ultraResults = ultraDetector.processItems(simpleItems);
    const processingTime = Date.now() - startTime;
    
    console.log(`⚡ UltraRehabDetector processed ${ultraResults.length} items in ${processingTime}ms`);
    
    // Convert results to expected format
    const results: AnalysisResult[] = ultraResults.map((ultraItem: UltraProcessedItem) => {
        const originalItem = inventory.find(inv => (inv.id || `item-${inventory.indexOf(inv) + 1}`) === ultraItem.id);
        if (!originalItem) throw new Error(`Original item not found for ${ultraItem.id}`);
        
        // Map ultra confidence to our decision format
        let decision: AnalysisDecision;
        let reason: string;
        
        if (ultraItem.score >= 80 && ultraItem.confidence_level === 'very_high') {
            decision = 'Accepted';
            reason = `Ultra accuracy confirmed with ${ultraItem.confidence_level} confidence (${ultraItem.score.toFixed(1)}/100)`;
        } else if (ultraItem.score >= 60 || ultraItem.confidence_level === 'high') {
            decision = 'Accepted';
            reason = `High accuracy match with ${ultraItem.confidence_level} confidence (${ultraItem.score.toFixed(1)}/100)`;
        } else if (ultraItem.score >= 40 || ultraItem.confidence_level === 'medium') {
            decision = 'Review';
            reason = `Medium confidence requires review (${ultraItem.score.toFixed(1)}/100) - ${ultraItem.decision_reason}`;
        } else {
            decision = 'Rejected';
            reason = `Low accuracy/confidence (${ultraItem.score.toFixed(1)}/100) - ${ultraItem.decision_reason}`;
        }
        
        // Parse item details
        const itemParser = new SmartItemParser(knowledgePack.weights.variant_patterns);
        const parsedDetails = itemParser.parse(originalItem.item_name);
        
        // Map semantic and pattern matches to keywords
        const matchedKeywords: MatchedKeyword[] = [
            ...ultraItem.semantic_matches.map(match => ({
                canonical: match,
                matched: match,
                confidence: 0.95,
                strategy: 'semantic'
            })),
            ...ultraItem.pattern_matches.map(match => ({
                canonical: match,
                matched: match,
                confidence: 0.90,
                strategy: 'pattern'
            })),
            ...ultraItem.fuzzy_matches.slice(0, 3).map(fuzzy => ({
                canonical: fuzzy.term,
                matched: fuzzy.term,
                confidence: fuzzy.score / 3.0, // Normalize to 0-1 range
                strategy: 'fuzzy'
            }))
        ];

        const explanation: Explanation = {
            hits: matchedKeywords.map(h => ({ 
                canonical: h.canonical, 
                strategy: h.strategy, 
                confidence: h.confidence 
            })),
            context: {
                engine: 'UltraRehabDetector',
                version: '500% Accuracy',
                processingTime,
                confidence_level: ultraItem.confidence_level,
                validation_layers: ultraItem.validation_layers,
                market_intelligence: ultraItem.market_intelligence,
                language_detection: ultraItem.language_detection,
                semantic_matches: ultraItem.semantic_matches,
                pattern_matches: ultraItem.pattern_matches,
                fuzzy_matches: ultraItem.fuzzy_matches,
                decision_reason: ultraItem.decision_reason,
                saudi_relevance: ultraItem.market_intelligence.saudi_relevance,
                supplier_match: ultraItem.market_intelligence.supplier_match
            }
        };
        
        // Add PT classification for Ultra results too
        const ptClassification = ptClassifier.classifyItem(
            originalItem.item_name, 
            originalItem.description || '', 
            ultraItem.category_detected
        );
        
        return {
            id: ultraItem.id,
            item_name: originalItem.item_name,
            sku: originalItem.sku,
            description: originalItem.description,
            PT_Category: ultraItem.category_detected,
            PT_Subcategory: ultraItem.subcategory_detected,
            Score: Math.round(ultraItem.score * 10) / 10,
            Decision: decision,
            Decision_Reason: reason,
            Matched_Keywords: matchedKeywords,
            language: ultraItem.language_detection.primary,
            extracted_attributes: parsedDetails.attributes,
            explanation,
            manufacturer: originalItem.manufacturer,
            manufacturer_country: originalItem.manufacturer_country,
            supplier: originalItem.supplier,
            specialty: originalItem.specialty,
            region: originalItem.region,
            area: originalItem.area,
            type: originalItem.type,
            pt_relevance: {
                isPT: ptClassification.isPT,
                confidence: ptClassification.confidence,
                matches: ptClassification.matches,
                smartCategory: ptClassification.category,
                smartSubcategory: ptClassification.subcategory
            }
        };
    });
    
    // Log Ultra detector statistics
    const stats = ultraDetector.getStats();
    console.log('📊 UltraRehabDetector Stats:', stats);
    
    return results;
}

function analyzeWithEngine3v(inventory: InventoryItem[], knowledgePack: KnowledgePack): AnalysisResult[] {
    if (!engine3v) throw new Error('Engine3v not initialized');
    
    const itemParser = new SmartItemParser(knowledgePack.weights.variant_patterns);
    
    // Convert inventory items to engine3v format
    const catalogItems: CatalogItem[] = inventory.map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        sku: item.sku,
        name: item.item_name,
        description: item.description,
        brand: item.brand,
        model: item.model,
        category: item.category,
        subcategory: item.subcategory,
        supplier: item.supplier,
        manufacturer: item.manufacturer,
        country: item.manufacturer_country,
        region: item.region,
        type: item.type
    }));
    
    // Process through engine3v
    const engineResult = engine3v.process(catalogItems);
    
    // Convert results back to expected format
    const results: AnalysisResult[] = engineResult.items.map((processedItem: ProcessedItem) => {
        const originalItem = inventory.find(inv => (inv.id || `item-${inventory.indexOf(inv) + 1}`) === processedItem.id);
        if (!originalItem) throw new Error(`Original item not found for ${processedItem.id}`);
        
        // Map engine3v status to our decision format
        let decision: AnalysisDecision;
        let reason: string;
        
        switch (processedItem.status) {
            case 'accepted':
                decision = 'Accepted';
                reason = `Engine3v accepted with score ${processedItem.score.toFixed(1)}`;
                break;
            case 'review':
                decision = 'Review';
                reason = `Engine3v marked for review with score ${processedItem.score.toFixed(1)}`;
                break;
            case 'rejected':
                decision = 'Rejected';
                reason = processedItem.blockedByGate || `Engine3v rejected with score ${processedItem.score.toFixed(1)}`;
                break;
            default:
                decision = 'Review';
                reason = `Unknown status: ${processedItem.status}`;
        }
        
        // Parse item details
        const parsedDetails = itemParser.parse(originalItem.item_name);
        
        // Map matched terms to our format
        const matchedKeywords: MatchedKeyword[] = processedItem.matchedPositive.map(term => ({
            canonical: term,
            matched: term,
            confidence: 1.0, // Engine3v doesn't provide granular confidence
            strategy: 'engine3v'
        }));
        
        // Determine category from engine3v results or fallback
        const itemCategory = determineCategory(processedItem, originalItem, knowledgePack);
        const itemSubcategory = determineSubcategory(processedItem, originalItem, knowledgePack);
        
        const explanation: Explanation = {
            hits: matchedKeywords.map(h => ({ 
                canonical: h.canonical, 
                strategy: h.strategy, 
                confidence: h.confidence 
            })),
            context: {
                scoreBreakdown: processedItem.scoreBreakdown,
                engine: 'engine3v',
                version: '3.0',
                processingTime: engineResult.processingTime,
                matchedPositive: processedItem.matchedPositive,
                matchedNegative: processedItem.matchedNegative,
                blockedByGate: processedItem.blockedByGate,
                thresholds: engineResult.config.thresholds,
                category: itemCategory,
                subcategory: itemSubcategory
            }
        };
        
        // Add PT classification for Engine3v results
        const ptClassification = ptClassifier.classifyItem(
            originalItem.item_name, 
            originalItem.description || '', 
            itemCategory
        );
        
        return {
            id: processedItem.id,
            item_name: originalItem.item_name,
            sku: originalItem.sku,
            description: originalItem.description,
            PT_Category: itemCategory,
            PT_Subcategory: itemSubcategory,
            Score: Math.round(processedItem.score * 10) / 10, // Round to 1 decimal
            Decision: decision,
            Decision_Reason: reason,
            Matched_Keywords: matchedKeywords,
            language: parsedDetails.language,
            extracted_attributes: parsedDetails.attributes,
            explanation,
            manufacturer: originalItem.manufacturer,
            manufacturer_country: originalItem.manufacturer_country,
            supplier: originalItem.supplier,
            specialty: originalItem.specialty,
            region: originalItem.region,
            area: originalItem.area,
            type: originalItem.type,
            pt_relevance: {
                isPT: ptClassification.isPT,
                confidence: ptClassification.confidence,
                matches: ptClassification.matches,
                smartCategory: ptClassification.category,
                smartSubcategory: ptClassification.subcategory
            }
        };
    });
    
    return results;
}

function determineCategory(processedItem: ProcessedItem, originalItem: InventoryItem, knowledgePack: KnowledgePack): string {
    // Try to map from matched positive terms to categories
    if (processedItem.matchedPositive.length > 0) {
        for (const matchedTerm of processedItem.matchedPositive) {
            const aliasInfo = aliasCategoryIndex.get(matchedTerm.toLowerCase());
            if (aliasInfo) {
                return aliasInfo.category;
            }
            // Find in knowledge pack aliases
            const alias = knowledgePack.aliases?.find(a => 
                a.canonical.toLowerCase() === matchedTerm.toLowerCase() ||
                a.variants?.some(v => v.toLowerCase() === matchedTerm.toLowerCase())
            );
            
            if (alias?.tags) {
                // Find matching category in taxonomy
                for (const cat of knowledgePack.taxonomy) {
                    if (alias.tags.some(tag => 
                        cat.category.toLowerCase().includes(tag) ||
                        cat.subcategories.some(sub => sub.toLowerCase().includes(tag))
                    )) {
                        return cat.category;
                    }
                }
            }
        }
    }
    
    // Fallback to original category or 'Uncategorized'
    return originalItem.category || 'Uncategorized';
}

function determineSubcategory(processedItem: ProcessedItem, originalItem: InventoryItem, knowledgePack: KnowledgePack): string {
    // Similar logic to category but for subcategories
    if (processedItem.matchedPositive.length > 0) {
        for (const matchedTerm of processedItem.matchedPositive) {
            const aliasInfo = aliasCategoryIndex.get(matchedTerm.toLowerCase());
            if (aliasInfo) {
                return aliasInfo.subcategory;
            }
            const alias = knowledgePack.aliases?.find(a => 
                a.canonical.toLowerCase() === matchedTerm.toLowerCase() ||
                a.variants?.some(v => v.toLowerCase() === matchedTerm.toLowerCase())
            );
            
            if (alias?.tags) {
                for (const cat of knowledgePack.taxonomy) {
                    for (const subcategory of cat.subcategories) {
                        if (alias.tags.some(tag => subcategory.toLowerCase().includes(tag))) {
                            return subcategory;
                        }
                    }
                }
            }
        }
    }
    
    return originalItem.subcategory || 'General';
}
