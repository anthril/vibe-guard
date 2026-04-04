import type { Rule, RuleResult } from '../../types.js';

/**
 * workflow/lockfile-consistency
 *
 * Warns when package.json is being written with dependency changes,
 * reminding the developer to update the lockfile. AI agents modify
 * package.json dependencies without running install.
 */
export const lockfileConsistency: Rule = {
  id: 'workflow/lockfile-consistency',
  name: 'Lockfile Consistency',
  description: 'Warns when package.json dependencies are modified without lockfile update.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  editCheck: false,

  check: (context): RuleResult => {
    const ruleId = 'workflow/lockfile-consistency';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    // Only check package.json files
    const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    if (filename !== 'package.json') return { status: 'pass', ruleId };

    // Check if the file contains dependency sections
    const hasDependencies =
      /"dependencies"\s*:/.test(content) ||
      /"devDependencies"\s*:/.test(content) ||
      /"peerDependencies"\s*:/.test(content) ||
      /"optionalDependencies"\s*:/.test(content);

    if (hasDependencies) {
      return {
        status: 'warn',
        ruleId,
        message:
          'package.json with dependencies is being written — remember to run the package manager to update the lockfile.',
        fix: 'Run `npm install`, `yarn install`, or `pnpm install` after modifying package.json dependencies.',
      };
    }

    return { status: 'pass', ruleId };
  },
};
