import { Lang, ParsedItemDetails } from '../types';

export class SmartItemParser {
  private patterns: Record<string, RegExp>;

  constructor(variantPatterns: Record<string, string>) {
    this.patterns = this.compilePatterns(variantPatterns);
  }

  private compilePatterns(sourcePatterns: Record<string, string>): Record<string, RegExp> {
    const compiled: Record<string, RegExp> = {};
    if (!sourcePatterns) return compiled;
    
    for (const key in sourcePatterns) {
      if (sourcePatterns[key]) {
        try {
          compiled[key] = new RegExp(sourcePatterns[key], 'gi');
        } catch (e) {
            console.error(`Invalid regex for pattern '${key}':`, sourcePatterns[key]);
        }
      }
    }
    return compiled;
  }

  public detectLang(text: string): Lang {
    const arCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
    if (arCount / Math.max(1, text.length) > 0.4) return 'ar';
    const enCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (enCount / Math.max(1, text.length) > 0.4) return 'en';
    return 'mixed';
  }
  
  public parse(itemName: string): ParsedItemDetails {
    let baseName = itemName;
    const attributes: ParsedItemDetails['attributes'] = {};
    
    // Extract attributes and clean baseName
    Object.entries(this.patterns).forEach(([key, regex]) => {
      // Reset regex state for global flags
      regex.lastIndex = 0; 
      const match = regex.exec(itemName);
      if (match && !attributes[key as keyof typeof attributes]) {
        const value = match[1] || match[0];
        switch(key) {
            case 'side':
                attributes.side = /left|يسار/i.test(value) ? 'left' : /right|يمين/i.test(value) ? 'right' : 'universal';
                break;
            case 'size':
                attributes.size = value.trim();
                break;
            case 'color':
                attributes.color = value.trim();
                break;
            case 'resistance':
                attributes.resistance = value.trim();
                break;
        }
        baseName = baseName.replace(regex, '');
      }
    });

    baseName = baseName
        .replace(/[-_()|,.\s]+$/, '')
        .replace(/^[-\s_()|,.]+/, '')
        .replace(/\s\s+/g, ' ')
        .trim();

    return {
      baseName: baseName || itemName,
      attributes,
      language: this.detectLang(itemName),
    };
  }
}