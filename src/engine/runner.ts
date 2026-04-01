import type { RuleResult, HookContext } from '../types.js';
import type { ResolvedRule } from './resolver.js';

/** Aggregated result from running all resolved rules */
export interface RunResult {
  /** Whether any rule blocked the operation */
  blocked: boolean;
  /** All results from all rules */
  results: RuleResult[];
  /** The first blocking result (if any) */
  blockingResult: RuleResult | null;
  /** All warning results */
  warnings: RuleResult[];
}

/**
 * Run resolved rules sequentially against a hook context.
 *
 * For PreToolUse events: short-circuits on the first blocking result.
 * For PostToolUse/Stop events: runs all rules and collects warnings.
 */
export async function runRules(
  resolvedRules: ResolvedRule[],
  context: HookContext,
): Promise<RunResult> {
  const results: RuleResult[] = [];
  let blockingResult: RuleResult | null = null;
  const warnings: RuleResult[] = [];
  const isPreToolUse = context.event === 'PreToolUse';

  for (const { rule, config } of resolvedRules) {
    try {
      // Build context with rule-specific config options
      const ruleContext: HookContext = {
        ...context,
        projectConfig: {
          ...context.projectConfig,
          rules: new Map(context.projectConfig.rules),
        },
      };

      // Add rule options to the context for rule-specific configuration
      if (config.options && Object.keys(config.options).length > 0) {
        ruleContext.projectConfig.rules.set(rule.id, config);
      }

      const result = await rule.check(ruleContext);

      // Apply severity override from config — downgrade only, never upgrade
      if (result.status !== 'pass') {
        const severityRank = { info: 0, warn: 1, block: 2 };
        const configRank = severityRank[config.severity];
        const resultRank = severityRank[result.status];
        if (configRank < resultRank) {
          result.status = config.severity === 'info' ? 'warn' : config.severity;
        }
      }

      results.push(result);

      if (result.status === 'block') {
        blockingResult = blockingResult ?? result;
        // Short-circuit on PreToolUse — we can stop early
        if (isPreToolUse) break;
      } else if (result.status === 'warn') {
        warnings.push(result);
      }
    } catch (error) {
      // Rule errors should never block the operation — fail open
      const errorResult: RuleResult = {
        status: 'warn',
        ruleId: rule.id,
        message: `Rule "${rule.id}" threw an error: ${error instanceof Error ? error.message : String(error)}`,
      };
      results.push(errorResult);
      warnings.push(errorResult);
    }
  }

  return {
    blocked: blockingResult !== null,
    results,
    blockingResult,
    warnings,
  };
}
