import type { Rule, RuleResult } from '../../types.js';
import { getExtension } from '../../utils/path.js';
import { isTestFile, isGeneratedFile } from '../../utils/code-analysis.js';

/**
 * reliability/no-unhandled-promises
 *
 * Warns when promise chains use `.then()` without a terminal `.catch()`
 * (or the two-argument `.then(onFulfilled, onRejected)` form), because
 * unhandled rejections can crash the process or silently swallow errors.
 *
 * Detection strategy:
 *   1. Strip comments and string literals so `.then(` inside a template
 *      string or a comment cannot trip the rule.
 *   2. For each `.then(` call, scan forward with a brace/paren/bracket
 *      depth tracker until the enclosing statement ends (matching `;`,
 *      top-level `}`, or end of file).
 *   3. Within that span, look for:
 *        - a `.catch(` — the chain is handled
 *        - a `.finally(` that is *preceded* by a `.catch(` — also handled
 *        - a two-argument `.then(onFulfilled, onRejected)` — handled
 *      Anything else counts as unhandled.
 *
 * This replaces the previous 3-line window that produced false positives
 * on any `.then()` body longer than a few lines.
 */
export const noUnhandledPromises: Rule = {
  id: 'reliability/no-unhandled-promises',
  name: 'No Unhandled Promises',
  description: 'Warns when .then() is used without .catch() on the same promise chain.',
  severity: 'warn',
  events: ['PreToolUse'],
  match: { tools: ['Write'] },

  check: (context): RuleResult => {
    const ruleId = 'reliability/no-unhandled-promises';
    const rawContent = (context.toolInput.content as string) ?? '';
    const filePath = (context.toolInput.file_path as string) ?? '';

    if (!rawContent || !filePath) return { status: 'pass', ruleId };

    const ext = getExtension(filePath);
    if (!['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(ext)) return { status: 'pass', ruleId };

    if (isTestFile(filePath) || isGeneratedFile(filePath)) return { status: 'pass', ruleId };
    if (filePath.endsWith('.d.ts')) return { status: 'pass', ruleId };

    const content = stripCommentsAndStrings(rawContent);

    let violations = 0;
    const thenRe = /\.then\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = thenRe.exec(content)) !== null) {
      const thenCallStart = match.index;
      const openParenIdx = content.indexOf('(', thenCallStart);
      if (openParenIdx === -1) continue;

      // Find the matching closing paren of `.then(...)`.
      const closeParenIdx = findMatchingClose(content, openParenIdx);
      if (closeParenIdx === -1) continue;

      // Two-arg .then(onFulfilled, onRejected) is self-handling.
      if (hasTopLevelComma(content, openParenIdx + 1, closeParenIdx)) continue;

      // Scan forward from the end of `.then(...)` until the enclosing
      // statement ends. Count any `.catch(` / `.finally(` encountered.
      const endOfChain = findEndOfStatement(content, closeParenIdx + 1);
      const after = content.slice(closeParenIdx + 1, endOfChain);

      if (/\.catch\s*\(/.test(after)) continue;

      // A `.finally()` without a preceding `.catch()` still doesn't
      // handle rejections, so the chain is unhandled.
      violations++;
    }

    if (violations > 0) {
      return {
        status: 'warn',
        ruleId,
        message: `${violations} .then() chain${violations > 1 ? 's' : ''} without .catch() detected. Unhandled rejections can crash the process.`,
        fix: 'Add .catch() to promise chains, use .then(onOk, onErr), or switch to async/await with try/catch.',
        metadata: { violations },
      };
    }

    return { status: 'pass', ruleId };
  },
};

/**
 * Replace every comment, string literal, and template literal with
 * same-length filler so that character offsets into the returned string
 * match offsets into the original. Keeps newlines intact.
 */
function stripCommentsAndStrings(src: string): string {
  const out: string[] = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    const ch = src[i];
    const next = src[i + 1];

    // Line comment
    if (ch === '/' && next === '/') {
      out.push('  ');
      i += 2;
      while (i < len && src[i] !== '\n') {
        out.push(' ');
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      out.push('  ');
      i += 2;
      while (i < len && !(src[i] === '*' && src[i + 1] === '/')) {
        out.push(src[i] === '\n' ? '\n' : ' ');
        i++;
      }
      if (i < len) {
        out.push('  ');
        i += 2;
      }
      continue;
    }

    // String literals — single, double, backtick.
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out.push(quote);
      i++;
      while (i < len && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < len) {
          out.push(src[i] === '\n' ? '\n' : ' ');
          out.push(src[i + 1] === '\n' ? '\n' : ' ');
          i += 2;
          continue;
        }
        // For template literals we still need to neutralise `${...}` so
        // nothing inside can trip `.then(` matching, but keep newlines
        // so line offsets stay usable for the caller.
        if (quote === '`' && src[i] === '$' && src[i + 1] === '{') {
          out.push('  ');
          i += 2;
          let depth = 1;
          while (i < len && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            out.push(src[i] === '\n' ? '\n' : ' ');
            i++;
          }
          continue;
        }
        out.push(src[i] === '\n' ? '\n' : ' ');
        i++;
      }
      if (i < len) {
        out.push(quote);
        i++;
      }
      continue;
    }

    out.push(ch);
    i++;
  }

  return out.join('');
}

/**
 * Given the index of an opening `(`, find the index of the matching `)`,
 * respecting nested `()` / `[]` / `{}`. Returns -1 if no match exists.
 * Assumes the input has had comments and strings stripped.
 */
function findMatchingClose(src: string, openIdx: number): number {
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') paren++;
    else if (ch === ')') {
      paren--;
      if (paren === 0 && brace === 0 && bracket === 0) return i;
    } else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
  }
  return -1;
}

/**
 * True when there is a `,` at depth 0 between `start` (inclusive) and
 * `end` (exclusive). Used to detect the two-argument `.then(onOk, onErr)`
 * form.
 */
function hasTopLevelComma(src: string, start: number, end: number): boolean {
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0; // crude guard for TS generics like `.then<T>(...)` — unlikely but safe
  for (let i = start; i < end; i++) {
    const ch = src[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '<') angle++;
    else if (ch === '>') angle--;
    else if (ch === ',' && paren === 0 && brace === 0 && bracket === 0 && angle <= 0) {
      return true;
    }
  }
  return false;
}

/**
 * Starting just after `.then(...)`, advance until the enclosing
 * statement ends. Definition of "end":
 *   - a `;` at depth 0, or
 *   - a newline at depth 0 that is not followed (ignoring whitespace)
 *     by a `.` or `)` (so we keep scanning across method-chain newlines
 *     and through the tail of the enclosing expression), or
 *   - end of file.
 *
 * Depth tracks `()` / `{}` / `[]`. This is a heuristic but much more
 * accurate than a fixed 3-line window.
 */
function findEndOfStatement(src: string, start: number): number {
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let i = start;

  while (i < src.length) {
    const ch = src[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '{') brace++;
    else if (ch === '}') {
      // If we cross an unmatched `}` we've left the enclosing block.
      if (brace === 0) return i;
      brace--;
    } else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === ';' && paren === 0 && brace === 0 && bracket === 0) {
      return i;
    } else if (ch === '\n' && paren === 0 && brace === 0 && bracket === 0) {
      // Look at the next non-whitespace char. If it's `.` or `)` or `,`
      // the chain continues; otherwise the statement has ended.
      let j = i + 1;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
      const peek = src[j];
      if (peek !== '.' && peek !== ')' && peek !== ',') return i;
    }
    i++;
  }
  return src.length;
}
