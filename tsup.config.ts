import { defineConfig } from 'tsup';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

function resolveGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const define = {
  __VGUARD_VERSION__: JSON.stringify(pkg.version),
  __VGUARD_GIT_SHA__: JSON.stringify(resolveGitSha()),
  __VGUARD_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
};

export default defineConfig([
  // Library and hook runner — no shebang
  {
    entry: {
      index: 'src/index.ts',
      'hooks/runner': 'src/engine/hook-entry.ts',
    },
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    splitting: false,
    sourcemap: true,
    target: 'node20',
    shims: true,
    define,
  },
  // CLI — CJS with shebang for bin entrypoint, ESM without shebang
  {
    entry: {
      cli: 'src/cli/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: false,
    clean: false, // Don't clean dist/ again
    splitting: false,
    sourcemap: true,
    target: 'node20',
    shims: true,
    define,
  },
]);
