import type { Preset } from '../types.js';

/** Registry of built-in presets */
const presetRegistry = new Map<string, Preset>();

/** Register a built-in preset */
export function registerPreset(preset: Preset): void {
  presetRegistry.set(preset.id, preset);
}

/** Get a preset by ID */
export function getPreset(id: string): Preset | undefined {
  return presetRegistry.get(id);
}

/** Get all registered presets */
export function getAllPresets(): Map<string, Preset> {
  return new Map(presetRegistry);
}

/** Check if a preset exists */
export function hasPreset(id: string): boolean {
  return presetRegistry.has(id);
}
