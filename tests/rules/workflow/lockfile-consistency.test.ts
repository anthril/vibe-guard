import { describe, it, expect } from 'vitest';
import { lockfileConsistency } from '../../../src/rules/workflow/lockfile-consistency.js';
import type { HookContext, ResolvedConfig } from '../../../src/types.js';

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  const defaultConfig: ResolvedConfig = {
    presets: [],
    agents: ['claude-code'],
    rules: new Map(),
  };

  return {
    event: 'PreToolUse',
    tool: 'Write',
    toolInput: {
      file_path: '/project/package.json',
      content: '',
    },
    projectConfig: defaultConfig,
    gitContext: {
      branch: 'feat/test',
      isDirty: false,
      repoRoot: '/project',
      unpushedCount: 0,
      hasRemote: false,
    },
    ...overrides,
  };
}

describe('workflow/lockfile-consistency', () => {
  it('should warn when package.json has dependencies', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/package.json',
        content: JSON.stringify({
          name: 'test',
          dependencies: { react: '^18.0.0' },
        }),
      },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('lockfile');
  });

  it('should warn when package.json has devDependencies', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/package.json',
        content: JSON.stringify({
          name: 'test',
          devDependencies: { vitest: '^1.0.0' },
        }),
      },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
  });

  it('should pass for package.json without dependencies', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/package.json',
        content: JSON.stringify({
          name: 'test',
          version: '1.0.0',
          scripts: { test: 'vitest' },
        }),
      },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-package.json files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/tsconfig.json',
        content: '{ "dependencies": {} }',
      },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/package.json', content: '' },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/package.json',
        content: JSON.stringify({ dependencies: { lodash: '^4.0.0' } }),
      },
    });
    const result = lockfileConsistency.check(ctx);
    expect(result.fix).toBeDefined();
    expect(result.fix).toContain('npm install');
  });
});
