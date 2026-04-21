import type { ScanResult } from '../../engine/scanner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';

export function formatText(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(
    `\n${color.bold('VGuard Lint')} ${color.dim(glyph('dash'))} ${result.filesScanned} files scanned\n`,
  );

  if (result.issues.length === 0) {
    lines.push(`  ${color.green('No issues found.')}\n`);
    return lines.join('\n');
  }

  const byFile = new Map<string, typeof result.issues>();
  for (const issue of result.issues) {
    const existing = byFile.get(issue.filePath) ?? [];
    existing.push(issue);
    byFile.set(issue.filePath, existing);
  }

  for (const [filePath, issues] of byFile) {
    lines.push(`  ${color.bold(filePath)}`);
    for (const issue of issues) {
      let icon: string;
      if (issue.severity === 'block') icon = color.red(glyph('fail'));
      else if (issue.severity === 'warn') icon = color.yellow(glyph('warn'));
      else icon = color.cyan(glyph('info'));
      lines.push(`    ${icon} ${color.dim(`[${issue.ruleId}]`)} ${issue.message}`);
      if (issue.fix) {
        lines.push(`      ${color.dim('Fix:')} ${issue.fix}`);
      }
    }
    lines.push('');
  }

  const blocks = result.issues.filter((i) => i.severity === 'block').length;
  const warns = result.issues.filter((i) => i.severity === 'warn').length;
  const summary = `${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} (${blocks} blocking, ${warns} warnings)`;
  lines.push(`  ${blocks > 0 ? color.red(summary) : color.yellow(summary)}\n`);

  return lines.join('\n');
}
