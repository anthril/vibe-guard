import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';

/** SQL injection patterns — detect string interpolation/concatenation in SQL */
const SQL_INJECTION_PATTERNS: Array<[RegExp, string]> = [
  // Template literals with SQL keywords and interpolation
  [
    /`\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[^`]*\$\{/i,
    'Template literal SQL with interpolation detected — use parameterized queries.',
  ],
  // String concatenation with SQL keywords
  [
    /['"](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[^'"]*(?:['"])\s*\+\s*\w/i,
    'String concatenation in SQL query detected — use parameterized queries.',
  ],
  [
    /['"](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[\s\S]{0,500}?['"]\s*\+/i,
    'String concatenation in SQL query detected — use parameterized queries.',
  ],
  [
    /\+\s*['"](?:\s*(?:WHERE|AND|OR|SET|VALUES)\b)/i,
    'String concatenation in SQL clause detected — use parameterized queries.',
  ],
  // Python f-strings with SQL
  [
    /f['"](?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[^'"]*\{/i,
    'Python f-string SQL detected — use parameterized queries with %s or ? placeholders.',
  ],
  // Python format() with SQL
  [
    /['"](?:SELECT|INSERT|UPDATE|DELETE)\b[^'"]*['"]\.format\s*\(/i,
    'Python .format() SQL detected — use parameterized queries.',
  ],
];

/**
 * security/sql-injection
 *
 * Blocks SQL queries built with string concatenation or interpolation.
 * AI agents frequently concatenate user input into SQL instead of using
 * parameterized queries, creating critical injection vulnerabilities.
 */
export const sqlInjection: Rule = {
  id: 'security/sql-injection',
  name: 'SQL Injection Prevention',
  description: 'Blocks SQL queries built with string concatenation or interpolation.',
  severity: 'block',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'security/sql-injection';
    const content = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!content || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rb', 'php'].includes(ext)) {
      return { status: 'pass', ruleId };
    }

    // Skip test files, migrations (handled by migration-safety), and ORM schema files
    if (/\.(test|spec|e2e)\.[tj]sx?$/.test(filePath)) {
      return { status: 'pass', ruleId };
    }
    if (/\/(migrations?|seeds?|fixtures?)\//.test(filePath)) {
      return { status: 'pass', ruleId };
    }

    for (const [pattern, message] of SQL_INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        return {
          status: 'block',
          ruleId,
          message,
          fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        };
      }
    }

    return { status: 'pass', ruleId };
  },
};
