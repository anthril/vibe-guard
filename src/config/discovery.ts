import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Supported config file names in priority order */
const CONFIG_FILES = [
  'vibecheck.config.ts',
  'vibecheck.config.js',
  'vibecheck.config.mjs',
  '.vibecheckrc.json',
];

export interface DiscoveredConfig {
  /** Absolute path to the config file */
  path: string;
  /** Config file format */
  format: 'typescript' | 'javascript' | 'json';
}

/**
 * Find the vibecheck config file in a project root.
 * Searches in priority order: .ts > .js > .mjs > .json > package.json#vibecheck
 */
export function discoverConfigFile(projectRoot: string): DiscoveredConfig | null {
  for (const filename of CONFIG_FILES) {
    const fullPath = join(projectRoot, filename);
    if (existsSync(fullPath)) {
      const format = filename.endsWith('.json')
        ? 'json'
        : filename.endsWith('.ts')
          ? 'typescript'
          : 'javascript';
      return { path: fullPath, format };
    }
  }

  // Check package.json for "vibecheck" field
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      // We'll read synchronously for discovery — this is a fast check
      const raw = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      if (pkg.vibecheck) {
        return { path: pkgPath, format: 'json' };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Read the raw config from a discovered config file.
 * For TypeScript/JavaScript files, uses jiti for runtime loading.
 * For JSON files, parses directly.
 */
export async function readRawConfig(
  discovered: DiscoveredConfig,
): Promise<Record<string, unknown>> {
  if (discovered.format === 'json') {
    const raw = await readFile(discovered.path, 'utf-8');
    const parsed = JSON.parse(raw);

    // If it's package.json, extract the "vibecheck" field
    if (discovered.path.endsWith('package.json')) {
      return parsed.vibecheck ?? {};
    }
    return parsed;
  }

  // TypeScript or JavaScript — use jiti for runtime loading
  const { createJiti } = await import('jiti');
  const jiti = createJiti(discovered.path, {
    interopDefault: true,
  });
  const mod = await jiti.import(discovered.path);

  // Handle default export
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: Record<string, unknown> }).default;
  }
  return mod as Record<string, unknown>;
}
