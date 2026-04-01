import { z } from 'zod';
import type { Rule, RuleResult } from '../../types.js';

const configSchema = z.object({
  maxLines: z.number().int().positive().optional(),
});

/**
 * quality/max-file-length
 *
 * Warns when a file exceeds a configurable line count.
 * AI agents tend to bloat files — this keeps them in check.
 */
export const maxFileLength: Rule = {
  id: 'quality/max-file-length',
  name: 'Max File Length',
  description: 'Warns when a file exceeds a configurable line count (default: 400 lines).',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  configSchema,

  check: (context): RuleResult => {
    const ruleId = 'quality/max-file-length';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    // Skip non-source files
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const sourceExts = [
      'ts',
      'tsx',
      'js',
      'jsx',
      'mts',
      'mjs',
      'py',
      'rb',
      'go',
      'rs',
      'java',
      'kt',
      'vue',
      'svelte',
      'astro',
    ];
    if (!sourceExts.includes(ext)) return { status: 'pass', ruleId };

    // Skip generated/vendor files
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    if (
      normalized.includes('/generated/') ||
      normalized.includes('/vendor/') ||
      normalized.includes('.generated.') ||
      normalized.includes('.min.')
    ) {
      return { status: 'pass', ruleId };
    }

    const ruleConfig = context.projectConfig.rules.get(ruleId);
    const maxLines = (ruleConfig?.options?.maxLines as number) ?? 400;

    const lineCount = content.split('\n').length;

    if (lineCount > maxLines) {
      return {
        status: 'warn',
        ruleId,
        message: `File is ${lineCount} lines (limit: ${maxLines}). Consider splitting into smaller modules.`,
        fix: `Break this file into smaller, focused modules. Extract related functions or components into separate files.`,
        metadata: { lineCount, maxLines },
      };
    }

    return { status: 'pass', ruleId };
  },
};
