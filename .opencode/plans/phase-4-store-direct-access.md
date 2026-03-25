# mCanva — Phase 4: Store Direct-Access Refactor

## Overview

Three targeted cleanups to eliminate duplicate store subscriptions and a hot-path re-render issue. No new abstractions, no Context — just moving store subscriptions to the components that naturally own them.

Each step ends with a full test suite run before the next step begins.

1. **Toolbar reads the store directly** — removes `activeTool`/`onToolSelect` props, eliminates App's subscription to those slices
2. **LayersPanel reads the store directly** — removes all 7 props, eliminates App's 9 LayersPanel-related store subscriptions; App becomes a pure layout shell
3. **FloatingToolbar memoization** — wraps `FloatingToolbar` in `React.memo` and extracts a stable style-fields selector in Canvas, stopping 60fps re-renders during shape drag

---

## Architecture Decisions

### Feature 1 — Toolbar

The `Toolbar` comment in `Toolbar.tsx` says *"Purely prop-driven: receives activeTool and onToolSelect callback. No store access — wired up in App.tsx."* This was an explicit design choice, but it forces App to subscribe to `activeTool` purely to pass it two levels down. Since `activeTool` is already subscribed in `Canvas.tsx` independently, removing it from App eliminates a duplicate subscription with no downside.

The `ToolbarProps` interface will be removed entirely. `Toolbar.test.tsx` will be rewritten to use `useCanvasStore.setState` for setup and store state assertions for outcomes — the same pattern used in `Canvas.test.tsx` and `App.test.tsx`.

### Feature 2 — LayersPanel

`LayersPanel` was designed prop-driven for testability (same rationale as Toolbar). In practice it receives 7 props from App, all of which are direct store passthrough with no transformation except `handleLayerSelect` (which composes `selectElements` and `toggleElementSelection`). Moving store access into `LayersPanel` eliminates 9 store subscriptions from `App.tsx` and reduces `<LayersPanel>` in App's JSX to a zero-prop self-contained component.

`App.tsx` after both steps retains only: `useKeyboardShortcuts`, the `ResizeObserver` local state, and the layout JSX.

`LayersPanel.test.tsx` will be rewritten: seed the store with `useCanvasStore.setState`, render `<LayersPanel />` with no props, assert on store state after interactions.

### Feature 3 — FloatingToolbar memoization

`FloatingToolbar` receives the full `element` object (which includes `x`, `y`, `rotation`, etc.) but only renders `fill`, `stroke`, `strokeWidth`, `type`, and `cornerRadius`. During a shape drag, `liveUpdateArrowConnections` replaces the `elements` array in the store on every pointer-move event (potentially 60fps). This causes Canvas to re-render, which recomputes `selectedElement`, which passes a new object reference to `FloatingToolbar` — triggering a re-render even though none of the style fields changed.

Fix: extract only the rendered fields into a stable object in Canvas (`useMemo` keyed on those 5 fields), and wrap `FloatingToolbar` in `React.memo`. The toolbar will then only re-render when the user actually changes a style property via the toolbar inputs.

`FloatingToolbar.tsx` changes: add `React.memo` wrapper. `Canvas.tsx` changes: replace `element={selectedElement}` with `element={toolbarElement}` where `toolbarElement` is a `useMemo`-derived object containing only the 5 style fields.

---

## Files Changed

| File | Status |
|---|---|
| `src/components/Toolbar/Toolbar.tsx` | Modified |
| `src/components/Toolbar/Toolbar.test.tsx` | Modified |
| `src/components/LayersPanel/LayersPanel.tsx` | Modified |
| `src/components/LayersPanel/LayersPanel.test.tsx` | Modified |
| `src/components/FloatingToolbar/FloatingToolbar.tsx` | Modified |
| `src/components/Canvas/Canvas.tsx` | Modified |
| `src/App.tsx` | Modified |
| `src/App.test.tsx` | Modified |

---

## Implementation Tasks

### Step 1.1 — Toolbar: remove props, add store access

- [ ] In `src/components/Toolbar/Toolbar.tsx`:
  - Remove `ToolbarProps` interface and the `activeTool`/`onToolSelect` props
  - Add `import { useCanvasStore } from '@/store/canvasStore'`
  - Subscribe to `activeTool` and `setActiveTool` directly inside the component
  - Update `handleClick` to call `setActiveTool(activeTool === type ? null : type)`
  - Remove the `/**` jsdoc comment that says "Purely prop-driven"
- [ ] **Validation:** `npm run typecheck` — zero errors

### Step 1.2 — App.tsx: remove Toolbar wiring

- [ ] In `src/App.tsx`:
  - Remove `const setActiveTool = useCanvasStore(...)` and `const activeTool = useCanvasStore(...)`
  - Remove `import { useCanvasStore } from '@/store/canvasStore'` if no other subscriptions remain after this step (they still remain for LayersPanel — leave import for now)
  - Remove the `activeTool` and `onToolSelect` props from `<Toolbar>`
- [ ] **Validation:** `npm run typecheck` — zero errors

### Step 1.3 — Toolbar.test.tsx: rewrite for store-based testing

- [ ] Rewrite `src/components/Toolbar/Toolbar.test.tsx`:
  - Remove `setup()` helper that passes `activeTool` and `onToolSelect` as props
  - Add `beforeEach` that resets the store: `useCanvasStore.setState({ activeTool: null })`
  - Rendering: `render(<Toolbar />)` with no props
  - **Retained tests** (keep all existing behaviour coverage):
    - Renders a button for every tool
    - Renders the toolbar landmark with accessible label
    - `aria-pressed=false` for all tools when `activeTool` is null
    - `aria-pressed=true` for the active tool (seed store with `activeTool: 'rect'`)
    - Clicking a tool button sets `activeTool` in the store (assert via `useCanvasStore.getState()`)
    - Clicking the active tool button sets `activeTool` to null
    - Shows keyboard shortcut in button title
- [ ] In `src/App.test.tsx`:
  - Remove the tests that verify toolbar interaction (they are now covered in `Toolbar.test.tsx`):
    - `'activates the rect tool when the Rectangle button is clicked'`
    - `'activates the ellipse tool when the Ellipse button is clicked'`
    - `'activates the line tool when the Line button is clicked'`
    - `'activates the arrow tool when the Arrow button is clicked'`
    - `'deactivates the tool when the active tool button is clicked again'`
    - `'reflects aria-pressed state on the active toolbar button'`
  - Keep: `'renders the toolbar'`, `'renders all four tool buttons including arrow'`, `'renders the canvas main area'`, `'renders the layers panel'`
- [ ] **Validation:** `npm test` — all tests pass

---

### Step 2.1 — LayersPanel: remove props, add store access

- [ ] In `src/components/LayersPanel/LayersPanel.tsx`:
  - Remove `LayersPanelProps` interface entirely
  - Remove all props from the function signature
  - Add `import { useCanvasStore } from '@/store/canvasStore'`
  - Subscribe inside the component:
    ```ts
    const elements = useCanvasStore((s) => s.elements)
    const selectedIds = useCanvasStore((s) => s.selectedIds)
    const updateElement = useCanvasStore((s) => s.updateElement)
    const moveElementTo = useCanvasStore((s) => s.moveElementTo)
    const bringToFront = useCanvasStore((s) => s.bringToFront)
    const sendToBack = useCanvasStore((s) => s.sendToBack)
    const selectElements = useCanvasStore((s) => s.selectElements)
    const toggleElementSelection = useCanvasStore((s) => s.toggleElementSelection)
    ```
  - Move `handleSelect` logic inline:
    ```ts
    const handleSelect = useCallback((id: string, shiftKey: boolean) => {
      if (shiftKey) toggleElementSelection(id)
      else selectElements(new Set([id]))
    }, [selectElements, toggleElementSelection])
    ```
  - Replace all `onSelect`, `onUpdate`, `onMoveElementTo`, `onBringToFront`, `onSendToBack` references with the store actions directly (remove the `_` prefix from `_onMoveElementTo` too)
- [ ] **Validation:** `npm run typecheck` — zero errors

### Step 2.2 — App.tsx: remove LayersPanel wiring

- [ ] In `src/App.tsx`:
  - Remove all LayersPanel-related store subscriptions (lines 11–18): `elements`, `selectedIds`, `selectElements`, `toggleElementSelection`, `updateElement`, `moveElementTo`, `bringToFront`, `sendToBack`
  - Remove the `handleLayerSelect` `useCallback` and its import of `useCallback`
  - Remove all props from `<LayersPanel />` (render as `<LayersPanel />`)
  - Remove `import { useCanvasStore }` entirely (App no longer reads the store)
  - Verify `useKeyboardShortcuts` import is still present (it does not use the store via App)
- [ ] **Validation:** `npm run typecheck` — zero errors

### Step 2.3 — LayersPanel.test.tsx: rewrite for store-based testing

- [ ] Rewrite `src/components/LayersPanel/LayersPanel.test.tsx`:
  - Remove the `defaultProps` helper and all prop-passing setup
  - Add `beforeEach` that resets the store to a known state with `useCanvasStore.setState`
  - Rendering: `render(<LayersPanel />)` with no props
  - Seed data pattern:
    ```ts
    useCanvasStore.setState({ elements: makeElements(), selectedIds: new Set() })
    ```
  - **Retained tests** (all 29 existing tests must still pass, just adapted to store-seeding):
    - All rendering tests (count badge, rows, reverse order, label/fallback, type badges, selection highlight)
    - All visibility toggle tests
    - All lock toggle tests
    - All row selection tests (plain click + shift click)
    - All bring-to-front / send-to-back tests
    - All inline label editing tests
  - For interaction tests that call callbacks (e.g. `onBringToFront`), assert on `useCanvasStore.getState().elements` order instead
  - For `onUpdate` tests (visible/locked/label), assert on the updated element in `useCanvasStore.getState().elements`
  - For `onSelect` tests, assert on `useCanvasStore.getState().selectedIds`
- [ ] **Validation:** `npm test` — all tests pass

---

### Step 3.1 — FloatingToolbar: React.memo + stable selector in Canvas

- [ ] In `src/components/FloatingToolbar/FloatingToolbar.tsx`:
  - Wrap the export in `React.memo`:
    ```ts
    export const FloatingToolbar = React.memo(function FloatingToolbar(...) { ... })
    ```
  - Add `import React from 'react'` if not already present (check if `React` is in scope)
- [ ] In `src/components/Canvas/Canvas.tsx`:
  - After the `selectedElement` derivation, add a `useMemo` that extracts only the fields `FloatingToolbar` renders:
    ```ts
    const toolbarElement = useMemo(() => {
      if (!selectedElement) return null
      return {
        id: selectedElement.id,
        type: selectedElement.type,
        fill: selectedElement.fill,
        stroke: selectedElement.stroke,
        strokeWidth: selectedElement.strokeWidth,
        cornerRadius: (selectedElement as RectElement).cornerRadius,
      }
    }, [
      selectedElement?.id,
      selectedElement?.type,
      selectedElement?.fill,
      selectedElement?.stroke,
      selectedElement?.strokeWidth,
      (selectedElement as RectElement | null)?.cornerRadius,
    ])
    ```
  - Pass `element={toolbarElement}` to `<FloatingToolbar>` instead of `element={selectedElement}`
  - Update the `FloatingToolbar` condition: `{toolbarElement && toolbarPosition && ...}`
  - Import `RectElement` in Canvas if not already imported
- [ ] **Validation:** `npm run typecheck` — zero errors

### Step 3.2 — Full Feature 3 Validation

- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds
- [ ] Manual smoke test:
  - Select a shape → FloatingToolbar appears
  - Drag the shape around — toolbar stays visible and does not flicker
  - Change fill colour in toolbar — colour updates on canvas immediately
  - Select an arrow — toolbar appears (arrows have fill/stroke)
  - Deselect → toolbar disappears

---

## Final Sign-Off

- [ ] `npm test` — all tests pass (target: ≥ 95% statement coverage)
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — production build succeeds
