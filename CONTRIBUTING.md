# Contributing to VibeCheck

## Development Setup

```bash
git clone <repo-url>
cd vibecheck
npm install
npm run build
npm test
```

## Project Structure

```
src/
  types.ts           # Core interfaces (Rule, HookContext, etc.)
  config/            # Configuration loading and validation
  engine/            # Rule execution engine
  rules/
    security/        # Security rules (branch-protection, etc.)
    quality/         # Quality rules (import-aliases, etc.)
  presets/           # Tech stack presets
  adapters/          # Agent-specific adapters
  utils/             # Shared utilities
  cli/               # CLI commands
```

## Adding a New Rule

1. Create the rule file in `src/rules/{category}/{rule-name}.ts`
2. Implement the `Rule` interface
3. Register it in `src/rules/{category}/index.ts` and `src/rules/index.ts`
4. Write tests in `tests/rules/{category}/{rule-name}.test.ts`
5. Submit a PR with conventional commit: `feat(rules): add {category}/{rule-name}`

## Code Style

- TypeScript strict mode (no `any`)
- ESLint + Prettier (auto-formatted)
- Conventional commits (enforced by commitlint)

## Running Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```
