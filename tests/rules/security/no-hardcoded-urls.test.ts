import { describe, it, expect } from 'vitest';
import { noHardcodedUrls } from '../../../src/rules/security/no-hardcoded-urls.js';
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
      file_path: '/project/src/api/client.ts',
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

describe('security/no-hardcoded-urls', () => {
  it('should pass for code using environment variables', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.ts',
        content: 'const response = await fetch(process.env.API_URL + "/users");',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn about hardcoded localhost', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.ts',
        content: 'const API_URL = "http://localhost:3000/api";',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('localhost');
  });

  it('should warn about hardcoded 127.0.0.1', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.ts',
        content: "const url = 'http://127.0.0.1:8080/api';",
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('localhost');
  });

  it('should warn about hardcoded URLs in fetch calls', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.ts',
        content: 'const res = await fetch("https://api.example.com/users");',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('Hardcoded URL');
  });

  it('should pass for test files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.test.ts',
        content: 'const res = await fetch("http://localhost:3000/api");',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-JS/TS files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/README.md',
        content: 'Visit http://localhost:3000',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for config files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/config.ts',
        content: 'const API_URL = "http://localhost:3000";',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/api/empty.ts', content: '' },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api/client.ts',
        content: 'const url = "http://localhost:3000";',
      },
    });
    const result = noHardcodedUrls.check(ctx);
    expect(result.fix).toBeDefined();
  });
});
