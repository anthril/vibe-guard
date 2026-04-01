import { describe, it, expect } from 'vitest';
import { branchProtection } from '../../../src/rules/security/branch-protection.js';
import type { HookContext, ResolvedConfig } from '../../../src/types.js';

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  const defaultConfig: ResolvedConfig = {
    presets: [],
    agents: ['claude-code'],
    rules: new Map(),
  };

  return {
    event: 'PreToolUse',
    tool: 'Edit',
    toolInput: { file_path: '/project/src/index.ts' },
    projectConfig: defaultConfig,
    gitContext: {
      branch: 'feat/my-feature',
      isDirty: false,
      repoRoot: '/project',
      unpushedCount: 0,
      hasRemote: false,
    },
    ...overrides,
  };
}

describe('security/branch-protection', () => {
  it('should pass when on a feature branch', () => {
    const ctx = createContext();
    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should block when on main branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'main',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'block');
    expect(result.message).toContain('main');
  });

  it('should block when on master branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'master',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'block');
  });

  it('should be case-insensitive for branch names', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'Main',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'block');
  });

  it('should pass when not in a git repo', () => {
    const ctx = createContext({
      gitContext: {
        branch: null,
        isDirty: false,
        repoRoot: null,
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should respect custom protected branches config', () => {
    const config: ResolvedConfig = {
      presets: [],
      agents: ['claude-code'],
      rules: new Map([
        [
          'security/branch-protection',
          {
            enabled: true,
            severity: 'block',
            options: { protectedBranches: ['main', 'staging', 'production'] },
          },
        ],
      ]),
    };

    const ctx = createContext({
      projectConfig: config,
      gitContext: {
        branch: 'staging',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });

    const result = branchProtection.check(ctx);
    expect(result).toHaveProperty('status', 'block');
    expect(result.message).toContain('staging');
  });

  it('should include a fix suggestion', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'main',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchProtection.check(ctx);
    expect(result.fix).toContain('git checkout -b');
  });
});
