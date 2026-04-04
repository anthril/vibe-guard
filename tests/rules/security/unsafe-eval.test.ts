import { describe, it, expect } from 'vitest';
import { unsafeEval } from '../../../src/rules/security/unsafe-eval.js';
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
      file_path: '/project/src/utils/parser.ts',
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

describe('security/unsafe-eval', () => {
  it('should pass for normal code', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/parser.ts',
        content: 'const data = JSON.parse(input);\nsetTimeout(() => doStuff(), 1000);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should block eval()', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/parser.ts',
        content: 'const result = eval(userInput);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'block');
    expect(result.message).toContain('eval()');
  });

  it('should block new Function()', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/dynamic.ts',
        content: 'const fn = new Function("return " + code);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'block');
    expect(result.message).toContain('new Function()');
  });

  it('should block setTimeout with string argument', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/timer.ts',
        content: 'setTimeout("doSomething()", 1000);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'block');
    expect(result.message).toContain('setTimeout');
  });

  it('should pass for setTimeout with function argument', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/timer.ts',
        content: 'setTimeout(() => doSomething(), 1000);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-JS/TS files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/README.md',
        content: 'You can use eval() for testing.',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for .d.ts files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/types.d.ts',
        content: 'declare function eval(x: string): any;',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should skip comments containing eval', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/safe.ts',
        content: '// Do not use eval() here\nconst x = 1;',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/utils/empty.ts', content: '' },
    });
    const result = unsafeEval.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/parser.ts',
        content: 'eval(code);',
      },
    });
    const result = unsafeEval.check(ctx);
    expect(result.fix).toBeDefined();
  });
});
