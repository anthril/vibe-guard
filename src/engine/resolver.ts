import type { Rule, HookEvent, ResolvedConfig, ResolvedRuleConfig } from '../types.js';
import { getAllRules } from './registry.js';

/** A rule paired with its resolved configuration */
export interface ResolvedRule {
  rule: Rule;
  config: ResolvedRuleConfig;
}

/**
 * Resolve which rules should run for a given event and tool.
 *
 * Filters rules by:
 * 1. Whether the rule is enabled in config
 * 2. Whether the rule's events include the current event
 * 3. Whether the rule's tool matcher includes the current tool
 *
 * Returns rules in registration order (security first, then quality, then workflow).
 */
export function resolveRules(
  event: HookEvent,
  tool: string,
  config: ResolvedConfig,
): ResolvedRule[] {
  const allRules = getAllRules();
  const resolved: ResolvedRule[] = [];

  for (const [id, rule] of allRules) {
    // Check if rule is enabled in config
    const ruleConfig = config.rules.get(id);

    // If rule has no config entry, use defaults (enabled for security, disabled for others)
    const isEnabled = ruleConfig ? ruleConfig.enabled : id.startsWith('security/');
    if (!isEnabled) continue;

    // Check if this rule handles the current event
    if (!rule.events.includes(event)) continue;

    // Check tool matcher
    if (rule.match?.tools && rule.match.tools.length > 0) {
      const toolMatches = rule.match.tools.some((pattern) => {
        // Support pipe-separated tool names like "Edit|Write"
        const parts = pattern.split('|');
        return parts.includes(tool);
      });
      if (!toolMatches) continue;
    }

    const effectiveConfig: ResolvedRuleConfig = ruleConfig ?? {
      enabled: true,
      severity: rule.severity,
      options: {},
    };

    resolved.push({ rule, config: effectiveConfig });
  }

  return resolved;
}
