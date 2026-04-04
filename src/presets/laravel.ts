import type { Preset } from '../types.js';

export const laravel: Preset = {
  id: 'laravel',
  name: 'Laravel',
  description: 'Laravel conventions: migration safety, naming patterns.',
  version: '1.0.0',
  rules: {
    'workflow/migration-safety': true,
    'security/xss-prevention': true,
    'security/sql-injection': true,
  },
};
