import '../../presets/index.js';
import '../../rules/index.js';

import { getAllPresets } from '../../config/presets.js';
import { discoverConfigFile, readRawConfig } from '../../config/discovery.js';
import { resolveConfig } from '../../config/loader.js';
import type { VGuardConfig } from '../../types.js';
import { addCommand } from './add.js';
import { removeCommand } from './remove.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { info } from '../ui/log.js';

export async function presetsListCommand(options: {
  installed?: boolean;
  json?: boolean;
}): Promise<void> {
  const projectRoot = process.cwd();
  const allPresets = getAllPresets();

  let activePresetIds = new Set<string>();

  const discovered = discoverConfigFile(projectRoot);
  if (discovered) {
    try {
      const rawConfig = (await readRawConfig(discovered)) as VGuardConfig;
      const presetMap = getAllPresets();
      const resolved = resolveConfig(rawConfig, presetMap);
      activePresetIds = new Set(resolved.presets);
    } catch {
      // Config errors are non-fatal for listing
    }
  }

  const presets = Array.from(allPresets.entries())
    .map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      version: preset.version,
      installed: activePresetIds.has(id),
      ruleCount: Object.keys(preset.rules).length,
    }))
    .filter((p) => !options.installed || p.installed)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (options.json) {
    process.stdout.write(JSON.stringify(presets, null, 2) + '\n');
    return;
  }

  if (presets.length === 0) {
    info('\n  No presets found.');
    if (options.installed) {
      info('  Remove --installed to see all available presets.\n');
    }
    return;
  }

  printBanner(
    'Presets',
    `${presets.filter((p) => p.installed).length} installed / ${allPresets.size} available`,
  );

  for (const preset of presets) {
    const status = preset.installed ? color.green(glyph('pass')) : color.dim(glyph('dot'));
    const head = `${status} ${color.bold(preset.id.padEnd(25))} ${preset.name}`;
    info(`  ${preset.installed ? head : color.dim(head)}`);
    info(color.dim(`      ${preset.description}`));
    info(color.dim(`      ${preset.ruleCount} rules | v${preset.version}`));
    info('');
  }

  const installed = presets.filter((p) => p.installed).length;
  info(`  ${installed}/${allPresets.size} presets installed.\n`);
}

export async function presetsAddCommand(presetId: string): Promise<void> {
  await addCommand(`preset:${presetId}`);
}

export async function presetsRemoveCommand(presetId: string): Promise<void> {
  await removeCommand(`preset:${presetId}`);
}
