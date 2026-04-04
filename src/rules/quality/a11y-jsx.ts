import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

/** A11y violation patterns for JSX/TSX */
const A11Y_PATTERNS: Array<[RegExp, string, string]> = [
  [
    /<img\b(?![^>]*\balt\s*=)[^>]*>/,
    '<img> without alt attribute — screen readers cannot describe this image.',
    'Add an alt attribute: <img alt="description" /> or alt="" for decorative images.',
  ],
  [
    /<a\b[^>]*href\s*=\s*["']#["'][^>]*>/,
    '<a href="#"> detected — use a <button> for interactive elements without navigation.',
    'Replace <a href="#"> with <button> for click handlers, or use a real URL for navigation.',
  ],
  [
    /<(?:div|span)\b(?![^>]*\brole\s*=)[^>]*\bonClick\b(?![^>]*\brole\s*=)[^>]*>/,
    'onClick on <div>/<span> without role attribute — not keyboard accessible.',
    'Add role="button" and tabIndex={0}, or use a native <button> element instead.',
  ],
];

/**
 * quality/a11y-jsx
 *
 * Warns about common accessibility issues in JSX/TSX:
 * - <img> without alt attribute
 * - <a href="#"> (should be <button>)
 * - onClick on div/span without role and tabIndex
 *
 * AI agents consistently generate inaccessible markup.
 */
export const a11yJsx: Rule = {
  id: 'quality/a11y-jsx',
  name: 'Accessibility (JSX)',
  description: 'Warns about common accessibility issues in JSX: missing alt, onClick on divs.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'quality/a11y-jsx';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['tsx', 'jsx'].includes(ext)) return { status: 'pass', ruleId };

    // Skip test files
    if (/\.(test|spec|e2e)\.[tj]sx?$/.test(filePath)) {
      return { status: 'pass', ruleId };
    }

    for (const [pattern, message, fix] of A11Y_PATTERNS) {
      if (pattern.test(content)) {
        return { status: 'warn', ruleId, message, fix };
      }
    }

    return { status: 'pass', ruleId };
  },
};
