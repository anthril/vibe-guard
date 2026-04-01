import type {
  VibeCheckConfig,
  ResolvedConfig,
  ResolvedRuleConfig,
  RuleConfig,
  Preset,
} from '../types.js';
import { vibeCheckConfigSchema } from './schema.js';
import { DEFAULT_CONFIG } from './defaults.js';
import { discoverConfigFile, readRawConfig } from './discovery.js';

/**
 * Load and resolve the vibecheck config from a project root.
 * Returns null if no config file is found.
 */
export async function loadConfig(projectRoot: string): Promise<ResolvedConfig | null> {
  const discovered = discoverConfigFile(projectRoot);
  if (!discovered) return null;

  const raw = await readRawConfig(discovered);
  return resolveConfig(raw as VibeCheckConfig);
}

/**
 * Resolve a user config into a fully merged ResolvedConfig.
 * Merges: defaults → presets (in order) → user rules
 */
export function resolveConfig(
  userConfig: VibeCheckConfig,
  presetMap?: Map<string, Preset>,
): ResolvedConfig {
  // Validate config shape
  const parseResult = vibeCheckConfigSchema.safeParse(userConfig);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid vibecheck config:\n${errors.join('\n')}`);
  }

  const config = parseResult.data;
  const rules = new Map<string, ResolvedRuleConfig>();

  // 1. Apply presets in order (first declared = lowest priority)
  const presetNames = config.presets ?? DEFAULT_CONFIG.presets;
  for (const presetName of presetNames) {
    const preset = presetMap?.get(presetName);
    if (!preset) continue;

    for (const [ruleId, ruleConfig] of Object.entries(preset.rules)) {
      const resolved = normalizeRuleConfig(ruleConfig);
      rules.set(ruleId, resolved);
    }
  }

  // 2. Apply user rules (highest priority — overrides presets)
  const userRules = config.rules ?? DEFAULT_CONFIG.rules;
  for (const [ruleId, ruleConfig] of Object.entries(userRules)) {
    if (ruleConfig === false) {
      // Explicitly disabled
      rules.set(ruleId, { enabled: false, severity: 'info', options: {} });
      continue;
    }

    const existing = rules.get(ruleId);
    const resolved = normalizeRuleConfig(ruleConfig);

    if (existing) {
      // Merge: user options override preset options
      rules.set(ruleId, {
        enabled: resolved.enabled,
        severity: resolved.severity || existing.severity,
        options: { ...existing.options, ...resolved.options },
      });
    } else {
      rules.set(ruleId, resolved);
    }
  }

  return {
    presets: presetNames,
    agents: config.agents ?? DEFAULT_CONFIG.agents,
    rules,
  };
}

/**
 * Normalize a rule config (boolean or object) into a ResolvedRuleConfig.
 */
function normalizeRuleConfig(config: RuleConfig | boolean): ResolvedRuleConfig {
  if (typeof config === 'boolean') {
    return {
      enabled: config,
      severity: 'block',
      options: {},
    };
  }

  const { severity, ...options } = config;
  return {
    enabled: true,
    severity: severity ?? 'block',
    options,
  };
}
