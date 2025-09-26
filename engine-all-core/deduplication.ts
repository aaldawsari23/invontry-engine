// Removes noise and normalizes Arabic and English as much as possible
export function extractBaseIdentifier(itemName: string): string {
  if (!itemName) return '';
  
  const s = itemName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F]/g, '') // Arabic diacritics
    .replace(/[^\w\u0600-\u06FF\s-]/g, ' ') // Symbols
    .replace(/\b(left|right|bilateral|universal|يمين|يسار|ثنائي)\b/gi, ' ')
    .replace(/\b(xxs|xs|s|m|l|xl|xxl|xxxl|small|medium|large|صغير|متوسط|كبير)\b/gi, ' ')
    .replace(/\b(\d+(\.\d+)?)\s*(cm|mm|in|inch|ml|mg|sm|mlm|انش)\b/gi, ' ')
    .replace(/\s*[-–—]\s*/g, ' ') // Dashes
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Take the first 2-4 words as a base description
  const m = s.match(/^([a-z\u0600-\u06ff]+(?:\s+[a-z\u0600-\u06ff]+){0,3})/i);
  return (m ? m[1] : s) || s;
}
