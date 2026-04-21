import { describe, it, expect } from 'vitest';
import { noUnhandledPromises } from '../../../src/rules/reliability/no-unhandled-promises.js';
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
      file_path: '/project/src/utils/api.ts',
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

describe('reliability/no-unhandled-promises', () => {
  it('should pass when no .then() is used', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `async function fetchData() {\n  const res = await fetch('/api/data');\n  return res.json();\n}`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when .then() has .catch()', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/api/data').then(res => res.json()).catch(err => console.error(err));`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should warn when .then() has no .catch()', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/api/data').then(res => res.json());`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.message).toContain('.then()');
  });

  it('should detect multiple unhandled chains', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/a').then(r => r.json());\nfetch('/b').then(r => r.json());`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.metadata?.violations).toBe(2);
  });

  it('should accept .catch() on the next line', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/api/data')\n  .then(res => res.json())\n  .catch(err => console.error(err));`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for non-JS/TS files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/styles/globals.css',
        content: 'body { margin: 0; }',
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass for test files', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/tests/api.test.ts',
        content: `fetch('/api').then(r => r.json());`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should pass when content is empty', () => {
    const ctx = createContext({
      toolInput: { file_path: '/project/src/empty.ts', content: '' },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should ignore .then() in comments', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `// fetch('/api').then(r => r.json());\nconst x = 5;`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('should include fix suggestion', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/api/data').then(res => res.json());`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result.fix).toContain('.catch()');
  });

  // Regression: issue #33 — multi-line .then body should not be flagged
  // as unhandled when a trailing .catch exists further down the chain.
  it('accepts .catch() past the old 3-line lookahead window', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/db.ts',
        content: `dbOpenPromise
  .then((db) => {
    if (!isResolved) {
      clearTimeout(timeoutId);
      isResolved = true;
      dbInstance = db;
      dbOpenPromise = null;
      resolve(db);
    }
  })
  .catch((error) => {
    reject(error);
  });`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('accepts the two-argument .then(onFulfilled, onRejected) form', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: `fetch('/api/data').then(
  (res) => res.json(),
  (err) => console.error(err),
);`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('ignores .then( inside a template literal', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/utils/api.ts',
        content: "const doc = `fetch('/api').then(r => r.json())`;\nconsole.log(doc);",
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });

  it('still flags a truly unhandled chain with a long .then body', () => {
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/db.ts',
        content: `dbOpenPromise.then((db) => {
  if (!isResolved) {
    clearTimeout(timeoutId);
    isResolved = true;
    dbInstance = db;
    dbOpenPromise = null;
    resolve(db);
  }
});`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'warn');
    expect(result.metadata?.violations).toBe(1);
  });

  it('accepts nested .then chains where only the outer has a .catch', () => {
    // Both `.then` calls are part of the same chain — one `.catch` at
    // the bottom should cover them.
    const ctx = createContext({
      toolInput: {
        file_path: '/project/src/api.ts',
        content: `fetch('/a')
  .then((r) => r.json())
  .then((data) => process(data))
  .catch((err) => log(err));`,
      },
    });
    const result = noUnhandledPromises.check(ctx);
    expect(result).toHaveProperty('status', 'pass');
  });
});
