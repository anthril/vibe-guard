import type { Preset } from '../types.js';

/**
 * TypeScript Strict preset.
 *
 * Enforces:
 * - Import aliases instead of deep relative imports
 */
export const typescriptStrict: Preset = {
  id: 'typescript-strict',
  name: 'TypeScript Strict',
  description: 'Strict TypeScript patterns: import aliases, no deep relative imports.',
  version: '1.0.0',
  rules: {
    'quality/import-aliases': {
      aliases: ['@/', '~/'],
    },
  },
};
