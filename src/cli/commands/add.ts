import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import '../../presets/index.js';
import '../../rules/index.js';

import { hasRule } from '../../engine/registry.js';
import { hasPreset } from '../../config/presets.js';

export async function addCommand(id: string): Promise<void> {
  const projectRoot = process.cwd();
  const configPath = findConfigPath(projectRoot);

  if (!configPath) {
    console.error('  No VGuard config found. Run `vguard init` first.');
    process.exit(1);
  }

  // Determine if it's a preset or rule
  const isPreset = id.startsWith('preset:');
  const actualId = isPreset ? id.replace('preset:', '') : id;

  if (isPreset) {
    if (!hasPreset(actualId)) {
      console.error(`  Unknown preset: "${actualId}". Available presets:`);
      // List available presets would go here
      process.exit(1);
    }
  } else {
    if (!hasRule(actualId)) {
      console.error(`  Unknown rule: "${actualId}".`);
      process.exit(1);
    }
  }

  // Read and modify config
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
    // For TypeScript configs, we append a comment with instructions
    console.log(`\n  Add the following to your vguard.config.ts:\n`);
    if (isPreset) {
      console.log(`    presets: [..., '${actualId}'],`);
    } else {
      console.log(`    rules: { ..., '${actualId}': true },`);
    }
    console.log(`\n  Then run \`vguard generate\` to update hooks.\n`);
    return;
  }

  console.log(`  Added ${isPreset ? 'preset' : 'rule'}: ${actualId}`);
  console.log('  Run `vguard generate` to update hooks.\n');
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
