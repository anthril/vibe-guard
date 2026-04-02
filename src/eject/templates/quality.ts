import type { RuleTemplateContext } from './index.js';

export function antiPatterns(ctx: RuleTemplateContext): string {
  const blockCssFiles = ctx.options.blockCssFiles ?? false;
  const blockInlineStyles = ctx.options.blockInlineStyles ?? false;
  const blockConsoleLog = ctx.options.blockConsoleLog ?? false;
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _ap_ext = getExtension(filePath);
  ${blockCssFiles ? `if (['css', 'scss', 'sass', 'less'].includes(_ap_ext)) {
    const _ap_fn = getFilename(filePath);
    if (!_ap_fn.match(/^(globals?|reset|normalize)\\./i)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'CSS file in Tailwind project. Use utility classes.', fix: 'Use Tailwind classes instead.' });
    }
  }` : ''}
  ${blockInlineStyles ? `if (['tsx', 'jsx'].includes(_ap_ext) && /style=\\{\\{/.test(content)) {
    issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Inline styles detected. Use Tailwind utility classes.' });
  }` : ''}
  ${blockConsoleLog ? `if (['ts', 'tsx', 'js', 'jsx'].includes(_ap_ext) && !filePath.match(/\\.(test|spec|stories)\\./)) {
    if (/\\bconsole\\.log\\s*\\(/.test(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'console.log() detected. Use proper logger.' });
    }
  }` : ''}
}`;
}

export function importAliases(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _ia_ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(_ia_ext)) {
    if (hasSrcImport(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Import from "src/" detected. Use path alias (@/).', fix: "Replace 'from \\"src/...\\"' with 'from \\"@/...\\"'" });
    } else if (hasDeepRelativeImport(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Deep relative import (4+ levels). Use path alias.' });
    }
  }
}`;
}

export function noUseClientInPages(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _nuc_fn = getFilename(filePath).toLowerCase();
  const _nuc_norm = normalizePath(filePath).toLowerCase();
  const _nuc_isPage = /^page\\.(tsx?|jsx?)$/.test(_nuc_fn);
  const _nuc_isLayout = /^layout\\.(tsx?|jsx?)$/.test(_nuc_fn);
  if ((_nuc_isPage || _nuc_isLayout) && (_nuc_norm.includes('/app/') || _nuc_norm.includes('/src/app/'))) {
    if (hasUseClientDirective(content)) {
      const _nuc_type = _nuc_isPage ? 'page' : 'layout';
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: '"use client" in ' + _nuc_type + ' file. Should be Server Component.', fix: 'Remove "use client". Extract client logic into separate component.' });
    }
  }
}`;
}

export function noDeprecatedApi(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _nda_ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(_nda_ext)) {
    const _nda_deps = [
      [/\\bcacheTime\\b/, 'cacheTime', 'gcTime', 'React Query v5 renamed cacheTime to gcTime'],
      [/\\bgetServerSideProps\\b/, 'getServerSideProps', 'Server Components', 'Next.js App Router uses Server Components'],
      [/\\bgetStaticProps\\b/, 'getStaticProps', 'Server Components with fetch()', 'Next.js App Router uses Server Components'],
      [/\\bgetStaticPaths\\b/, 'getStaticPaths', 'generateStaticParams()', 'Next.js App Router uses generateStaticParams'],
      [/\\bReact\\.FC\\b/, 'React.FC', 'explicit props type', 'React.FC is discouraged'],
    ];
    for (const [pat, name, _repl, desc] of _nda_deps) {
      if (pat.test(content)) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Deprecated API "' + name + '". ' + desc + '.' });
        break;
      }
    }
  }
}`;
}

export function namingConventions(ctx: RuleTemplateContext): string {
  const componentDirs = (ctx.options.componentDirs as string[]) ?? ['/components/', '/_components/'];
  const hookDirs = (ctx.options.hookDirs as string[]) ?? ['/hooks/', '/_hooks/'];
  const vagueFilenames = (ctx.options.vagueFilenames as string[]) ?? ['utils.ts', 'helpers.ts', 'misc.ts', 'utils.tsx', 'helpers.tsx', 'misc.tsx'];
  return `// ${ctx.ruleId}
if (toolName === 'Write' && filePath) {
  const _nc_norm = normalizePath(filePath).toLowerCase();
  const _nc_fn = getFilename(filePath);
  const _nc_base = _nc_fn.split('.')[0];
  const _nc_vague = ${JSON.stringify(vagueFilenames)};
  if (_nc_vague.includes(_nc_fn.toLowerCase())) {
    issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Vague filename "' + _nc_fn + '". Use descriptive name.', fix: 'Rename to something specific like "date-utils.ts"' });
  } else {
    const _nc_compDirs = ${JSON.stringify(componentDirs)};
    const _nc_hookDirs = ${JSON.stringify(hookDirs)};
    if (_nc_compDirs.some(d => _nc_norm.includes(d.toLowerCase())) && /\\.(tsx?|jsx?)$/.test(_nc_fn)) {
      if (_nc_base !== 'index' && _nc_base !== 'page' && _nc_base !== 'layout' && !/^[A-Z][a-zA-Z0-9]*$/.test(_nc_base)) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Component file should use PascalCase.', fix: 'Rename with PascalCase.' });
      }
    }
    if (_nc_hookDirs.some(d => _nc_norm.includes(d.toLowerCase())) && /\\.(tsx?|jsx?)$/.test(_nc_fn)) {
      if (_nc_base !== 'index' && !_nc_base.startsWith('use') && !_nc_base.startsWith('Use')) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Hook file should start with "use" prefix.' });
      }
    }
  }
}`;
}

export function noConsoleLog(ctx: RuleTemplateContext): string {
  const allowInTests = ctx.options.allowInTests ?? true;
  const allowInScripts = ctx.options.allowInScripts ?? true;
  return `// ${ctx.ruleId}
if (['Write', 'Edit'].includes(toolName) && content && filePath) {
  const _ncl_ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(_ncl_ext)) {
    const _ncl_norm = filePath.replace(/\\\\/g, '/').toLowerCase();
    let _ncl_skip = false;
    ${allowInTests ? `if (_ncl_norm.includes('.test.') || _ncl_norm.includes('.spec.') || _ncl_norm.includes('__tests__/') || _ncl_norm.includes('/test/') || _ncl_norm.includes('/tests/')) _ncl_skip = true;` : ''}
    ${allowInScripts ? `if (_ncl_norm.includes('/scripts/') || _ncl_norm.includes('/bin/')) _ncl_skip = true;` : ''}
    if (!_ncl_skip && /\\bconsole\\.log\\s*\\(/.test(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'console.log detected. Use proper logger.' });
    }
  }
}`;
}

export function maxFileLength(ctx: RuleTemplateContext): string {
  const maxLines = (ctx.options.maxLines as number) ?? 400;
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _mfl_ext = filePath.split('.').pop()?.toLowerCase() || '';
  const _mfl_exts = ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'vue', 'svelte', 'astro'];
  if (_mfl_exts.includes(_mfl_ext)) {
    const _mfl_norm = filePath.replace(/\\\\/g, '/').toLowerCase();
    if (!_mfl_norm.includes('/generated/') && !_mfl_norm.includes('/vendor/') && !_mfl_norm.includes('.min.')) {
      const _mfl_lines = content.split('\\n').length;
      if (_mfl_lines > ${maxLines}) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'File is ' + _mfl_lines + ' lines (limit: ${maxLines}). Consider splitting.' });
      }
    }
  }
}`;
}

export function hallucinationGuard(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _hg_ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(_hg_ext)) {
    const _hg_dir = path.dirname(filePath);
    const _hg_importRe = /(?:import|from)\\s+['"](\\.[\\/][^'"]+)['"]/g;
    let _hg_m;
    const _hg_missing = [];
    while ((_hg_m = _hg_importRe.exec(content)) !== null) {
      const _hg_imp = _hg_m[1];
      const _hg_resolved = path.resolve(_hg_dir, _hg_imp);
      const _hg_exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];
      const _hg_idxExts = ['/index.ts', '/index.tsx', '/index.js'];
      const _hg_found = _hg_exts.some(e => fs.existsSync(_hg_resolved + e)) || _hg_idxExts.some(e => fs.existsSync(_hg_resolved + e));
      if (!_hg_found) _hg_missing.push(_hg_imp);
    }
    if (_hg_missing.length > 0) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Import(s) may reference non-existent files: ' + _hg_missing.join(', '), fix: 'Verify paths exist. AI may have hallucinated a file path.' });
    }
  }
}`;
}

export function testCoverage(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && filePath) {
  const _tc_ext = getExtension(filePath);
  if (['ts', 'tsx', 'js', 'jsx'].includes(_tc_ext)) {
    const _tc_norm = normalizePath(filePath).toLowerCase();
    const _tc_name = getFilename(filePath);
    const _tc_base = _tc_name.replace(/\\.[^.]+$/, '');
    if (_tc_base !== 'index' && !_tc_base.endsWith('.test') && !_tc_base.endsWith('.spec') && !_tc_base.endsWith('.d') && !_tc_name.match(/\\.config\\./) && !_tc_norm.includes('/tests/') && !_tc_norm.includes('/__tests__/')) {
      const _tc_dir = path.dirname(filePath);
      const _tc_suffixes = ['.test', '.spec'];
      const _tc_testExts = ['ts', 'tsx', 'js', 'jsx'];
      let _tc_found = false;
      for (const s of _tc_suffixes) {
        for (const e of _tc_testExts) {
          if (fs.existsSync(path.join(_tc_dir, _tc_base + s + '.' + e))) { _tc_found = true; break; }
          const _tc_mirrored = _tc_norm.replace('/src/', '/tests/');
          if (_tc_mirrored !== _tc_norm) {
            const _tc_mDir = path.dirname(_tc_mirrored);
            if (fs.existsSync(path.join(_tc_mDir, _tc_base + s + '.' + e))) { _tc_found = true; break; }
          }
        }
        if (_tc_found) break;
      }
      if (!_tc_found) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'No test file found for "' + _tc_name + '".', fix: 'Create: ' + _tc_base + '.test.' + _tc_ext });
      }
    }
  }
}`;
}

export function fileStructure(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _fs_norm = normalizePath(filePath).toLowerCase();
  const _fs_ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx'].includes(_fs_ext)) {
    const _fs_isComp = (_fs_ext === 'tsx' || _fs_ext === 'jsx') && (/export\\s+(default\\s+)?function\\s+[A-Z]/.test(content) || /export\\s+const\\s+[A-Z]\\w+\\s*[:=]/.test(content));
    const _fs_isHook = /export\\s+(default\\s+)?function\\s+use[A-Z]/.test(content) || /export\\s+const\\s+use[A-Z]\\w+\\s*=/.test(content);
    if (_fs_isComp && !_fs_isHook && !_fs_norm.includes('/components/') && !_fs_norm.includes('/_components/') && !_fs_norm.includes('/app/') && !_fs_norm.includes('/pages/')) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'React component outside standard component directory.', fix: 'Move to /components/ folder.' });
    }
    if (_fs_isHook && !_fs_norm.includes('/hooks/') && !_fs_norm.includes('/_hooks/')) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'React hook outside standard hooks directory.', fix: 'Move to /hooks/ folder.' });
    }
  }
}`;
}

export function deadExports(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId} — not inlined (requires filesystem scanning; use VGuard for full support)`;
}
