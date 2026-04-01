import type { Rule, RuleResult } from '../../types.js';
import { DANGEROUS_COMMAND_PATTERNS } from '../../utils/patterns.js';

/**
 * security/destructive-commands
 *
 * Blocks dangerous Bash commands that could cause irreversible damage:
 * rm -rf /, git push --force, git reset --hard, pipe-to-shell, etc.
 */
export const destructiveCommands: Rule = {
  id: 'security/destructive-commands',
  name: 'Destructive Command Protection',
  description: 'Blocks dangerous shell commands that could cause irreversible damage.',
  severity: 'block',
  events: ['PreToolUse'],
  match: { tools: ['Bash'] },
  editCheck: false, // No Edit variant needed

  check: (context): RuleResult => {
    const ruleId = 'security/destructive-commands';
    const command = (context.toolInput.command as string) ?? '';

    if (!command) {
      return { status: 'pass', ruleId };
    }

    for (const [name, pattern, description] of DANGEROUS_COMMAND_PATTERNS) {
      if (pattern.test(command)) {
        return {
          status: 'block',
          ruleId,
          message: `Dangerous command detected: ${name}. ${description}.`,
          fix: `Review the command carefully. If you need this operation, run it manually outside the AI agent.`,
          metadata: { pattern: name, command },
        };
      }
    }

    return { status: 'pass', ruleId };
  },
};
