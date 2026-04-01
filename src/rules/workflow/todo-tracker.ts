import type { Rule, RuleResult } from '../../types.js';

/**
 * workflow/todo-tracker
 *
 * Counts TODO/FIXME/HACK comments in modified files.
 * Warns when the count increases during a session.
 * Tracks in metadata for Cloud reporting.
 */
export const todoTracker: Rule = {
  id: 'workflow/todo-tracker',
  name: 'TODO Tracker',
  description: 'Counts TODO/FIXME/HACK comments and warns when count increases.',
  severity: 'info',
  events: ['PostToolUse'],
  match: { tools: ['Write', 'Edit'] },

  check: (context): RuleResult => {
    const ruleId = 'workflow/todo-tracker';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    // Only check source files
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
      'css',
      'scss',
    ];
    if (!sourceExts.includes(ext)) return { status: 'pass', ruleId };

    // Count TODO/FIXME/HACK/XXX comments
    const todoPattern = /\b(TODO|FIXME|HACK|XXX)\b/gi;
    const matches = content.match(todoPattern) ?? [];
    const count = matches.length;

    if (count > 0) {
      // Categorize
      const categories: Record<string, number> = {};
      for (const m of matches) {
        const key = m.toUpperCase();
        categories[key] = (categories[key] ?? 0) + 1;
      }

      const summary = Object.entries(categories)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');

      return {
        status: 'warn',
        ruleId,
        message: `File contains ${count} marker comment${count > 1 ? 's' : ''}: ${summary}.`,
        fix: 'Address TODOs and FIXMEs before merging, or track them in your issue tracker.',
        metadata: { count, categories, file: filePath },
      };
    }

    return { status: 'pass', ruleId };
  },
};
