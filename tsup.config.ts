import { defineConfig } from 'tsup';

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
  },
]);
