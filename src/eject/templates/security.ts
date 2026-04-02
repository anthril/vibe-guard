import type { RuleTemplateContext } from './index.js';

export function branchProtection(ctx: RuleTemplateContext): string {
  const protectedBranches = (ctx.options.protectedBranches as string[]) ?? ['main', 'master'];
  return `// ${ctx.ruleId}
if (['Edit', 'Write'].includes(toolName) && branch) {
  const _bp_protected = ${JSON.stringify(protectedBranches)};
  if (_bp_protected.some(pb => branch.toLowerCase() === pb.toLowerCase())) {
    issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: "Cannot write on branch '" + branch + "'.", fix: 'Create a feature branch first.' });
  }
}`;
}

export function destructiveCommands(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Bash' && command) {
  for (const [name, pat, desc] of DANGEROUS_COMMAND_PATTERNS) {
    if (pat.test(command)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Dangerous command: ' + name + '. ' + desc + '.', fix: 'Run manually outside AI agent.' });
      break;
    }
  }
}`;
}

export function secretDetection(ctx: RuleTemplateContext): string {
  const allowPatterns = (ctx.options.allowPatterns as string[]) ?? [];
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content) {
  const _sd_filename = getFilename(filePath).toLowerCase();
  const _sd_safe = ['.env.example', '.env.sample', '.env.template', 'package-lock.json'];
  if (!_sd_safe.includes(_sd_filename)) {
    const _sd_allow = ${JSON.stringify(allowPatterns)};
    for (const [name, pat, desc] of SECRET_PATTERNS) {
      const m = pat.exec(content);
      if (m) {
        if (_sd_allow.some(a => m[0].includes(a))) continue;
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Potential ' + name + ' detected: ' + desc + '.', fix: 'Use environment variables.' });
        break;
      }
    }
  }
}`;
}

export function promptInjection(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (['Read', 'Fetch', 'WebFetch'].includes(toolName)) {
  const _pi_content = String(toolInput.content || toolInput.output || toolInput.result || '');
  if (_pi_content.length >= 20) {
    const _pi_patterns = [
      [/ignore\\s+(?:all\\s+)?previous\\s+instructions/i, 'ignore previous instructions'],
      [/you\\s+are\\s+now/i, 'role override attempt'],
      [/system:\\s*you\\s+are/i, 'fake system message'],
      [/\\[INST\\]|<<SYS>>|<\\|im_start\\|>/i, 'chat template tags'],
      [/(?:act|behave)\\s+as/i, 'role override'],
      [/disregard\\s+(?:all\\s+)?previous/i, 'instruction override'],
      [/do\\s+not\\s+follow/i, 'instruction override'],
      [/new\\s+instructions:/i, 'instruction injection'],
    ];
    for (const [pat, desc] of _pi_patterns) {
      if (pat.test(_pi_content)) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Potential prompt injection: ' + desc + '.' });
        break;
      }
    }
  }
}`;
}

export function dependencyAudit(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Bash' && command) {
  const _da_isInstall = /npm\\s+install\\b/i.test(command) || /yarn\\s+add\\b/i.test(command) || /pnpm\\s+add\\b/i.test(command) || /pip3?\\s+install\\b/i.test(command);
  if (_da_isInstall) {
    const _da_suspicious = [
      [/--ignore-scripts=false/, 'Scripts enabled explicitly'],
      [/npm\\s+install\\s+https?:\\/\\//i, 'Install from URL'],
      [/pip3?\\s+install\\s+--trusted-host/i, 'Untrusted host'],
      [/pip3?\\s+install\\s+.*http:\\/\\//i, 'Install over HTTP'],
    ];
    for (const [pat, desc] of _da_suspicious) {
      if (pat.test(command)) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Suspicious install: ' + desc + '.' });
        break;
      }
    }
  }
}`;
}

export function envExposure(ctx: RuleTemplateContext): string {
  const clientDirs = (ctx.options.clientDirs as string[]) ?? ['/app/', '/pages/', '/components/', '/src/app/', '/src/pages/', '/src/components/'];
  return `// ${ctx.ruleId}
if (['Write', 'Edit'].includes(toolName) && content && filePath) {
  const _ee_norm = filePath.replace(/\\\\/g, '/').toLowerCase();
  const _ee_clientDirs = ${JSON.stringify(clientDirs)};
  const _ee_isClient = _ee_clientDirs.some(d => _ee_norm.includes(d.toLowerCase())) || _ee_norm.endsWith('.tsx') || _ee_norm.endsWith('.jsx');
  if (_ee_isClient && !_ee_norm.includes('/api/') && !_ee_norm.includes('/server/') && !_ee_norm.endsWith('.server.ts') && !_ee_norm.endsWith('.server.tsx')) {
    if (/(?:import\\s+.*\\s+from\\s+|import\\s+|require\\s*\\()\\s*['"]\\.\\.?\\/?\\.env/.test(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Direct .env import in client code.', fix: 'Use NEXT_PUBLIC_ prefixed env vars.' });
    } else if (/console\\.\\w+\\(.*process\\.env\\b/.test(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'process.env logged to console.', fix: 'Remove console logging of env vars.' });
    } else if (/[{=]\\s*\\.\\.\\.process\\.env\\b/.test(content)) {
      issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Spreading process.env exposes all env vars.', fix: 'Reference specific env vars.' });
    }
  }
}`;
}

export function rlsRequired(ctx: RuleTemplateContext): string {
  return `// ${ctx.ruleId}
if (toolName === 'Write' && content && filePath) {
  const _rls_norm = filePath.replace(/\\\\/g, '/').toLowerCase();
  if (_rls_norm.endsWith('.sql')) {
    const _rls_createPat = /CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:(?:"[^"]+"|[\\w.]+)\\.)?(?:"([^"]+)"|(\\w+))/gi;
    const _rls_tables = [];
    let _rls_m;
    while ((_rls_m = _rls_createPat.exec(content)) !== null) {
      const t = _rls_m[1] || _rls_m[2];
      if (t) _rls_tables.push(t);
    }
    if (_rls_tables.length > 0) {
      const _rls_rlsPat = /ALTER\\s+TABLE\\s+(?:(?:"[^"]+"|[\\w.]+)\\.)?(?:"([^"]+)"|(\\w+))\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY/gi;
      const _rls_enabled = new Set();
      while ((_rls_m = _rls_rlsPat.exec(content)) !== null) {
        const t = _rls_m[1] || _rls_m[2];
        if (t) _rls_enabled.add(t.toLowerCase());
      }
      const _rls_missing = _rls_tables.filter(t => !_rls_enabled.has(t.toLowerCase()));
      if (_rls_missing.length > 0) {
        issues.push({ ruleId: '${ctx.ruleId}', severity: '${ctx.severity}', message: 'Tables missing RLS: ' + _rls_missing.join(', '), fix: _rls_missing.map(t => 'ALTER TABLE ' + t + ' ENABLE ROW LEVEL SECURITY;').join('\\n') });
      }
    }
  }
}`;
}
