import { describe, it, expect } from 'vitest';
import { xssPrevention } from '../../../src/rules/security/xss-prevention.js';
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
      file_path: '/project/src/components/Content.tsx',
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

describe('security/xss-prevention', () => {
  it('should pass for safe JSX', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Content.tsx',
        content: 'return <div>{content}</div>;',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn about dangerouslySetInnerHTML', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Content.tsx',
        content: '<div dangerouslySetInnerHTML={{ __html: content }} />',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('dangerouslySetInnerHTML');
  });

  it('should warn about innerHTML assignment', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/dom.ts',
        content: 'element.innerHTML = userContent;',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('innerHTML');
  });

  it('should warn about document.write', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/legacy.js',
        content: 'document.write("<script>alert(1)</script>");',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('document.write');
  });

  it('should warn about v-html in Vue', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Content.vue',
        content: '<div v-html="rawHtml"></div>',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('v-html');
  });

  it('should pass for test files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Content.test.tsx',
        content: '<div dangerouslySetInnerHTML={{ __html: "<b>test</b>" }} />',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-supported file types', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/README.md',
        content: 'You can use dangerouslySetInnerHTML for raw HTML.',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/components/Empty.tsx', content: '' },
    });
    const result = xssPrevention.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/components/Content.tsx',
        content: '<div dangerouslySetInnerHTML={{ __html: html }} />',
      },
    });
    const result = xssPrevention.check(ctx);
    expect(result.fix).toBeDefined();
  });
});
