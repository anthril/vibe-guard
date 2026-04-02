# VGuard — Project Instructions

## What is VGuard?

VGuard (VibeGuard) is a runtime-enforced AI coding guardrails framework. It generates hook scripts for AI agents (Claude Code, Cursor, Codex, OpenCode) that enforce security, quality, and workflow rules during AI coding sessions.

## Architecture

```
Layer 5: ANALYTICS (reports, drift detection)
Layer 4: LEARNING (convention extraction from codebases)
Layer 3: WORKFLOW (git flow, PR templates, commit conventions)
Layer 2: QUALITY (imports, naming, anti-patterns, file structure)
Layer 1: SECURITY (branch protection, secrets, destructive commands)
Layer 0: CORE ENGINE (hook runner, config parser, rule resolver)
```

## Key Directories

- `src/engine/` — Core hook execution: runner, resolver, context, scanner, tracker, edit-rule-factory
- `src/rules/{security,quality,workflow}/` — Built-in rules. Each rule exports a `Rule` object
- `src/config/` — Config loading, Zod validation, preset merging, pre-compilation
- `src/adapters/` — Output generators per agent (claude-code, cursor, codex, opencode, github-actions)
- `src/learn/` — Convention learning engine (analyzers, promoter, walker)
- `src/cli/commands/` — CLI commands (init, add, remove, generate, doctor, lint, learn, report, eject, upgrade)
- `src/presets/` — Ecosystem presets (nextjs-15, typescript-strict, react-19, tailwind, supabase, django, fastapi, laravel)
- `src/plugins/` — Plugin loader and validator
- `tests/` — Vitest tests mirroring src/ structure

## Development Commands

```bash
npm run build        # Build with tsup (dual ESM/CJS)
npm run dev          # Watch mode build
npm test             # Run tests
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint
npm run type-check   # TypeScript strict type checking
npm run format       # Prettier
```

## Conventions

- **TypeScript strict mode** — no `any`, no unused vars (leading `_` allowed)
- **Dual ESM/CJS output** — import paths use `.js` extension (e.g., `from './types.js'`)
- **Rule pattern**: export a `Rule` object with `id`, `name`, `description`, `severity`, `events`, `match`, `check()`
- **Fail-open philosophy** — every `try/catch` exits 0. Internal errors never block developer work
- **Edit rule factory** — `createEditVariant()` auto-generates Edit variants that only flag *newly introduced* issues
- **Conventional commits** enforced by commitlint: `feat(scope): message`
- **Test files** mirror source structure: `src/rules/security/foo.ts` → `tests/rules/security/foo.test.ts`
- **Prettier**: semicolons, single quotes, trailing commas, 100 char width

## Critical Design Decisions

1. **Hook scripts are pre-compiled** to `.vguard/cache/resolved-config.json` for fast execution (<100ms target)
2. **Tracker** (`.vguard/data/rule-hits.jsonl`) is append-only JSONL with 10MB auto-rotation — this is the data layer Cloud will consume
3. **Config resolution**: defaults → presets → user rules. Severity can only be *downgraded*, never upgraded by presets
4. **Claude Code adapter** generates hooks and merges into `.claude/settings.json` — it does NOT overwrite existing settings

## Adding a New Rule

1. Create `src/rules/{category}/{rule-name}.ts` exporting a `Rule` object
2. Register in `src/rules/{category}/index.ts`
3. Create `tests/rules/{category}/{rule-name}.test.ts`
4. Add to relevant presets in `src/presets/`
