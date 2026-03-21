---
name: code-quality
description: Run and fix linting, type checking, and tests for this project
license: MIT
compatibility: opencode
---

## What I do

- Run `npm run lint` (oxlint) and fix all warnings and errors
- Run `npm run typecheck` (tsc --noEmit) and fix all type errors
- Run `npm run test` (vitest) and fix any failing tests
- Ensure all three pass with zero issues before finishing

## Stack

- **Linter**: oxlint via `npm run lint`, config in `.oxlintrc.json`
  - Plugins: `react`, `react-perf`, `typescript`, `import`, `jsx-a11y`, `vitest`
  - Test file overrides in `.oxlintrc.json` under `overrides`
- **Type checker**: TypeScript 5.9 strict mode via `npm run typecheck`
  - Path alias `@/` resolves to `src/`
  - Config split: `tsconfig.json` (src), `tsconfig.node.json` (vite/vitest configs)
- **Tests**: Vitest 4 + Testing Library via `npm run test`
  - jsdom environment, canvas mocked via `vitest-canvas-mock`
  - Setup file: `vitest.setup.ts`

## Workflow

1. Run all three checks in parallel to get a full picture of the issues
2. Fix issues in this order: type errors → lint warnings → test failures
3. Re-run the relevant check after each fix to confirm it's resolved
4. Do a final run of all three before declaring done

## Key rules

- Never suppress a lint warning with an inline disable comment unless there is a documented reason why the rule does not apply
- Never use `as any` or `// @ts-ignore` to silence type errors — fix the type properly
- Do not change test assertions to make tests pass; fix the implementation instead
- `vitest/no-focused-tests` is an error — never commit `.only` tests
