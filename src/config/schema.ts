import { z } from 'zod';

/** Schema for per-rule configuration */
export const ruleConfigSchema = z.union([
  z.boolean(),
  z
    .object({
      severity: z.enum(['block', 'warn', 'info']).optional(),
    })
    .passthrough(),
]);

/** Schema for the learn section */
export const learnConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    scanPaths: z.array(z.string()).optional(),
    ignorePaths: z.array(z.string()).optional(),
  })
  .optional();

/** Schema for the complete user config (vibecheck.config.ts) */
export const vibeCheckConfigSchema = z.object({
  presets: z.array(z.string()).optional(),
  agents: z.array(z.enum(['claude-code', 'cursor', 'codex', 'opencode'])).optional(),
  rules: z.record(z.string(), ruleConfigSchema).optional(),
  plugins: z.array(z.string()).optional(),
  learn: learnConfigSchema,
});

export type ValidatedConfig = z.infer<typeof vibeCheckConfigSchema>;
