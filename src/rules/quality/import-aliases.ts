import { z } from 'zod';
import type { Rule, RuleResult } from '../../types.js';
import { hasSrcImport, hasDeepRelativeImport } from '../../utils/patterns.js';

const configSchema = z.object({
  aliases: z.array(z.string()).optional(),
  maxRelativeDepth: z.number().optional(),
});

/**
 * quality/import-aliases
 *
 * Enforces the use of path aliases (e.g., @/) instead of deep relative imports
 * or "src/" imports. Ported from Lumioh's validate-code-patterns.py checks 3 and 8.
 */
export const importAliases: Rule = {
  id: 'quality/import-aliases',
  name: 'Import Aliases',
  description: 'Enforces path aliases instead of deep relative imports or "src/" imports.',
  severity: 'block',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  configSchema,

  check: (context): RuleResult => {
    const ruleId = 'quality/import-aliases';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content) {
      return { status: 'pass', ruleId };
    }

    // Only check TypeScript/JavaScript files
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    if (!['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(ext)) {
      return { status: 'pass', ruleId };
    }

    // Check for "src/" imports
    if (hasSrcImport(content)) {
      return {
        status: 'block',
        ruleId,
        message: `Import from "src/" path detected. Use a path alias instead (e.g., @/).`,
        fix: `Replace 'from "src/..."' with 'from "@/..."' or configure a path alias in tsconfig.json.`,
      };
    }

    // Check for deep relative imports (4+ levels by default)
    if (hasDeepRelativeImport(content)) {
      return {
        status: 'block',
        ruleId,
        message: `Deep relative import detected (4+ levels of ../). Use a path alias instead.`,
        fix: `Replace deep relative imports with path aliases (e.g., @/components/...).`,
      };
    }

    return { status: 'pass', ruleId };
  },
};
