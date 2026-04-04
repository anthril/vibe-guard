import { describe, it, expect } from 'vitest';
import { a11yJsx } from '../../../src/rules/quality/a11y-jsx.js';
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
      file_path: '/project/src/components/Card.tsx',
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

describe('quality/a11y-jsx', () => {
  it('should pass for accessible JSX', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.tsx',
        content: '<img alt="User avatar" src="/avatar.png" />',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn about img without alt', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.tsx',
        content: '<img src="/avatar.png" />',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('<img>');
    expect(result.message).toContain('alt');
  });

  it('should warn about <a href="#">', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Nav.tsx',
        content: '<a href="#">Click me</a>',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('href="#"');
  });

  it('should warn about onClick on div without role', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.tsx',
        content: '<div onClick={handleClick}>Click me</div>',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('onClick');
  });

  it('should pass for onClick on div with role', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.tsx',
        content: '<div role="button" tabIndex={0} onClick={handleClick}>Click me</div>',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-JSX files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/parser.ts',
        content: '<img src="/avatar.png" />',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for test files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.test.tsx',
        content: '<img src="/avatar.png" />',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/components/Empty.tsx', content: '' },
    });
    const result = a11yJsx.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Card.tsx',
        content: '<img src="/photo.jpg" />',
      },
    });
    const result = a11yJsx.check(ctx);
    expect(result.fix).toBeDefined();
  });
});
