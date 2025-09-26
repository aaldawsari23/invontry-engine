
// Simplifies common variations and removes diacritics
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F]/g, '') // Diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');
}
