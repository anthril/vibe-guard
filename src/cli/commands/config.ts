import '../../presets/index.js';
import '../../rules/index.js';

import { discoverConfigFile, readRawConfig } from '../../config/discovery.js';
import { resolveConfig } from '../../config/loader.js';
import { getAllPresets } from '../../config/presets.js';
import type { VGuardConfig } from '../../types.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

export async function configShowCommand(options: { json?: boolean; raw?: boolean }): Promise<void> {
  const projectRoot = process.cwd();

  const discovered = discoverConfigFile(projectRoot);
  if (!discovered) {
    error('No VGuard config found. Run `vguard init` first.');
    process.exit(EXIT.NO_INPUT);
  }

  const rawConfig = (await readRawConfig(discovered)) as VGuardConfig;

  if (options.raw) {
    if (options.json) {
      process.stdout.write(JSON.stringify(rawConfig, null, 2) + '\n');
    } else {
      printBanner('Config', 'raw');
      info(`  Source: ${discovered.path}\n`);
      info(JSON.stringify(rawConfig, null, 2));
      info('');
    }
    return;
  }

  const presetMap = getAllPresets();
  const resolved = resolveConfig(rawConfig, presetMap);

  if (options.json) {
    const output = {
      source: discovered.path,
      presets: resolved.presets,
      agents: resolved.agents,
      rules: Object.fromEntries(
        Array.from(resolved.rules.entries()).map(([id, cfg]) => [
          id,
          { enabled: cfg.enabled, severity: cfg.severity },
        ]),
      ),
      cloud: resolved.cloud ?? null,
    };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    return;
  }

  printBanner('Config', 'resolved');
  info(`  ${color.bold('Source:')}  ${discovered.path}`);
  info(
    `  ${color.bold('Presets:')} ${resolved.presets.length > 0 ? resolved.presets.join(', ') : color.dim('none')}`,
  );
  info(`  ${color.bold('Agents:')}  ${resolved.agents.join(', ')}`);
  info('');

  const enabledRules = Array.from(resolved.rules.entries()).filter(([, c]) => c.enabled);
  const disabledRules = Array.from(resolved.rules.entries()).filter(([, c]) => !c.enabled);

  info(
    `  ${color.bold('Rules:')} ${color.green(`${enabledRules.length} enabled`)}, ${color.dim(`${disabledRules.length} disabled`)}`,
  );
  info('');

  if (enabledRules.length > 0) {
    info(`  ${color.bold('Enabled:')}`);
    for (const [id, cfg] of enabledRules.sort(([a], [b]) => a.localeCompare(b))) {
      const sev = cfg.severity.toUpperCase();
      const sevColored =
        cfg.severity === 'block'
          ? color.red(sev)
          : cfg.severity === 'warn'
            ? color.yellow(sev)
            : color.cyan(sev);
      info(`    ${color.green(glyph('pass'))} ${id.padEnd(40)} ${sevColored}`);
    }
    info('');
  }

  if (disabledRules.length > 0) {
    info(`  ${color.bold('Disabled:')}`);
    for (const [id] of disabledRules.sort(([a], [b]) => a.localeCompare(b))) {
      info(color.dim(`    ${glyph('dot')} ${id}`));
    }
    info('');
  }

  if (resolved.cloud) {
    info(`  ${color.bold('Cloud:')}`);
    info(`    Enabled:   ${resolved.cloud.enabled ? color.green('yes') : color.dim('no')}`);
    info(`    Auto-sync: ${resolved.cloud.autoSync ? color.green('yes') : color.dim('no')}`);
    info('');
  }
}

export async function configSetCommand(key: string, value: string): Promise<void> {
  const projectRoot = process.cwd();

  const discovered = discoverConfigFile(projectRoot);
  if (!discovered) {
    error('No VGuard config found. Run `vguard init` first.');
    process.exit(EXIT.NO_INPUT);
  }

  if (!discovered.path.endsWith('.json')) {
    info(`\n  TypeScript configs cannot be modified programmatically.`);
    info(`  Edit ${discovered.path} directly and set "${key}" to "${value}".\n`);
    return;
  }

  const { readFile, writeFile } = await import('node:fs/promises');
  const raw = await readFile(discovered.path, 'utf-8');
  const config = JSON.parse(raw);

  const keys = key.split('.');
  let target = config;
  for (let i = 0; i < keys.length - 1; i++) {
    target[keys[i]] = target[keys[i]] ?? {};
    target = target[keys[i]];
  }

  const finalKey = keys[keys.length - 1];
  if (value === 'true') {
    target[finalKey] = true;
  } else if (value === 'false') {
    target[finalKey] = false;
  } else if (/^\d+$/.test(value)) {
    target[finalKey] = parseInt(value, 10);
  } else {
    target[finalKey] = value;
  }

  await writeFile(discovered.path, JSON.stringify(config, null, 2), 'utf-8');
  info(`  ${color.green(glyph('pass'))} Set ${color.bold(key)} = ${color.bold(value)}`);
  info('  Run `vguard generate` to apply changes.\n');
}
