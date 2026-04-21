import { writeFileSync, readFileSync } from 'node:fs';

import '../../presets/index.js';
import '../../rules/index.js';

import { discoverConfigFile, readRawConfig } from '../../config/discovery.js';
import { resolveConfig } from '../../config/loader.js';
import { getAllPresets } from '../../config/presets.js';
import { scanProject } from '../../engine/scanner.js';
import type { VGuardConfig, HookContext } from '../../types.js';
import { getAllRules } from '../../engine/registry.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

export async function fixCommand(options: { dryRun?: boolean } = {}): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Fix', options.dryRun ? 'Preview autofixes (dry run)' : 'Auto-fixing issues');

  const discovered = discoverConfigFile(projectRoot);
  if (!discovered) {
    error('No VGuard config found. Run `vguard init` first.');
    process.exit(EXIT.NO_INPUT);
  }

  const rawConfig = await readRawConfig(discovered);
  const presetMap = getAllPresets();
  const config = resolveConfig(rawConfig as VGuardConfig, presetMap);

  const scanResult = await scanProject({ rootDir: projectRoot, config });

  if (scanResult.issues.length === 0) {
    info(`  ${color.green('No issues found.')}\n`);
    return;
  }

  const allRules = getAllRules();
  let fixesApplied = 0;
  let fixesAvailable = 0;

  const issuesByFile = new Map<string, typeof scanResult.issues>();
  for (const issue of scanResult.issues) {
    const existing = issuesByFile.get(issue.filePath) ?? [];
    existing.push(issue);
    issuesByFile.set(issue.filePath, existing);
  }

  for (const [filePath, issues] of issuesByFile) {
    for (const issue of issues) {
      const rule = allRules.get(issue.ruleId);
      if (!rule) continue;

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const context: HookContext = {
        event: 'PreToolUse',
        tool: 'Write',
        toolInput: { file_path: filePath, content },
        projectConfig: config,
        gitContext: {
          branch: null,
          isDirty: false,
          repoRoot: projectRoot,
          unpushedCount: 0,
          hasRemote: false,
        },
      };

      const result = await rule.check(context);
      if (result.autofix) {
        fixesAvailable++;

        if (!options.dryRun) {
          try {
            writeFileSync(filePath, result.autofix.newContent, 'utf-8');
            fixesApplied++;
            info(
              `  ${color.green(glyph('pass'))} Fixed ${color.dim(`[${issue.ruleId}]`)} in ${filePath}`,
            );
            info(color.dim(`      ${result.autofix.description}`));
          } catch (err) {
            process.stderr.write(
              `  ${color.red(glyph('fail'))} Failed to apply fix to ${filePath}: ${err}\n`,
            );
          }
        } else {
          info(
            `  ${color.cyan(glyph('arrow'))} Would fix ${color.dim(`[${issue.ruleId}]`)} in ${filePath}`,
          );
          info(color.dim(`      ${result.autofix.description}`));
        }
      }
    }
  }

  info('');
  if (options.dryRun) {
    info(
      `  ${color.cyan(`${fixesAvailable}`)} autofix${fixesAvailable !== 1 ? 'es' : ''} available.`,
    );
    info('  Run `vguard fix` without --dry-run to apply.\n');
  } else if (fixesApplied > 0) {
    info(`  ${color.green(`Applied ${fixesApplied} autofix${fixesApplied !== 1 ? 'es' : ''}.`)}\n`);
  } else {
    info(
      `  ${color.yellow(`${scanResult.issues.length} issue${scanResult.issues.length !== 1 ? 's' : ''} found`)} but no autofixes available.\n`,
    );
  }
}
