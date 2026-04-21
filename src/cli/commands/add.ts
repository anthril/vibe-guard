import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import '../../presets/index.js';
import '../../rules/index.js';

import { getAllRules, hasRule } from '../../engine/registry.js';
import { getAllPresets, hasPreset } from '../../config/presets.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

export async function addCommand(id?: string): Promise<void> {
  if (!id) {
    emitMissingIdHelp('add');
    process.exit(EXIT.USAGE);
  }

  const projectRoot = process.cwd();
  const configPath = findConfigPath(projectRoot);

  printBanner('Add', id);

  if (!configPath) {
    error('No VGuard config found. Run `vguard init` first.');
    process.exit(EXIT.NO_INPUT);
  }

  const isPreset = id.startsWith('preset:');
  const actualId = isPreset ? id.replace('preset:', '') : id;

  if (isPreset) {
    if (!hasPreset(actualId)) {
      error(`Unknown preset "${actualId}".`);
      console.error(color.dim('  Run `vguard presets list` to see available presets.'));
      process.exit(EXIT.USAGE);
    }
  } else if (!hasRule(actualId)) {
    error(`Unknown rule "${actualId}".`);
    console.error(color.dim('  Run `vguard rules list --all` to see available rules.'));
    process.exit(EXIT.USAGE);
  }

  const raw = await readFile(configPath, 'utf-8');

  if (configPath.endsWith('.json')) {
    const config = JSON.parse(raw);
    if (isPreset) {
      config.presets = config.presets ?? [];
      if (!config.presets.includes(actualId)) {
        config.presets.push(actualId);
      }
    } else {
      config.rules = config.rules ?? {};
      config.rules[actualId] = true;
    }
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } else {
    info(`\n  Add the following to your vguard.config.ts:\n`);
    if (isPreset) {
      info(color.cyan(`    presets: [..., '${actualId}'],`));
    } else {
      info(color.cyan(`    rules: { ..., '${actualId}': true },`));
    }
    info(`\n  Then run \`vguard generate\` to update hooks.\n`);
    return;
  }

  info(
    `  ${color.green(glyph('pass'))} Added ${isPreset ? 'preset' : 'rule'}: ${color.bold(actualId)}`,
  );
  info('  Run `vguard generate` to update hooks.\n');
}

/**
 * Emits a structured, discoverable error when the user runs
 * `vguard add` or `vguard remove` without an id. Surfaces real examples
 * drawn from the current rule/preset registry so users wiring these
 * commands into npm scripts don't hit a dead end.
 */
export function emitMissingIdHelp(action: 'add' | 'remove'): void {
  const verb = action === 'add' ? 'Adding' : 'Removing';
  const gerund = action === 'add' ? 'add' : 'remove';
  const ruleSample = pickSample(Array.from(getAllRules().keys()), [
    'security/branch-protection',
    'security/destructive-commands',
    'quality/anti-patterns',
  ]);
  const presetSample = pickSample(Array.from(getAllPresets().keys()), [
    'nextjs-15',
    'typescript-strict',
    'react-19',
  ]);

  error(`Missing rule or preset id.`);
  console.error('');
  console.error(`  Usage:  ${color.bold(`vguard ${gerund} <id>`)}`);
  console.error('');
  console.error(`  ${verb} a rule:`);
  if (ruleSample) console.error(color.cyan(`    vguard ${gerund} ${ruleSample}`));
  console.error('');
  console.error(`  ${verb} a preset:`);
  if (presetSample) console.error(color.cyan(`    vguard ${gerund} preset:${presetSample}`));
  console.error('');
  console.error(color.dim('  Discover available ids:'));
  console.error(
    color.dim(
      `    vguard rules list --all   ${glyph('arrow')} rule ids (e.g. quality/no-god-files)`,
    ),
  );
  console.error(
    color.dim(`    vguard presets list        ${glyph('arrow')} preset ids (e.g. nextjs-15)`),
  );
  console.error('');
}

function pickSample(available: string[], preferred: string[]): string | null {
  for (const id of preferred) {
    if (available.includes(id)) return id;
  }
  return available[0] ?? null;
}

function findConfigPath(projectRoot: string): string | null {
  const candidates = [
    'vguard.config.ts',
    'vguard.config.js',
    'vguard.config.mjs',
    '.vguardrc.json',
  ];

  for (const file of candidates) {
    const path = join(projectRoot, file);
    if (existsSync(path)) return path;
  }

  return null;
}
