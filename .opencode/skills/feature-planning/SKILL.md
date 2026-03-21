---
name: feature-planning
description: Describes how to create and structure feature planning documents: file format, step breakdown, validation gates, and architecture decision conventions.
---

## What I do

I guide the process of creating a well-structured feature plan document — from discovery through writing — ensuring the plan is grounded in the actual codebase state and follows consistent conventions.

## When to use me

Use this skill whenever you are asked to plan a new feature set, a new phase of work, or a significant addition to the codebase before implementation begins.

---

## 1. Discover before planning

Before writing anything:

1. **Read all existing plan files** in `.opencode/plans/` to understand what has already been planned and what conventions are established
2. **Explore the codebase** to verify what is actually implemented — never trust the plan alone. Check the relevant source files, types, store, components, and hooks directly
3. **Ask the user clarifying questions** before writing the plan — scope, UI placement for new visual components, interaction model choices where alternatives exist, and configurable defaults. Always offer concrete options rather than open-ended questions

---

## 2. Plan file format

**Location:** `.opencode/plans/<descriptive-name>.md`

**Naming:** kebab-case slug that describes the feature set (e.g. `colors-text-arrows.md`, `auth-flow.md`, `keyboard-multiselect-grid.md`). No required prefix or numbering — name it after what it does, not when it was written.

**Sections (in order):**

### 2.1 Title
```
# <Project Name> — <Short Feature Summary>
```

### 2.2 Overview
A short paragraph followed by a numbered list of features, one sentence each. Include a note that every step ends with a full test suite run before the next step begins.

### 2.3 Architecture Decisions
One `###` subsection per feature. Explains the *why* before the *how* — data model changes, component boundaries, state ownership decisions. References existing code by file path (e.g. `src/store/canvasStore.ts`) where relevant.

### 2.4 Files Changed / Created
A markdown table with two columns: `File` and `Status`. Status is either `Modified` or `**New**`. Test files are listed alongside their source files. Every file that will be touched must appear here.

### 2.5 Implementation Tasks
See section 3 below.

### 2.6 Final Sign-Off
A checkbox list at the end of the document:
```
- [ ] `npm test` — all tests pass (target: ≥ 95% statement coverage)
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — production build succeeds
```

---

## 3. Implementation task structure

- Features are grouped and separated by `---` horizontal rules
- Each feature contains numbered steps: `### Step N.M — Short Title`
- Each step is a checkbox list of concrete, actionable sub-tasks
- **Every step ends with a Validation bullet** listing the exact commands to run:
  ```
  - [ ] **Validation:** `npm test` — all tests pass
  ```
- **Full-feature validation steps** (one per feature, at the end of each feature group) run all three checks plus a manual smoke test:
  ```
  - [ ] `npm test` — all tests pass
  - [ ] `npm run typecheck` — zero errors
  - [ ] `npm run build` — succeeds
  - [ ] Manual smoke test: <list of concrete things to verify in the browser>
  ```
- Steps are sized small enough to be validated independently — no step bundles unrelated concerns

---

## 4. General conventions

- Architecture decisions explain *why*, not just *what* — justify choices in terms of the existing patterns in the codebase
- The files table is always complete — if a file is touched, it appears in the table
- Tests are never optional — every new file gets a corresponding test file; every modified file gets updated tests
- The coverage target is ≥ 95% statement coverage, enforced in the final sign-off
- Validation commands are always listed verbatim (backtick-quoted) so they can be run without ambiguity
