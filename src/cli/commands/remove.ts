import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export async function removeCommand(id: string): Promise<void> {
  const projectRoot = process.cwd();
  const configPath = findConfigPath(projectRoot);

  if (!configPath) {
    console.error('  No vibecheck config found. Run `vibecheck init` first.');
    process.exit(1);
  }

  const isPreset = id.startsWith('preset:');
  const actualId = isPreset ? id.replace('preset:', '') : id;

  if (configPath.endsWith('.json')) {
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);

    if (isPreset) {
      config.presets = (config.presets ?? []).filter((p: string) => p !== actualId);
    } else {
      if (config.rules) {
        config.rules[actualId] = false;
      }
    }

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`  Removed ${isPreset ? 'preset' : 'rule'}: ${actualId}`);
    console.log('  Run `vibecheck generate` to update hooks.\n');
  } else {
    console.log(`\n  To remove from your vibecheck.config.ts:\n`);
    if (isPreset) {
      console.log(`    Remove '${actualId}' from the presets array.`);
    } else {
      console.log(`    Set '${actualId}': false in the rules object.`);
    }
    console.log(`\n  Then run \`vibecheck generate\` to update hooks.\n`);
  }
}

function findConfigPath(projectRoot: string): string | null {
  const candidates = [
    'vibecheck.config.ts',
    'vibecheck.config.js',
    'vibecheck.config.mjs',
    '.vibecheckrc.json',
  ];

  for (const file of candidates) {
    const path = join(projectRoot, file);
    if (existsSync(path)) return path;
  }

  return null;
}
