import { z } from 'zod';
import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

const configSchema = z.object({
  allowInFiles: z.array(z.string()).optional(),
});

/** Patterns that indicate `any` type usage */
const ANY_PATTERNS: Array<[RegExp, string]> = [
  [/:\s*any\b/, 'Type annotation `: any` detected.'],
  [/\bas\s+any\b/, 'Type assertion `as any` detected.'],
  [/<any\s*>/, 'Generic type parameter `<any>` detected.'],
  [/<any,/, 'Generic type parameter `<any,` detected.'],
];

/**
 * quality/no-any-type
 *
 * Warns when TypeScript files use the `any` type. AI agents generate `any`
 * extremely frequently, undermining TypeScript's type safety guarantees.
 */
export const noAnyType: Rule = {
  id: 'quality/no-any-type',
  name: 'No Any Type',
  description: 'Warns about `any` type usage in TypeScript files.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  configSchema,

  check: (context): RuleResult => {
    const ruleId = 'quality/no-any-type';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['ts', 'tsx'].includes(ext)) return { status: 'pass', ruleId };

    // Skip .d.ts declaration files
    if (filePath.endsWith('.d.ts')) return { status: 'pass', ruleId };

    // Skip files in allowlist
    const ruleConfig = context.projectConfig.rules.get(ruleId);
    const allowInFiles = (ruleConfig?.options?.allowInFiles as string[]) ?? [];
    if (allowInFiles.some((pattern) => filePath.includes(pattern))) {
      return { status: 'pass', ruleId };
    }

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and eslint/ts-ignore directives
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.includes('eslint-disable') ||
        trimmed.includes('@ts-ignore') ||
        trimmed.includes('@ts-expect-error')
      ) {
        continue;
      }

      for (const [pattern, description] of ANY_PATTERNS) {
        if (pattern.test(trimmed)) {
          return {
            status: 'warn',
            ruleId,
            message: `${description} Use a specific type instead of \`any\`.`,
            fix: 'Replace `any` with a specific type, `unknown`, or a generic type parameter.',
          };
        }
      }
    }

    return { status: 'pass', ruleId };
  },
};
