import type { Rule, RuleResult, HookContext } from '../types.js';

/**
 * Create an Edit variant of a Write rule.
 *
 * The key innovation from Lumioh: only flags patterns that are NEWLY introduced.
 * If a pattern existed in old_string and still exists in new_string, it's pre-existing
 * and should not be flagged. This allows incremental improvement without forcing
 * developers to fix every pre-existing issue before making any edit.
 *
 * @param writeRule - A rule that targets Write operations
 * @returns A new rule that targets Edit operations with old-vs-new comparison
 */
export function createEditVariant(writeRule: Rule): Rule {
  return {
    ...writeRule,
    // Keep the same ID — the engine routes by event+tool match
    match: {
      ...writeRule.match,
      tools: ['Edit'],
    },
    check: async (context: HookContext): Promise<RuleResult> => {
      const oldString = context.toolInput.old_string as string | undefined;
      const newString = context.toolInput.new_string as string | undefined;

      // If we don't have both strings, can't do comparison — pass through
      if (!oldString || !newString) {
        return { status: 'pass', ruleId: writeRule.id };
      }

      // Check if the pattern exists in the NEW content
      const newContext: HookContext = {
        ...context,
        toolInput: {
          ...context.toolInput,
          content: newString,
          file_path: context.toolInput.file_path,
        },
      };

      const newResult = await writeRule.check(newContext);

      // If the new content passes, no issue
      if (newResult.status === 'pass') {
        return newResult;
      }

      // Check if the pattern ALREADY existed in the old content
      const oldContext: HookContext = {
        ...context,
        toolInput: {
          ...context.toolInput,
          content: oldString,
          file_path: context.toolInput.file_path,
        },
      };

      const oldResult = await writeRule.check(oldContext);

      // If the pattern was already there, this is pre-existing — don't flag
      if (oldResult.status !== 'pass') {
        return { status: 'pass', ruleId: writeRule.id };
      }

      // Pattern is NEW — report it
      return newResult;
    },
  };
}
