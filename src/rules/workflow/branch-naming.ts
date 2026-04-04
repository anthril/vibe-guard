import { z } from 'zod';
import type { Rule, RuleResult } from '../../types.js';

const configSchema = z.object({
  pattern: z.string().optional(),
  skipBranches: z.array(z.string()).optional(),
});

const DEFAULT_PATTERN = /^(feature|fix|chore|hotfix|release|bugfix)\/.+$/;
const DEFAULT_SKIP_BRANCHES = ['main', 'master', 'dev', 'develop', 'staging', 'production'];

/**
 * workflow/branch-naming
 *
 * At session end (Stop event), warns if the current branch name doesn't
 * follow the configured naming convention (e.g., feature/, fix/, chore/).
 */
export const branchNaming: Rule = {
  id: 'workflow/branch-naming',
  name: 'Branch Naming',
  description: 'Warns when branch names do not follow naming conventions.',
  severity: 'warn',
  events: ['Stop'],
  configSchema,
  editCheck: false,

  check: (context): RuleResult => {
    const ruleId = 'workflow/branch-naming';

    try {
      const { branch, repoRoot } = context.gitContext;

      if (!repoRoot || !branch) return { status: 'pass', ruleId };

      const ruleConfig = context.projectConfig.rules.get(ruleId);
      const skipBranches = (ruleConfig?.options?.skipBranches as string[]) ?? DEFAULT_SKIP_BRANCHES;

      // Skip protected/special branches
      if (skipBranches.some((skip) => branch.toLowerCase() === skip.toLowerCase())) {
        return { status: 'pass', ruleId };
      }

      const patternStr = ruleConfig?.options?.pattern as string | undefined;
      // new RegExp() can throw on invalid user-supplied patterns — fail-open
      const pattern = patternStr ? new RegExp(patternStr) : DEFAULT_PATTERN;

      if (!pattern.test(branch)) {
        return {
          status: 'warn',
          ruleId,
          message: `Branch "${branch}" does not follow naming convention. Expected: feature/, fix/, chore/, hotfix/, release/, or bugfix/ prefix.`,
          fix: `Rename your branch: git branch -m ${branch} feature/${branch}`,
        };
      }

      return { status: 'pass', ruleId };
    } catch {
      // Fail-open: invalid config or unexpected error should never block work
      return { status: 'pass', ruleId: 'workflow/branch-naming' };
    }
  },
};
