import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';
import { emitMissingIdHelp } from './add.js';

export async function removeCommand(id?: string): Promise<void> {
  if (!id) {
    emitMissingIdHelp('remove');
    process.exit(EXIT.USAGE);
  }

  const projectRoot = process.cwd();
  const configPath = findConfigPath(projectRoot);

  printBanner('Remove', id);

  if (!configPath) {
    error('No VGuard config found. Run `vguard init` first.');
    process.exit(EXIT.NO_INPUT);
  }

  const isPreset = id.startsWith('preset:');
  const actualId = isPreset ? id.replace('preset:', '') : id;

  if (configPath.endsWith('.json')) {
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    if (isPreset) {
      config.presets = (config.presets ?? []).filter((p: string) => p !== actualId);
    } else if (config.rules) {
      config.rules[actualId] = false;
    }

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    info(
      `  ${color.yellow(glyph('dot'))} Removed ${isPreset ? 'preset' : 'rule'}: ${color.bold(actualId)}`,
    );
    info('  Run `vguard generate` to update hooks.\n');
  } else {
    info(`\n  To remove from your vguard.config.ts:\n`);
    if (isPreset) {
      info(color.cyan(`    Remove '${actualId}' from the presets array.`));
    } else {
      info(color.cyan(`    Set '${actualId}': false in the rules object.`));
    }
    info(`\n  Then run \`vguard generate\` to update hooks.\n`);
  }
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
