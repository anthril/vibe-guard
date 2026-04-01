import type { Rule, RuleResult } from '../../types.js';
import { hasUseClientDirective } from '../../utils/patterns.js';
import { normalizePath, getFilename } from '../../utils/path.js';

/**
 * quality/no-use-client-in-pages
 *
 * Blocks "use client" directive in Next.js page and layout files.
 * Pages and layouts should be Server Components in the App Router.
 *
 * Ported from Lumioh's validate-code-patterns.py check 1.
 */
export const noUseClientInPages: Rule = {
  id: 'quality/no-use-client-in-pages',
  name: 'No "use client" in Pages',
  description: 'Prevents "use client" directive in Next.js page.tsx and layout.tsx files.',
  severity: 'block',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'quality/no-use-client-in-pages';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) {
      return { status: 'pass', ruleId };
    }

    const filename = getFilename(filePath).toLowerCase();
    const normalizedPath = normalizePath(filePath).toLowerCase();

    // Only check page.tsx/page.jsx and layout.tsx/layout.jsx
    const isPage = /^page\.(tsx?|jsx?)$/.test(filename);
    const isLayout = /^layout\.(tsx?|jsx?)$/.test(filename);

    if (!isPage && !isLayout) {
      return { status: 'pass', ruleId };
    }

    // Skip files not in an app directory (could be a different framework)
    if (!normalizedPath.includes('/app/') && !normalizedPath.includes('/src/app/')) {
      return { status: 'pass', ruleId };
    }

    if (hasUseClientDirective(content)) {
      const fileType = isPage ? 'page' : 'layout';
      return {
        status: 'block',
        ruleId,
        message: `"use client" directive found in ${fileType} file. Next.js App Router pages and layouts should be Server Components.`,
        fix: `Remove "use client" from ${filename}. Extract client-side logic into a separate component and import it.`,
      };
    }

    return { status: 'pass', ruleId };
  },
};
