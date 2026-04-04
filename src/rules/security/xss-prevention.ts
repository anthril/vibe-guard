import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

/** XSS-prone patterns across frameworks */
const XSS_PATTERNS: Array<[RegExp, string, string]> = [
  [
    /dangerouslySetInnerHTML\s*=\s*\{/,
    'dangerouslySetInnerHTML detected — renders raw HTML and enables XSS attacks.',
    'Use a sanitization library like DOMPurify, or render content as text instead of HTML.',
  ],
  [
    /\.innerHTML\s*=/,
    'innerHTML assignment detected — allows injection of arbitrary HTML.',
    'Use textContent for plain text, or sanitize with DOMPurify before setting innerHTML.',
  ],
  [
    /document\.write\s*\(/,
    'document.write() detected — can inject arbitrary content into the page.',
    'Use DOM manipulation methods (createElement, appendChild) instead of document.write().',
  ],
  [
    /\bv-html\s*=/,
    'v-html directive detected — renders raw HTML in Vue templates.',
    'Use v-text for plain text, or sanitize content before using v-html.',
  ],
  [
    /\{!!\s*\$[^!]{0,500}!!}/,
    'Blade unescaped output {!! !!} detected — renders raw HTML in Laravel templates.',
    'Use {{ }} for escaped output, or sanitize content before using {!! !!}.',
  ],
  [
    /\|\s*safe\b/,
    'Jinja/Django |safe filter detected — marks content as safe HTML.',
    'Avoid |safe filter on user-provided content. Use auto-escaping instead.',
  ],
];

/**
 * security/xss-prevention
 *
 * Warns when code uses patterns that bypass framework XSS protections:
 * dangerouslySetInnerHTML (React), innerHTML, document.write(), v-html (Vue),
 * {!! !!} (Blade), |safe (Jinja/Django).
 */
export const xssPrevention: Rule = {
  id: 'security/xss-prevention',
  name: 'XSS Prevention',
  description: 'Warns about patterns that bypass framework XSS protections.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'security/xss-prevention';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    const supportedExts = [
      'ts',
      'tsx',
      'js',
      'jsx',
      'vue',
      'svelte',
      'php',
      'blade.php',
      'html',
      'jinja',
      'jinja2',
      'j2',
      'twig',
      'py',
    ];
    if (!supportedExts.includes(ext) && !filePath.endsWith('.blade.php')) {
      return { status: 'pass', ruleId };
    }

    // Skip test files
    if (/\.(test|spec|e2e)\.[tj]sx?$/.test(filePath)) {
      return { status: 'pass', ruleId };
    }

    for (const [pattern, message, fix] of XSS_PATTERNS) {
      if (pattern.test(content)) {
        return { status: 'warn', ruleId, message, fix };
      }
    }

    return { status: 'pass', ruleId };
  },
};
