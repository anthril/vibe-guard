import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { CloudConfig, ResolvedConfig, ResolvedRuleConfig } from '../types.js';

/** Path for pre-compiled config cache (relative to project root) */
const CACHE_PATH = '.vguard/cache/resolved-config.json';

/** Serializable form of ResolvedConfig (Map → object) */
interface SerializedConfig {
  presets: string[];
  agents: string[];
  rules: Record<string, ResolvedRuleConfig>;
  cloud?: CloudConfig;
}

/**
 * Serialize a ResolvedConfig to a JSON-compatible object.
 * Converts the rules Map to a plain object.
 */
export function serializeConfig(config: ResolvedConfig): SerializedConfig {
  const rules: Record<string, ResolvedRuleConfig> = {};
  for (const [id, ruleConfig] of config.rules) {
    rules[id] = ruleConfig;
  }
  return {
    presets: config.presets,
    agents: config.agents,
    rules,
    cloud: config.cloud,
  };
}

/**
 * Deserialize a JSON object back to a ResolvedConfig.
 */
export function deserializeConfig(serialized: SerializedConfig): ResolvedConfig {
  const rules = new Map<string, ResolvedRuleConfig>();
  for (const [id, ruleConfig] of Object.entries(serialized.rules)) {
    rules.set(id, ruleConfig);
  }
  return {
    presets: serialized.presets,
    agents: serialized.agents as ResolvedConfig['agents'],
    rules,
    cloud: serialized.cloud,
  };
}

/**
 * Pre-compile resolved config to JSON for fast hook loading.
 * Written to .vguard/cache/resolved-config.json
 */
export async function compileConfig(config: ResolvedConfig, projectRoot: string): Promise<string> {
  const outputPath = join(projectRoot, CACHE_PATH);
  const outputDir = dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  const serialized = serializeConfig(config);
  const json = JSON.stringify(serialized, null, 2);
  await writeFile(outputPath, json, 'utf-8');

  return outputPath;
}

/**
 * Load pre-compiled config from cache.
 * Returns null if cache doesn't exist or is invalid.
 */
export async function loadCompiledConfig(projectRoot: string): Promise<ResolvedConfig | null> {
  const cachePath = join(projectRoot, CACHE_PATH);
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(cachePath, 'utf-8');
    const serialized = JSON.parse(raw) as SerializedConfig;
    return deserializeConfig(serialized);
  } catch {
    return null;
  }
}
