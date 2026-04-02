import type { RuleTemplateContext } from './index.js';

export function commitConventions(ctx: RuleTemplateContext): string {
  const types = (ctx.options.types as string[]) ?? [
    'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
    'test', 'build', 'ci', 'chore', 'revert',
  ];
  return `// ${ctx.ruleId}
{
  const _cc_last = repoRoot ? gitCmd(['log', '-1', '--format=%s'], repoRoot) : null;
  if (_cc_last) {
    const _cc_types = ${JSON.stringify(types)};
    const _cc_re = new RegExp('^(' + _cc_types.join('|') + ')(\\\\(.+\\\\))?!?:\\\\s.+');
    if (!_cc_re.test(_cc_last)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Last commit does not follow conventional commit format.', fix: 'Use: type(scope): description' });
    }
  }
}`;
}

export function migrationSafety(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  if (getExtension(filePath) === 'sql') {
    const _ms_warns = [];
    for (const [name, pat, desc] of DANGEROUS_SQL_PATTERNS) {
      if (pat.test(content)) _ms_warns.push(name + ': ' + desc);
    }
    if (/['"]\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b['"]/i.test(content)) {
      _ms_warns.push('Hardcoded UUID — use variables/parameters');
    }
    if (!content.trim().startsWith('--')) {
      _ms_warns.push('Missing migration header comment');
    }
    if (_ms_warns.length > 0) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Migration safety warnings:\\n' + _ms_warns.map(w => '  - ' + w).join('\\n'), fix: 'Add safety guards (IF EXISTS, WHERE clauses).' });
    }
  }
}`;
}

export function changelogReminder(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (repoRoot) {
  const _cr_clPath = path.join(repoRoot, 'CHANGELOG.md');
  if (fs.existsSync(_cr_clPath)) {
    const _cr_changed = (gitCmd(['diff', '--name-only', 'HEAD'], repoRoot) || gitCmd(['diff', '--name-only'], repoRoot) || '').split('\\n').filter(Boolean);
    if (_cr_changed.length > 0 && !_cr_changed.some(f => f.toLowerCase() === 'changelog.md')) {
      const _cr_hasMig = _cr_changed.some(f => f.toLowerCase().includes('migration'));
      if (_cr_changed.length > 5 || _cr_hasMig) {
        const _cr_reason = _cr_hasMig ? 'Migration files modified' : _cr_changed.length + ' files changed';
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: _cr_reason + ' but CHANGELOG.md not updated.', fix: 'Add entry to CHANGELOG.md.' });
      }
    }
  }
}`;
}

export function todoTracker(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (['Write', 'Edit'].includes(toolName) && content && filePath) {
  const _tt_ext = filePath.split('.').pop()?.toLowerCase() || '';
  const _tt_srcExts = ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'vue', 'svelte', 'astro', 'css', 'scss'];
  if (_tt_srcExts.includes(_tt_ext)) {
    const _tt_matches = content.match(/\\b(TODO|FIXME|HACK|XXX)\\b/gi) || [];
    if (_tt_matches.length > 0) {
      const _tt_cats = {};
      for (const m of _tt_matches) { const k = m.toUpperCase(); _tt_cats[k] = (_tt_cats[k] || 0) + 1; }
      const _tt_summary = Object.entries(_tt_cats).map(([k, v]) => v + ' ' + k).join(', ');
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'File contains ' + _tt_matches.length + ' marker comment(s): ' + _tt_summary + '.', fix: 'Address TODOs/FIXMEs before merging.' });
    }
  }
}`;
}

export function prReminder(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (repoRoot && branch) {
  const _pr_issues = [];
  if (isDirty) _pr_issues.push('Uncommitted changes');
  if (unpushedCount > 0) _pr_issues.push(unpushedCount + ' unpushed commit' + (unpushedCount > 1 ? 's' : ''));
  if (!hasRemote && branch !== 'main' && branch !== 'master') _pr_issues.push('Branch "' + branch + '" has no remote');
  if (_pr_issues.length > 0) {
    const _pr_onProtected = ['main', 'master', 'dev'].includes(branch.toLowerCase());
    let _pr_fix = 'Commit and push changes.';
    if (_pr_onProtected && isDirty) _pr_fix = 'Create feature branch: git checkout -b feat/your-change';
    else if (!hasRemote) _pr_fix = 'Push: git push -u origin ' + branch;
    else if (unpushedCount > 0) _pr_fix = 'Push: git push';
    issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Pending work on "' + branch + '": ' + _pr_issues.join(', ') + '.', fix: _pr_fix });
  }
}`;
}

export function formatOnSave(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (['Write', 'Edit'].includes(toolName) && filePath && repoRoot) {
  const _fos_ext = filePath.split('.').pop()?.toLowerCase() || '';
  let _fos_formatter = null;
  if (_fos_ext === 'py' && (fs.existsSync(path.join(repoRoot, 'pyproject.toml')) || fs.existsSync(path.join(repoRoot, '.flake8')))) {
    _fos_formatter = { name: 'Black', command: 'black ' + filePath };
  } else if (_fos_ext === 'go') {
    _fos_formatter = { name: 'gofmt', command: 'gofmt -w ' + filePath };
  } else if (_fos_ext === 'rs') {
    _fos_formatter = { name: 'rustfmt', command: 'rustfmt ' + filePath };
  } else if (['ts', 'tsx', 'js', 'jsx', 'css', 'json', 'html', 'vue', 'svelte'].includes(_fos_ext)) {
    if (fs.existsSync(path.join(repoRoot, 'biome.json')) || fs.existsSync(path.join(repoRoot, 'biome.jsonc'))) {
      _fos_formatter = { name: 'Biome', command: 'npx biome format --write ' + filePath };
    } else if (fs.existsSync(path.join(repoRoot, '.prettierrc')) || fs.existsSync(path.join(repoRoot, '.prettierrc.json')) || fs.existsSync(path.join(repoRoot, 'prettier.config.js')) || fs.existsSync(path.join(repoRoot, 'prettier.config.mjs'))) {
      _fos_formatter = { name: 'Prettier', command: 'npx prettier --write ' + filePath };
    }
  }
  if (_fos_formatter) {
    issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'File should be formatted with ' + _fos_formatter.name + '.', fix: _fos_formatter.command });
  }
}`;
}

export function reviewGate(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (repoRoot && branch) {
  const _rg_protected = ['main', 'master'];
  if (_rg_protected.some(pb => branch.toLowerCase() === pb.toLowerCase())) {
    if (unpushedCount > 0) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: unpushedCount + ' commit(s) on "' + branch + '". Use pull request.', fix: 'Create feature branch and PR.' });
    } else if (isDirty) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Uncommitted changes on "' + branch + '". Create feature branch first.', fix: 'git checkout -b feat/your-change' });
    }
  }
}`;
}
