// src/config/validator.ts - Lightweight Config Validation
export function validateConfig(config: any): void {
 // Basic structure validation
 if (!config || typeof config !== 'object') {
   throw new Error('Config must be an object');
 }
 
 // Required sections
 const requiredSections = ['weights', 'thresholds'];
 for (const section of requiredSections) {
   if (!config[section]) {
     throw new Error(`Config missing required section: ${section}`);
   }
 }
 
 // Validate weights
 if (config.weights) {
   for (const [key, value] of Object.entries(config.weights)) {
     if (typeof value !== 'number') {
       throw new Error(`Weight ${key} must be a number`);
     }
   }
 }
 
 // Validate thresholds
 if (config.thresholds) {
   const { accept_min_score, review_lower_bound } = config.thresholds;
   
   if (typeof accept_min_score !== 'number' || accept_min_score < 0 || accept_min_score > 100) {
     throw new Error('accept_min_score must be a number between 0 and 100');
   }
   
   if (typeof review_lower_bound !== 'number' || review_lower_bound < 0 || review_lower_bound > 100) {
     throw new Error('review_lower_bound must be a number between 0 and 100');
   }
   
   if (review_lower_bound >= accept_min_score) {
     throw new Error('review_lower_bound must be less than accept_min_score');
   }
 }
 
 // Validate arrays
 const arrayFields = ['diagnostic_blockers', 'strong_pt_terms'];
 for (const field of arrayFields) {
   if (config[field] && !Array.isArray(config[field])) {
     throw new Error(`${field} must be an array`);
   }
 }
 
 // Validate gates
 if (config.gates) {
   if (config.gates.ignore_terms && !Array.isArray(config.gates.ignore_terms)) {
     throw new Error('gates.ignore_terms must be an array');
   }
   if (config.gates.include_terms && !Array.isArray(config.gates.include_terms)) {
     throw new Error('gates.include_terms must be an array');
   }
 }
}
