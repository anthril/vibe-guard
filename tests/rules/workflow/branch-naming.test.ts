import { describe, it, expect } from 'vitest';
import { branchNaming } from '../../../src/rules/workflow/branch-naming.js';
import type { HookContext, ResolvedConfig } from '../../../src/types.js';

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  const defaultConfig: ResolvedConfig = {
    presets: [],
    agents: ['claude-code'],
    rules: new Map(),
  };

  return {
    event: 'Stop',
    tool: '',
    toolInput: {},
    projectConfig: defaultConfig,
    gitContext: {
      branch: 'feat/new-feature',
      isDirty: false,
      repoRoot: '/project',
      unpushedCount: 0,
      hasRemote: false,
    },
    ...overrides,
  };
}

describe('workflow/branch-naming', () => {
  it('should pass for feature/ branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'feature/add-login',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for fix/ branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'fix/login-bug',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for chore/ branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'chore/update-deps',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn for non-conventional branch name', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'my-random-branch',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('my-random-branch');
  });

  it('should skip main branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'main',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should skip dev branch', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'dev',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when no repo', () => {
    const ctx = createContext({
      gitContext: {
        branch: null,
        isDirty: false,
        repoRoot: null,
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      gitContext: {
        branch: 'bad-name',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    expect(result.fix).toBeDefined();
    expect(result.fix).toContain('git branch -m');
  });

  it('should fail-open on invalid regex pattern in config', () => {
    const rules = new Map();
    rules.set('workflow/branch-naming', {
      enabled: true,
      severity: 'warn' as const,
      options: { pattern: '[invalid(regex' },
    });

    const ctx = createContext({
      projectConfig: { presets: [], agents: ['claude-code'], rules },
      gitContext: {
        branch: 'my-branch',
        isDirty: false,
        repoRoot: '/project',
        unpushedCount: 0,
        hasRemote: false,
      },
    });
    const result = branchNaming.check(ctx);
    // Should return pass (fail-open) instead of throwing
    expect(result).toHaveProperty('status', 'pass');
  });
});
