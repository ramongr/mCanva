# mCanva — Wireframing Tool: Implementation Plan

## Stack & Versions

| Package                      | Version  | Role                              |
|------------------------------|----------|-----------------------------------|
| `vite`                       | 8.0.1    | Build tool / dev server           |
| `@vitejs/plugin-react`       | 6.0.1    | React fast-refresh                |
| `react` + `react-dom`        | 19.2.4   | UI framework                      |
| `typescript`                 | 5.9.3    | Type safety                       |
| `react-konva`                | 19.2.3   | React bindings for Konva          |
| `konva`                      | 10.2.3   | Canvas engine                     |
| `zustand`                    | 5.0.12   | Lightweight state management      |
| `tailwindcss`                | 4.2.2    | Utility-first styling             |
| `vitest`                     | 4.1.0    | Test runner (Vite-native)         |
| `@vitest/coverage-v8`        | 4.1.0    | Coverage reports                  |
| `@testing-library/react`     | 16.3.2   | Component testing                 |
| `@testing-library/user-event`| 14.6.1   | Realistic user interactions       |
| `@testing-library/jest-dom`  | 6.9.1    | Custom DOM matchers               |
| `jest-canvas-mock`           | 2.5.2    | Canvas API mock for tests         |
| `jsdom`                      | 29.0.1   | DOM environment for Vitest        |
| `@types/react`               | 19.2.14  | React TS types                    |
| `@types/react-dom`           | 19.2.3   | ReactDOM TS types                 |

---

## Project Structure

```
mCanva/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── vitest.setup.ts              # imports jest-canvas-mock + jest-dom matchers
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── index.css                # Tailwind v4 @import
│   ├── types/
│   │   └── shapes.ts            # WireframeElement union, ShapeType, BoundingBox
│   ├── store/
│   │   ├── canvasStore.ts       # Zustand store
│   │   └── canvasStore.test.ts  # Pure unit tests (no React mount needed)
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx
│   │   │   └── Canvas.test.tsx
│   │   ├── shapes/
│   │   │   ├── RectShape.tsx
│   │   │   ├── RectShape.test.tsx
│   │   │   ├── EllipseShape.tsx
│   │   │   ├── EllipseShape.test.tsx
│   │   │   ├── LineShape.tsx
│   │   │   └── LineShape.test.tsx
│   │   ├── ShapeRenderer/
│   │   │   ├── ShapeRenderer.tsx
│   │   │   └── ShapeRenderer.test.tsx
│   │   ├── SelectionTransformer/
│   │   │   ├── SelectionTransformer.tsx
│   │   │   └── SelectionTransformer.test.tsx
│   │   └── Toolbar/
│   │       ├── Toolbar.tsx
│   │       └── Toolbar.test.tsx
│   └── hooks/
│       ├── useCanvasEvents.ts
│       └── useCanvasEvents.test.ts
```

---

## Feature Scope (Initial Build)

1. **Basic shapes** — Rectangle, Ellipse, Line placeable on canvas
2. **Drag & drop** — All shapes draggable; position persisted to Zustand store
3. **Resize & rotate handles** — `Konva.Transformer` on selected shape; dimensions synced back to store

---

## Key Design Decisions

- **Zustand 5 store** holds `elements[]`, `selectedId`. All mutations are pure actions — easy to unit test without mounting React.
- **Shape components** (`RectShape`, `EllipseShape`, `LineShape`) are purely prop-driven — they accept `element` props and emit `onSelect` / `onChange` callbacks. No direct store access, fully isolated and testable.
- **`ShapeRenderer`** is a single dispatch component that maps `ShapeType → shape component`. Keeps `Canvas.tsx` clean and makes adding new shape types a one-liner.
- **`SelectionTransformer`** wraps `Konva.Transformer` and attaches to the selected node via a `nodeRef`. Separated so transformer logic doesn't pollute shape components.
- **`useCanvasEvents`** hook encapsulates stage-level pointer events (click-to-add, click-to-deselect) so `Canvas.tsx` stays declarative.
- **Tailwind 4** — uses the new `@import "tailwindcss"` CSS-first config (no JS config file needed for basic usage).
- **`jest-canvas-mock`** is imported in `vitest.setup.ts` to polyfill the Canvas API required by Konva in jsdom.

---

## Implementation Tasks

### Step 1 — Scaffold
- [x] `package.json` with all pinned dependencies
- [x] `index.html` entry point
- [x] `vite.config.ts` with `@vitejs/plugin-react`
- [x] `tsconfig.json` + `tsconfig.node.json`
- [x] `vitest.config.ts` with jsdom environment + setup file
- [x] `vitest.setup.ts` importing `jest-canvas-mock` and `@testing-library/jest-dom`
- [x] `src/main.tsx` and `src/index.css` (Tailwind v4)
- [x] **Validation:** `npm install` succeeds (160 packages, 0 vulnerabilities), `npm run typecheck` clean, `npm test` exits 0, `npm run build` succeeds (67ms)

### Step 2 — Types
- [x] `src/types/shapes.ts` — `ShapeType`, `BaseElement`, `RectElement`, `EllipseElement`, `LineElement`, `WireframeElement` union, `BoundingBox`, `ElementUpdate`
- [x] `src/lib/shapes.ts` — pure utility library: `generateId`, element factories (`createRectElement`, `createEllipseElement`, `createLineElement`, `createElement`), `getBoundingBox`, `isPointInBoundingBox`, type guards
- [x] `src/lib/shapes.test.ts` — 37 unit tests covering every exported function
- [x] Replaced `jest-canvas-mock` with `vitest-canvas-mock` (Vitest-native, no `jest` global conflict)
- [x] **Validation:** `npm run typecheck` clean, `npm test` — 37/37 passed

### Step 3 — Store
- [x] `src/lib/elementUtils.ts` — pure element mutation helpers (addElement, updateElement, removeElement, bringToFront, sendToBack, findElement) + tests
- [x] `src/store/canvasStore.ts` — Zustand store with all actions (delegates logic to elementUtils)
- [x] `src/store/canvasStore.test.ts` — unit tests for every action (no React mount needed)
- [x] **Validation:** `npm test` — 88/88 passed

### Step 4 — Shape Components
- [x] `src/types/konva.ts` — shared `KonvaPointerEvent` + `KonvaDragEvent` types
- [x] `src/components/shapes/RectShape.tsx` + `RectShape.test.tsx`
- [x] `src/components/shapes/EllipseShape.tsx` + `EllipseShape.test.tsx`
- [x] `src/components/shapes/LineShape.tsx` + `LineShape.test.tsx`
- [x] `src/test-utils/KonvaTestWrapper.tsx` — shared Stage+Layer wrapper for Konva component tests
- [x] **Validation:** `npm test` — 115/115 passed

### Step 5 — ShapeRenderer
- [x] `src/components/ShapeRenderer/ShapeRenderer.tsx` — maps `ShapeType` to shape component
- [x] `src/components/ShapeRenderer/ShapeRenderer.test.tsx`
- [x] **Validation:** `npm test` — 126/126 passed

### Step 6 — SelectionTransformer
- [x] `src/components/SelectionTransformer/SelectionTransformer.tsx` — wraps `Konva.Transformer`, absorbs scale into dims on transformend
- [x] `src/components/SelectionTransformer/SelectionTransformer.test.tsx`
- [x] **Validation:** `npm test` — 135/135 passed

### Step 7 — useCanvasEvents Hook
- [x] `src/lib/stageUtils.ts` — pure `getStageClickCoords` + `isStageClick` helpers + tests
- [x] `src/hooks/useCanvasEvents.ts` — stage click/pointer event handlers
- [x] `src/hooks/useCanvasEvents.test.ts`
- [x] **Validation:** `npm test` — 148/148 passed

### Step 8 — Canvas Component
- [x] `src/components/Canvas/Canvas.tsx` — Konva Stage + Layer + ShapeRenderer + SelectionTransformer; cursor managed imperatively via stageRef
- [x] `src/components/Canvas/Canvas.test.tsx` — includes stage isolation fix (destroy before cleanup; filter Transformer anchor nodes by id)
- [x] **Validation:** `npm test` — 159/159 passed

### Step 9 — Toolbar Component
- [x] `src/lib/toolConfig.ts` — reusable TOOLS config array + getToolConfig helper + tests
- [x] `src/components/Toolbar/Toolbar.tsx` — shape palette, aria-pressed, keyboard shortcut titles
- [x] `src/components/Toolbar/Toolbar.test.tsx`
- [x] **Validation:** `npm test` — 174/174 passed

### Step 10 — App Layout
- [x] `src/App.tsx` — wires Toolbar + Canvas; ResizeObserver tracks canvas container size
- [x] `src/App.test.tsx`
- [x] `vitest.setup.ts` — ResizeObserver polyfill added for jsdom
- [x] **Validation:** `npm test` — 182/182 passed

### Step 11 — Final Validation
- [x] `npm test:coverage` — 182/182 passed; 95.37% stmts, 91.48% branch, 97.7% funcs, 97.19% lines
- [x] `npm run build` — production build succeeds; 100 modules transformed in 180ms (504kB bundle, expected for Konva)
- [x] `npm run typecheck` — zero errors throughout
