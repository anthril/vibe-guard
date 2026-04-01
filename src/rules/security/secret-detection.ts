import { z } from 'zod';
import type { Rule, RuleResult } from '../../types.js';
import { SECRET_PATTERNS } from '../../utils/patterns.js';

const configSchema = z.object({
  allowPatterns: z.array(z.string()).optional(),
});

/**
 * security/secret-detection
 *
 * Blocks Write operations that contain API keys, tokens, passwords, or other secrets.
 * Supports an allowlist for known-safe values (e.g., Supabase anon keys, test placeholders).
 */
export const secretDetection: Rule = {
  id: 'security/secret-detection',
  name: 'Secret Detection',
  description: 'Blocks files containing API keys, tokens, or passwords.',
  severity: 'block',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },
  configSchema,

  check: (context): RuleResult => {
    const ruleId = 'security/secret-detection';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content) {
      return { status: 'pass', ruleId };
    }

    // Skip known safe files
    const safeFiles = ['.env.example', '.env.sample', '.env.template', 'package-lock.json'];
    const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    if (safeFiles.includes(filename)) {
      return { status: 'pass', ruleId };
    }

    // Get allowlist from config
    const ruleConfig = context.projectConfig.rules.get(ruleId);
    const allowPatterns: string[] = (ruleConfig?.options?.allowPatterns as string[]) ?? [];

    for (const [name, pattern, description] of SECRET_PATTERNS) {
      const match = pattern.exec(content);
      if (match) {
        const matchedValue = match[0];

        // Check against allowlist
        const isAllowed = allowPatterns.some((allow) => {
          try {
            return new RegExp(allow).test(matchedValue);
          } catch {
            return matchedValue.includes(allow);
          }
        });

        if (isAllowed) continue;

        return {
          status: 'block',
          ruleId,
          message: `Potential ${name} detected: ${description}. Secrets should not be committed to code.`,
          fix: `Move the secret to an environment variable or a .env file (which should be gitignored).`,
          metadata: { secretType: name, file: filePath },
        };
      }
    }

    return { status: 'pass', ruleId };
  },
};
