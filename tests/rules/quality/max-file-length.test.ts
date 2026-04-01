import { describe, it, expect } from 'vitest';
import { maxFileLength } from '../../../src/rules/quality/max-file-length.js';
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
      file_path: '/project/src/index.ts',
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

function generateLines(count: number): string {
  return Array.from({ length: count }, (_, i) => `const line${i} = ${i};`).join('\n');
}

describe('quality/max-file-length', () => {
  it('should pass for short files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/index.ts',
        content: generateLines(100),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn when file exceeds 400 lines (default)', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/big-file.ts',
        content: generateLines(450),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('450');
    expect(result.message).toContain('400');
  });

  it('should respect custom maxLines config', () => {
    const config: ResolvedConfig = {
      presets: [],
      agents: ['claude-code'],
      rules: new Map([
        [
          'quality/max-file-length',
          { enabled: true, severity: 'warn', options: { maxLines: 200 } },
        ],
      ]),
    };

    const ctx = createContext({
      projectConfig: config,
      toolInput: {
        file_path: '/project/src/medium.ts',
        content: generateLines(250),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('200');
  });

  it('should pass for non-source files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/README.md',
        content: generateLines(500),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for generated files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/generated/schema.ts',
        content: generateLines(1000),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for minified files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/dist/bundle.min.js',
        content: generateLines(5000),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/empty.ts', content: '' },
    });
    const result = maxFileLength.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include metadata with line count', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/big.ts',
        content: generateLines(500),
      },
    });
    const result = maxFileLength.check(ctx);
    expect(result.metadata?.lineCount).toBe(500);
    expect(result.metadata?.maxLines).toBe(400);
  });
});
