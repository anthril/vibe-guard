import type { VGuardConfig } from '../types.js';

/** Default configuration values */
export const DEFAULT_CONFIG: Required<
  Pick<VGuardConfig, 'presets' | 'agents' | 'rules' | 'plugins'>
> = {
  presets: [],
  agents: ['claude-code'],
  rules: {},
  plugins: [],
};

/** Default protected branches for security/branch-protection */
export const DEFAULT_PROTECTED_BRANCHES = ['main', 'master'];

/** File patterns to ignore during scanning */
export const DEFAULT_IGNORE_PATHS = [
  'node_modules/',
  '.next/',
  'dist/',
  'build/',
  '.git/',
  'coverage/',
  '__pycache__/',
  '.venv/',
  'vendor/',
];
