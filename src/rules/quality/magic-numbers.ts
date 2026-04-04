import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

/** Common values that are universally understood and don't need constants */
const DEFAULT_ALLOWED_VALUES = [0, 1, -1, 2, 100];

/**
 * quality/magic-numbers
 *
 * Warns when numeric literals appear outside of const declarations,
 * making code harder to understand and maintain. Opt-in rule (info severity).
 */
export const magicNumbers: Rule = {
  id: 'quality/magic-numbers',
  name: 'Magic Numbers',
  description: 'Warns about numeric literals that should be named constants.',
  severity: 'info',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  editCheck: false,

  check: (context): RuleResult => {
    const ruleId = 'quality/magic-numbers';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext)) return { status: 'pass', ruleId };

    // Skip test, config, and constant files
    if (/\.(test|spec|e2e)\.[tj]sx?$/.test(filePath)) {
      return { status: 'pass', ruleId };
    }
    const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    if (/^(constants?|config|settings)\.[tj]sx?$/.test(filename)) {
      return { status: 'pass', ruleId };
    }

    const allowedValues = DEFAULT_ALLOWED_VALUES;
    const magicNumberPattern = /(?<!\w)(\d+\.?\d*)\b/g;
    let count = 0;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments, imports, const declarations, array indices, enums
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('import ') ||
        /^\s*(?:const|enum)\s+/.test(line) ||
        trimmed.startsWith('export const')
      ) {
        continue;
      }

      let match;
      while ((match = magicNumberPattern.exec(trimmed)) !== null) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && !allowedValues.includes(num)) {
          count++;
        }
      }
    }

    if (count >= 3) {
      return {
        status: 'warn',
        ruleId,
        message: `${count} magic numbers detected — consider extracting to named constants.`,
        fix: 'Define numeric values as named constants: const MAX_RETRIES = 3;',
      };
    }

    return { status: 'pass', ruleId };
  },
};
