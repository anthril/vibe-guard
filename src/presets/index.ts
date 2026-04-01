import { registerPreset } from '../config/presets.js';
import { nextjs15 } from './nextjs-15.js';
import { typescriptStrict } from './typescript-strict.js';

/** All built-in presets */
export const allBuiltinPresets = [nextjs15, typescriptStrict];

/** Register all built-in presets */
export function registerBuiltinPresets(): void {
  for (const preset of allBuiltinPresets) {
    registerPreset(preset);
  }
}

// Auto-register on import
registerBuiltinPresets();

export { nextjs15, typescriptStrict };
