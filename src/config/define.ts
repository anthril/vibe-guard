import type { VibeCheckConfig } from '../types.js';

/**
 * Typed helper for vibecheck.config.ts files.
 * Provides IDE autocomplete and type checking.
 *
 * @example
 * ```typescript
 * // vibecheck.config.ts
 * import { defineConfig } from 'vibecheck';
 *
 * export default defineConfig({
 *   presets: ['nextjs-15', 'tailwind'],
 *   agents: ['claude-code'],
 * });
 * ```
 */
export function defineConfig(config: VibeCheckConfig): VibeCheckConfig {
  return config;
}
