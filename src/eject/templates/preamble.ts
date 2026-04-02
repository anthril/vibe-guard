/**
 * Generates the preamble JavaScript code for ejected hook scripts.
 * Includes: Node.js requires, git context builder, shared utility functions,
 * pattern constants, and stdin/output handling.
 */

import { SECRET_PATTERNS, DANGEROUS_COMMAND_PATTERNS, DANGEROUS_SQL_PATTERNS } from '../../utils/patterns.js';

function serializeRegex(re: RegExp): string {
  return `new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})`;
}

function serializePatternArray(
  patterns: Array<[string, RegExp, string]>,
  varName: string,
): string {
  const entries = patterns
    .map(([name, regex, desc]) => `  [${JSON.stringify(name)}, ${serializeRegex(regex)}, ${JSON.stringify(desc)}]`)
    .join(',\n');
  return `const ${varName} = [\n${entries}\n];`;
}

export function generatePreamble(): string {
  return `'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

// ─── Stdin ──────────────────────────────────────────────────────────────────
let rawInput = '';
try { rawInput = fs.readFileSync(0, 'utf-8'); } catch {}
if (!rawInput) process.exit(0);

let data;
try { data = JSON.parse(rawInput); } catch { process.exit(0); }

const toolName = data.tool_name || '';
const toolInput = data.tool_input || {};
const filePath = toolInput.file_path || toolInput.path || '';
const content = toolInput.content || '';
const command = toolInput.command || '';

// ─── Git Context ────────────────────────────────────────────────────────────
function gitCmd(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, timeout: 5000, encoding: 'utf-8' }).toString().trim();
  } catch { return null; }
}

const fileDir = filePath ? path.dirname(filePath) : process.cwd();
const repoRoot = filePath ? gitCmd(['rev-parse', '--show-toplevel'], fileDir) : gitCmd(['rev-parse', '--show-toplevel'], process.cwd());
const branch = repoRoot ? gitCmd(['branch', '--show-current'], repoRoot) : null;
const isDirty = repoRoot ? (gitCmd(['status', '--porcelain'], repoRoot) || '').length > 0 : false;
const unpushedCount = repoRoot ? (parseInt(gitCmd(['rev-list', '--count', '@{upstream}..HEAD'], repoRoot) || '0', 10) || 0) : 0;
const hasRemote = repoRoot ? (gitCmd(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], repoRoot) || '').length > 0 : false;

// ─── Path Utilities ─────────────────────────────────────────────────────────
function normalizePath(p) { return p.replace(/\\\\/g, '/'); }
function getExtension(p) {
  const n = normalizePath(p);
  const d = n.lastIndexOf('.');
  return d === -1 ? '' : n.slice(d + 1).toLowerCase();
}
function getFilename(p) {
  const n = normalizePath(p);
  const s = n.lastIndexOf('/');
  return s === -1 ? n : n.slice(s + 1);
}
function hasUseClientDirective(c) {
  return /["']use client["']/.test(c.split('\\n').slice(0, 5).join('\\n'));
}
function hasSrcImport(c) { return /from\\s+["']src\\//.test(c); }
function hasDeepRelativeImport(c) { return /from\\s+["'](\\.\\.\\/){4,}/.test(c); }

// ─── Pattern Constants ──────────────────────────────────────────────────────
${serializePatternArray(SECRET_PATTERNS, 'SECRET_PATTERNS')}

${serializePatternArray(DANGEROUS_COMMAND_PATTERNS, 'DANGEROUS_COMMAND_PATTERNS')}

${serializePatternArray(DANGEROUS_SQL_PATTERNS, 'DANGEROUS_SQL_PATTERNS')}

// ─── Rule Results ───────────────────────────────────────────────────────────
const issues = [];
`;
}
