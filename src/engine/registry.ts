import type { Rule } from '../types.js';

/** Global registry of all available rules */
const ruleRegistry = new Map<string, Rule>();

/** Register a rule. Throws if a rule with the same ID already exists. */
export function registerRule(rule: Rule): void {
  if (ruleRegistry.has(rule.id)) {
    throw new Error(`Rule "${rule.id}" is already registered`);
  }
  ruleRegistry.set(rule.id, rule);
}

/** Register multiple rules at once */
export function registerRules(rules: Rule[]): void {
  for (const rule of rules) {
    registerRule(rule);
  }
}

/** Get a rule by ID. Returns undefined if not found. */
export function getRule(id: string): Rule | undefined {
  return ruleRegistry.get(id);
}

/** Get all registered rules */
export function getAllRules(): Map<string, Rule> {
  return new Map(ruleRegistry);
}

/** Check if a rule is registered */
export function hasRule(id: string): boolean {
  return ruleRegistry.has(id);
}

/** Get all rule IDs */
export function getRuleIds(): string[] {
  return Array.from(ruleRegistry.keys());
}

/** Clear all registered rules (for testing) */
export function clearRegistry(): void {
  ruleRegistry.clear();
}
