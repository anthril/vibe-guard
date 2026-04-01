import { registerRules } from '../engine/registry.js';
import { securityRules } from './security/index.js';
import { qualityRules } from './quality/index.js';

/** All built-in rules */
export const allBuiltinRules = [...securityRules, ...qualityRules];

/** Register all built-in rules with the engine */
export function registerBuiltinRules(): void {
  registerRules(allBuiltinRules);
}

// Auto-register on import
registerBuiltinRules();

export { securityRules } from './security/index.js';
export { qualityRules } from './quality/index.js';
