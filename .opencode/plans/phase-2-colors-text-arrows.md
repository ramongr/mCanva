# mCanva — Phase 2: Colors, Text Labels & Smart Connectors

## Overview

Phase 2 adds three features on top of the Phase 1 wireframing foundation:

1. **Shape Colors** — fill color, border color, and stroke width editable via a floating toolbar
2. **Text Labels** — optional labels inside shapes, editable by double-clicking
3. **Smart Connectors** — arrow elements that snap to shape anchor points and re-route when shapes move

Every step ends with a full test suite run before the next step begins.

---

## Architecture Decisions

### Feature 1: Shape Colors
- `fill` and `stroke` already exist on `BaseElement` — no type changes needed
- Selection highlight currently overwrites element stroke with hardcoded `#0099ff`; fix by using a separate Konva overlay ring so element colors are preserved
- A `FloatingToolbar` component appears above the selected shape with color pickers, stroke width control, and (for rects) corner radius
- `FloatingToolbar` is an HTML overlay div positioned using `getBoundingBox` — not a Konva node

### Feature 2: Text Labels
- Add `label?: string` to `BaseElement` (optional, shared by all shapes)
- `RectShape` and `EllipseShape` render a centered Konva `<Text>` when `label` is non-empty
- Double-click on a shape overlays an HTML `<textarea>` (standard Konva text-editing pattern)
- On blur or Enter: `updateElement({ id, label: value })` commits the change

### Feature 3: Smart Connectors
- New `ArrowElement` type with `from`/`to` connection descriptors (`shapeId` + `AnchorPosition`)
- 4 anchor points per shape: `top`, `right`, `bottom`, `left` (center of each edge)
- `computeArrowPoints` resolves connections to world-space coordinates at render time
- `updateArrowConnections` store action re-computes arrow `points` whenever a connected shape moves or resizes
- Arrow drawing uses a two-click flow: click canvas/anchor to set start → move cursor → click canvas/anchor to set end
- `AnchorPoints` component renders anchor indicators on all shapes when the arrow tool is active
- `useArrowDrawing` hook manages the `idle`/`drawing` state machine

---

## Files Changed / Created

| File | Status |
|---|---|
| `src/types/shapes.ts` | Modified — add `label`, `AnchorPosition`, `ArrowConnection`, `ArrowElement`; extend `ShapeType` |
| `src/lib/shapes.ts` | Modified — add `label` default, arrow factory, `getAnchorPoint`, `computeArrowPoints` |
| `src/lib/toolConfig.ts` | Modified — add arrow tool (shortcut: A) |
| `src/store/canvasStore.ts` | Modified — add `updateArrowConnections`, hook into `updateElement` |
| `src/components/shapes/RectShape.tsx` | Modified — selection ring fix, label rendering, dblclick handler |
| `src/components/shapes/EllipseShape.tsx` | Modified — same as RectShape |
| `src/components/shapes/LineShape.tsx` | Modified — selection ring fix |
| `src/components/shapes/ArrowShape.tsx` | **New** |
| `src/components/ShapeRenderer/ShapeRenderer.tsx` | Modified — add `'arrow'` case |
| `src/components/Canvas/Canvas.tsx` | Modified — FloatingToolbar, textarea overlay, arrow tool wiring |
| `src/components/FloatingToolbar/FloatingToolbar.tsx` | **New** |
| `src/components/AnchorPoints/AnchorPoints.tsx` | **New** |
| `src/hooks/useArrowDrawing.ts` | **New** |

All existing test files updated where affected; new `.test.tsx` / `.test.ts` for every new component and hook.

---

## Implementation Tasks

### Step 1.1 — Fix Selection Highlight
- [x] Remove hardcoded `#0099ff` stroke override from `RectShape`, `EllipseShape`, `LineShape`
- [x] Replace with a separate Konva overlay shape (e.g. a second `<Rect>`/`<Ellipse>`/`<Line>` with no fill, blue stroke, slightly expanded, `listening={false}`) rendered only when `isSelected`
- [x] Update shape component tests to verify the element's own `stroke` is preserved when selected
- [x] **Validation:** `npm test` — all tests pass

### Step 1.2 — FloatingToolbar Component
- [x] Create `src/components/FloatingToolbar/FloatingToolbar.tsx`
- [x] Create `src/components/FloatingToolbar/FloatingToolbar.test.tsx`
- [x] **Validation:** `npm test` — all tests pass

### Step 1.3 — Wire FloatingToolbar into Canvas
- [x] In `Canvas.tsx`, when `selectedId` is non-null: compute position from `getBoundingBox`, render `<FloatingToolbar>` as an HTML overlay above the shape
- [x] Update `Canvas.test.tsx`
- [x] **Validation:** `npm test` — all tests pass

### Step 1.4 — Full Feature 1 Validation
- [x] `npm test` — all tests pass
- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — succeeds

---

### Step 2.1 — Add `label` to Types and Defaults
- [x] Add `label: string` to `BaseElement` in `src/types/shapes.ts`
- [x] Add `label: ''` to `BASE_DEFAULTS` in `src/lib/shapes.ts`
- [x] Update `src/lib/shapes.test.ts` to assert label defaults
- [x] **Validation:** `npm test` — all tests pass, `npm run typecheck` clean

### Step 2.2 — Render Labels in Shapes
- [x] In `RectShape.tsx`: render `<Text>` centered when `element.label` is non-empty
- [x] In `EllipseShape.tsx`: render `<Text>` centered when `element.label` is non-empty
- [x] Update `RectShape.test.tsx` and `EllipseShape.test.tsx`
- [x] **Validation:** `npm test` — all tests pass

### Step 2.3 — Double-Click to Edit Label
- [x] Add `onDblClick` / `onDblTap` handlers to `RectShape` and `EllipseShape`
- [x] `Canvas.tsx`: `editingLabelId` state + `<textarea>` overlay
- [x] On blur or Enter → commits label; Escape → cancels
- [x] Update `Canvas.test.tsx`
- [x] **Validation:** `npm test` — all tests pass

### Step 2.4 — Full Feature 2 Validation
- [x] `npm test` — all tests pass
- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — succeeds

---

### Step 3.1 — Arrow Types ✓
- [x] Added `AnchorPosition`, `ArrowConnection`, `ArrowElement` to `src/types/shapes.ts`
- [x] Extended `ShapeType` and `WireframeElement` union

### Step 3.2 — Arrow Factories and Helpers ✓
- [x] `createArrowElement`, `getAnchorPoint`, `computeArrowPoints`, `getConnectedArrows` in `src/lib/shapes.ts`
- [x] Added `getBoundingBox` case for arrows
- [x] Tests added to `src/lib/shapes.test.ts`

### Step 3.3 — Arrow Tool Config ✓
- [x] Arrow tool added (shortcut: A) to `src/lib/toolConfig.ts`
- [x] Tests updated

### Step 3.4 — Store: Arrow Connection Tracking ✓
- [x] `updateArrowConnections(movedId)` action added
- [x] `updateElement` auto-reroutes connected arrows on geometry changes
- [x] Tests added to `canvasStore.test.ts`

### Step 3.5 — ArrowShape Component ✓
- [x] `src/components/shapes/ArrowShape.tsx` — Group wrapper, selection overlay, drag offset
- [x] `src/components/shapes/ArrowShape.test.tsx`

### Step 3.6 — ShapeRenderer: Add Arrow Case ✓
- [x] `'arrow'` case added to `ShapeRenderer.tsx`

### Step 3.7 — AnchorPoints Component ✓
- [x] `src/components/AnchorPoints/AnchorPoints.tsx` — 4 circles per shape, hover highlight
- [x] `src/components/AnchorPoints/AnchorPoints.test.tsx`

### Step 3.8 — useArrowDrawing Hook ✓
- [x] `src/hooks/useArrowDrawing.ts` — idle/drawing state machine, two-click flow
- [x] `src/hooks/useArrowDrawing.test.ts`

### Step 3.9 — Wire Arrow Drawing into Canvas ✓
- [x] AnchorPoints overlay, preview Arrow, anchor snap (12px radius), stage click/mousemove

### Step 3.10 — Full Feature 3 Validation ✓
- [x] `npm test` — 280/280 passed
- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — succeeds

---

## Final Phase 2 Sign-Off ✓

- [x] `npm test` — 280/280 passed
- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — production build succeeds (514kB bundle)
