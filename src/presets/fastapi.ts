import type { Preset } from '../types.js';

export const fastapi: Preset = {
  id: 'fastapi',
  name: 'FastAPI',
  description: 'FastAPI conventions: snake_case files, migration safety.',
  version: '1.0.0',
  rules: {
    'workflow/migration-safety': true,
    'security/sql-injection': true,
  },
};
