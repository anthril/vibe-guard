import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

/**
 * quality/error-handling
 *
 * Warns when code contains empty catch blocks or catch blocks that only
 * log to console. AI agents frequently generate empty catch blocks,
 * silently swallowing errors that should be handled or propagated.
 */
export const errorHandling: Rule = {
  id: 'quality/error-handling',
  name: 'Error Handling',
  description: 'Warns about empty catch blocks and catch blocks with only console.log.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'quality/error-handling';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
      return { status: 'pass', ruleId };
    }

    // Skip test files
    if (/\.(test|spec|e2e)\.[tj]sx?$/.test(filePath)) {
      return { status: 'pass', ruleId };
    }

    // Detect empty catch blocks: catch (e) {}, catch {}, catch (err) { }
    const emptyCatchPattern = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/;
    if (emptyCatchPattern.test(content)) {
      return {
        status: 'warn',
        ruleId,
        message: 'Empty catch block detected — errors are being silently swallowed.',
        fix: 'Handle the error: log it with a proper logger, rethrow, or return a meaningful error state.',
      };
    }

    // Detect catch blocks with only console.log
    // Match: catch (...) { console.log(...); } or catch (...) { console.error(...); }
    const consoleOnlyCatchPattern =
      /\bcatch\s*(?:\([^)]*\))?\s*\{\s*console\.(?:log|error|warn)\s*\([^)]*\)\s*;?\s*\}/;
    if (consoleOnlyCatchPattern.test(content)) {
      return {
        status: 'warn',
        ruleId,
        message:
          'Catch block only contains console.log — errors should be properly handled, not just logged.',
        fix: 'Add proper error handling: rethrow, return an error state, or use a structured logger.',
      };
    }

    return { status: 'pass', ruleId };
  },
};
