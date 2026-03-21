# mCanva — Phase 3: Keyboard Shortcuts, Multi-Select, Layers Panel & Grid

## Overview

Phase 3 adds four features on top of the Phase 2 foundation:

1. **Keyboard Shortcuts** — wire up tool activation (R/E/L/A), Delete/Backspace to remove selected shapes, Escape to cancel, and Ctrl+D to duplicate
2. **Multi-Select** — Shift+click to toggle shapes in/out of selection; marquee (rubber-band) drag on empty canvas to select a region; move and delete the group
3. **Layers Panel** — right sidebar listing all elements with controls for visibility, lock, z-order, and inline label rename
4. **Snap to Grid** — 10px grid with always-visible grid lines; shapes snap to the nearest grid intersection on placement and drag

Every step ends with a full test suite run before the next step begins.

---

## Architecture Decisions

### Feature 1: Keyboard Shortcuts
- A single `useKeyboardShortcuts` hook attached to `window`, called in `App.tsx`
- Events are ignored when focus is inside an `<input>`, `<textarea>`, or `[contenteditable]` element to avoid interfering with text editing
- `toolConfig.ts` already declares shortcuts for all 4 tools — the hook reads from `TOOLS` to avoid duplication
- Delete/Backspace removes all ids in `selectedIds` then clears the selection
- Escape deactivates the active tool (sets to null); an optional `onCancelArrow` callback is accepted so the hook can cancel in-progress arrow drawing without coupling to `useArrowDrawing`
- Ctrl+D / Cmd+D duplicates the selected element(s) at a `(+20, +20)` offset and selects the new copies
- **Note:** `generateId()` has been removed from `lib/shapes.ts` (Phase 2 purity refactor). ID generation at duplicate call sites must use `crypto.randomUUID()` directly

### Feature 2: Multi-Select
- The store's `selectedId: string | null` is replaced by `selectedIds: Set<string>` — a single selected element is just a set of size 1
- New store actions: `selectElements(ids: Set<string>)` replaces `selectElement` and `clearSelection`; `toggleElementSelection(id)` adds if absent, removes if present; `addToSelection(id)` adds without clearing others
- **Shift+click** on a shape calls `toggleElementSelection(id)`; plain click calls `selectElements(new Set([id]))`; click on empty canvas calls `selectElements(new Set())`
- Shape components receive `onSelect(id: string, shiftKey: boolean)` — `shiftKey` is read from `e.evt.shiftKey` on the Konva click event
- **Marquee selection** is tracked in `Canvas.tsx` local state (`marqueeStart`, `marqueeRect`):
  - `onMouseDown` on the Stage background: record `marqueeStart`
  - `onMouseMove`: compute and update `marqueeRect`; render a dashed `<Rect>` overlay
  - `onMouseUp`: find all elements whose bounding boxes intersect the marquee; call `selectElements`
- `SelectionTransformer` is updated to accept `selectedIds: Set<string>` and attach to all matching Konva nodes
- Multi-shape drag: on `onDragStart` record `dragStartPositions` (map of id → {x,y}) for all selected ids; on `onDragEnd` compute `(dx, dy)` from the dragged shape's delta and apply it to all other selected shapes via `updateElement`
- `FloatingToolbar` is only shown when `selectedIds.size === 1`

### Feature 3: Layers Panel
- New `LayersPanel` component in `src/components/LayersPanel/LayersPanel.tsx` — purely prop-driven, no store access
- `App.tsx` layout gains a third flex child: `<LayersPanel />` after `<main>`, fixed width `w-56` (224px)
- Elements are rendered in **reverse** z-order so the top-most shape appears first in the list
- Each row: drag handle, eye icon (toggle `visible`), lock icon (toggle `locked`), shape type badge, label text (inline editable on single-click), bring-to-front / send-to-back chevron buttons
- Clicking a row body selects that element (calls `onSelect`)
- Inline label edit: single-click on label text → `<input>` replaces it; blur or Enter commits via `onUpdate`
- Z-order reorder uses a new `moveElementTo(id, targetIndex)` store action backed by a pure helper in `elementUtils.ts`
- Panel has `overflow-y-auto` for long element lists; a "Layers" header with element count badge

### Feature 4: Snap to Grid
- Grid constant `GRID_SIZE = 10` and helpers live in `src/lib/gridUtils.ts`
- `snapToGrid(value)` rounds to the nearest multiple of `GRID_SIZE`
- Snap is applied in two places: (1) coordinates passed to `addElementAt` in `Canvas.tsx` are snapped before placement; (2) `onDragEnd` in each shape component wraps `x`/`y` in `snapToGrid` before calling `onChange`
- **Grid overlay** is a dedicated `GridLayer` component rendering a Konva `<Layer>` behind the main layer, with horizontal and vertical `<Line>` nodes: stroke `#e2e8f0`, strokeWidth `0.5`, `listening={false}`. Always visible (no toggle).

---

## Phase 2 Delivered — Impact on Phase 3

The following were delivered in Phase 2 (some beyond the original plan document) and directly affect Phase 3 implementation:

### `useArrowReconnect` hook (delivered in Phase 2, not in original plan)
`Canvas.tsx` uses `arrowReconnect.phase`, `arrowReconnect.session`, `arrowReconnect.hoveredAnchor`, and the ref pattern (`arrowReconnectRef`). All of these must be preserved untouched when Step 1.2 migrates `selectedId` → `selectedIds` in `Canvas.tsx`. The reconnect wiring is independent of selection state and must not be disturbed.

### `liveUpdateArrowConnections` store action (delivered in Phase 2, not in original plan)
This action updates arrow points in real-time during a drag without committing the shape's `x`/`y`. In Phase 3 Step 2.3 (multi-select drag), the *dragged* shape continues to use `liveUpdateArrowConnections` for live arrow feedback. The *other* selected shapes (moved by delta on `dragEnd`) should use `updateElement` — which already auto-reroutes connected arrows via the existing `updateElement` hook — not `liveUpdateArrowConnections`.

### `reconnectArrowEndpoint` store action (delivered in Phase 2, not in original plan)
Phase 3 Step 3.1 (Ctrl+D duplicate): when duplicating an `ArrowElement` that has `from`/`to` connections, the duplicate should **preserve** those connection references (same `shapeId` values). This means the duplicate arrow will also connect to the same shapes, which is the expected behavior. No special handling is needed — a spread copy of the element with a new `id` and offset position naturally preserves `from`/`to`.

### `ArrowShape` `onEndpointClick` prop (delivered in Phase 2)
Phase 3 modifies `ArrowShape` to add `onSelect(id, shiftKey)`. The existing `onEndpointClick?: (arrowId: string, endpoint: 'from' | 'to') => void` prop must be preserved unchanged alongside the new `onSelect` signature change.

### Phase 2 Purity Refactor — Impact on Phase 3

### `generateId()` removed
`generateId()` no longer exists in `lib/shapes.ts`. Any code that needs a fresh ID must call `crypto.randomUUID()` directly at the call site. Affected Phase 3 location:
- `useKeyboardShortcuts.ts` — Ctrl+D duplicate: `const newId = crypto.randomUUID()`

### Factory functions require `id`
All element factories (`createRectElement`, `createEllipseElement`, `createLineElement`, `createArrowElement`, `createElement`) now require `id` as a mandatory field in their `overrides` argument. The store's `addElementAt` action is the canonical ID-generating call site — it calls `crypto.randomUUID()` then passes `{ id, x, y }` to `createElement`. Phase 3 code that creates elements (e.g. Ctrl+D duplicate) must follow the same pattern.

### `findNearestAnchor` and `resolvePointerWithSnap` are pure functions in `lib/shapes.ts`
These are no longer `useCallback` hooks defined inside `Canvas.tsx`. They are exported pure functions:
- `findNearestAnchor(elements, x, y, snapRadius)` — returns `ArrowConnection | undefined`
- `resolvePointerWithSnap(elements, pos, snapRadius)` — returns `{ x, y, anchorHit? }`

`Canvas.tsx` uses them via thin wrappers that close over `elements` and `ANCHOR_SNAP_RADIUS`. Phase 3's Step 4.3 snap-on-placement work must call these pure functions (imported from `lib/shapes.ts`) rather than defining new local equivalents.

### `computeArrowDragPoints` is a pure function in `lib/shapes.ts`
`ArrowShape.tsx`'s internal `computeNewPoints` has been extracted and renamed to `computeArrowDragPoints(element, dx, dy)`. Phase 3 modifications to `ArrowShape.tsx` must import and use this function from `lib/shapes.ts`.

### `stageUtils` signatures changed
- `getStageClickCoords(stage: Konva.Stage): StageClickCoords | null` — takes the stage directly, not the event
- `isStageClick(e: KonvaEventObject<MouseEvent>, stage: Konva.Stage): boolean` — takes both the event and the stage

`useCanvasEvents.ts` now receives the stage as a parameter and passes it through. Phase 3 modifications to `useCanvasEvents` or its call sites in `Canvas.tsx` must pass `stageRef.current` where the stage is needed.

### `intersectsBoundingBox` belongs in `lib/shapes.ts`
Phase 3 Step 2.2 adds this pure helper. It is consistent with the purity refactor pattern — place it in `lib/shapes.ts` alongside the other pure geometry helpers and test it in `lib/shapes.test.ts`.

---

## Files Changed / Created

| File | Status |
|---|---|
| `src/store/canvasStore.ts` | Modified — replace `selectedId` with `selectedIds: Set<string>`; add `selectElements`, `toggleElementSelection`, `addToSelection`, `moveElementTo` |
| `src/store/canvasStore.test.ts` | Modified |
| `src/lib/elementUtils.ts` | Modified — add pure `moveElementTo` helper |
| `src/lib/elementUtils.test.ts` | Modified |
| `src/lib/gridUtils.ts` | **New** — `GRID_SIZE`, `snapToGrid`, `generateGridLines` |
| `src/lib/gridUtils.test.ts` | **New** |
| `src/hooks/useKeyboardShortcuts.ts` | **New** |
| `src/hooks/useKeyboardShortcuts.test.ts` | **New** |
| `src/components/Canvas/Canvas.tsx` | Modified — marquee selection, multi-select drag delta, grid snap on placement, keyboard hook wiring; preserve `useArrowReconnect` wiring |
| `src/components/Canvas/Canvas.test.tsx` | Modified |
| `src/components/SelectionTransformer/SelectionTransformer.tsx` | Modified — accept `selectedIds: Set<string>` instead of `selectedId: string \| null` |
| `src/components/SelectionTransformer/SelectionTransformer.test.tsx` | Modified |
| `src/components/ShapeRenderer/ShapeRenderer.tsx` | Modified — `isSelected` derived from `selectedIds.has(id)` |
| `src/components/ShapeRenderer/ShapeRenderer.test.tsx` | Modified |
| `src/components/shapes/RectShape.tsx` | Modified — `onSelect(id, shiftKey)`, snap on drag |
| `src/components/shapes/RectShape.test.tsx` | Modified |
| `src/components/shapes/EllipseShape.tsx` | Modified — `onSelect(id, shiftKey)`, snap on drag |
| `src/components/shapes/EllipseShape.test.tsx` | Modified |
| `src/components/shapes/LineShape.tsx` | Modified — `onSelect(id, shiftKey)`, snap on drag |
| `src/components/shapes/LineShape.test.tsx` | Modified |
| `src/components/shapes/ArrowShape.tsx` | Modified — `onSelect(id, shiftKey)`; preserve `onEndpointClick`; use `computeArrowDragPoints` from `lib/shapes.ts` |
| `src/components/shapes/ArrowShape.test.tsx` | Modified |
| `src/components/LayersPanel/LayersPanel.tsx` | **New** |
| `src/components/LayersPanel/LayersPanel.test.tsx` | **New** |
| `src/components/GridLayer/GridLayer.tsx` | **New** — Konva Layer with always-visible grid lines |
| `src/components/GridLayer/GridLayer.test.tsx` | **New** |
| `src/App.tsx` | Modified — add `LayersPanel` to layout, wire `useKeyboardShortcuts` |
| `src/App.test.tsx` | Modified |

---

## Implementation Tasks

### Step 1.1 — Migrate Store: `selectedId` → `selectedIds`
- [ ] In `src/store/canvasStore.ts`:
  - Change state field `selectedId: string | null` to `selectedIds: Set<string>`
  - Initial state: `selectedIds: new Set()`
  - Replace `selectElement(id: string | null)` with `selectElements(ids: Set<string>)`
  - Replace `clearSelection()` body to call `selectElements(new Set())`
  - Add `toggleElementSelection(id: string)` — adds if absent, removes if present
  - Add `addToSelection(id: string)` — adds without clearing others
  - Update `removeElement` to delete the removed id from `selectedIds`
  - Update `addElementAt` to auto-select via `selectElements(new Set([element.id]))`
- [ ] In `src/lib/elementUtils.ts`: add pure `moveElementTo(elements, id, targetIndex)` — removes element from current index, inserts at clamped `targetIndex`
- [ ] Add `moveElementTo(id: string, targetIndex: number)` store action delegating to the new utility
- [ ] Update `src/lib/elementUtils.test.ts` with `moveElementTo` tests
- [ ] Update `src/store/canvasStore.test.ts` — update all tests referencing `selectedId`, `selectElement`, `clearSelection`
- [ ] **Validation:** `npm run typecheck` clean, `npm test` — all tests pass

### Step 1.2 — Update All `selectedId` Consumers
- [ ] `Canvas.tsx` — replace `selectedId` reads with `selectedIds`; update `selectElement` / `clearSelection` calls to `selectElements` / `toggleElementSelection`; derive `isSelected` as `selectedIds.has(element.id)`; show `FloatingToolbar` only when `selectedIds.size === 1`; **preserve all `useArrowReconnect` wiring unchanged**
- [ ] `SelectionTransformer.tsx` — change prop from `selectedId: string | null` to `selectedIds: Set<string>`; find all matching Konva nodes by id and attach transformer to all of them
- [ ] Update `Canvas.test.tsx`, `SelectionTransformer.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 1.3 — Full Multi-Select Store Validation
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds

---

### Step 2.1 — Shift+Click on Shapes
- [ ] Update `onSelect` callback signature across all shape components to `(id: string, shiftKey: boolean)`
  - Each shape reads `shiftKey` from the Konva click event (`e.evt.shiftKey`) and passes it up
  - Applies to `RectShape`, `EllipseShape`, `LineShape`, `ArrowShape`
  - For `ArrowShape`: preserve `onEndpointClick?: (arrowId: string, endpoint: 'from' | 'to') => void` unchanged alongside the new `onSelect` signature
- [ ] In `Canvas.tsx` `handleSelect(id, shiftKey)`:
  - If `shiftKey`: call `toggleElementSelection(id)`
  - Else: call `selectElements(new Set([id]))`
- [ ] Update all shape component tests and `Canvas.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 2.2 — Marquee (Rubber-Band) Selection
- [ ] In `Canvas.tsx`, add local state: `marqueeStart: { x: number; y: number } | null` and `marqueeRect: { x: number; y: number; width: number; height: number } | null`
- [ ] `onMouseDown` on the Stage: if no active tool and the event target is the Stage itself, set `marqueeStart`
- [ ] `onMouseMove`: if `marqueeStart` is set, compute `marqueeRect` from start + current pointer position
- [ ] Render the marquee as a Konva `<Rect>` in the main layer when `marqueeRect` is non-null: `fill="rgba(0,153,255,0.08)"`, `stroke="#0099ff"`, `strokeWidth={1}`, `dash={[4,3]}`, `listening={false}`
- [ ] `onMouseUp`: if `marqueeRect` is set, find all elements whose bounding boxes intersect the marquee rect; call `selectElements(new Set(matchingIds))`; clear marquee state
- [ ] Add `intersectsBoundingBox(a: BoundingBox, b: BoundingBox): boolean` pure helper to `src/lib/shapes.ts` and test it in `shapes.test.ts`
- [ ] Update `Canvas.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 2.3 — Move Multi-Selection Together
- [ ] In `Canvas.tsx`, add local state `dragStartPositions: Map<string, { x: number; y: number }> | null`
- [ ] Pass an `onDragStart` prop to `ShapeRenderer` / shape components; when a drag starts on a shape that is part of a multi-selection (`selectedIds.size > 1`), record all selected shapes' current positions in `dragStartPositions`
- [ ] On `onDragEnd` for a shape in a multi-selection: compute `(dx, dy)` from the dragged shape's start position; call `updateElement({ id, x: snapToGrid(el.x + dx), y: snapToGrid(el.y + dy) })` for each other selected id; clear `dragStartPositions`
- [ ] The dragged shape itself continues to use `liveUpdateArrowConnections` for live arrow feedback during drag, and commits its final position via its existing `onChange` path (also snapped)
- [ ] The other selected shapes moved by delta on `dragEnd` use `updateElement`, which auto-reroutes their connected arrows via the existing hook in the store
- [ ] Update shape component tests and `Canvas.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 2.4 — Full Feature 2 Validation
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds
- [ ] Manual smoke test:
  - Shift+click multiple shapes → all highlighted simultaneously
  - Drag a marquee on empty canvas → intersecting shapes become selected
  - Drag any shape in the multi-selection → all selected shapes move together by the same delta

---

### Step 3.1 — Keyboard Shortcuts Hook
- [ ] Create `src/hooks/useKeyboardShortcuts.ts`
  - Props: `{ setActiveTool, activeTool, selectedIds, removeElement, selectElements, addElement, getElementById, onCancelArrow? }`
  - Attaches a `keydown` listener to `window` on mount; removes it on unmount
  - Ignores events when `document.activeElement` is an `<input>`, `<textarea>`, or `[contenteditable]` element
  - Tool activation: key matches a `TOOLS[i].shortcut` (case-insensitive) with no modifier keys → `setActiveTool(tool.type)` if not already active, or `setActiveTool(null)` if already active (toggle)
  - `Delete` / `Backspace`: call `removeElement(id)` for each id in `selectedIds`, then `selectElements(new Set())`
  - `Escape`: call `setActiveTool(null)` and `onCancelArrow?.()` if provided
  - `Ctrl+D` / `Cmd+D`: for each id in `selectedIds`, look up the element, create a copy with `id: crypto.randomUUID()` at `(x + 20, y + 20)`, call `addElement(copy)`; select all new copies via `selectElements`. **Do not use `generateId()` — it no longer exists.** Arrow duplicates preserve `from`/`to` references by default (spread copy) — no special handling needed.
- [ ] Create `src/hooks/useKeyboardShortcuts.test.ts`
- [ ] Wire into `App.tsx`: call `useKeyboardShortcuts({ ... })` with store actions and `onCancelArrow` forwarded to the `arrowDrawing.cancel` callback from `Canvas`
- [ ] Update `App.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 3.2 — Full Feature 3 Validation
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds
- [ ] Manual smoke test:
  - Press R / E / L / A → correct tool activates; press same key again → tool deactivates
  - Select a shape → press Delete → shape is removed from the canvas
  - Press Escape while arrow tool is active → tool deactivates
  - Select a shape → press Ctrl+D → duplicate appears offset by 20px and is auto-selected

---

### Step 4.1 — Grid Utilities
- [ ] Create `src/lib/gridUtils.ts`:
  - `export const GRID_SIZE = 10`
  - `export function snapToGrid(value: number): number` — `Math.round(value / GRID_SIZE) * GRID_SIZE`
  - `export function generateGridLines(width: number, height: number, gridSize: number): { verticals: number[]; horizontals: number[] }` — arrays of x and y positions for every grid line
- [ ] Create `src/lib/gridUtils.test.ts` — test `snapToGrid` for positive, negative, and boundary values; test `generateGridLines` for correct count and positions
- [ ] **Validation:** `npm test` — all tests pass

### Step 4.2 — GridLayer Component
- [ ] Create `src/components/GridLayer/GridLayer.tsx`
  - Props: `width: number`, `height: number`
  - Calls `generateGridLines(width, height, GRID_SIZE)` to get line positions
  - Renders one Konva `<Line>` per vertical position (`points={[x, 0, x, height]}`) and per horizontal position (`points={[0, y, width, y]}`)
  - All lines: `stroke="#e2e8f0"`, `strokeWidth={0.5}`, `listening={false}`
  - Returns a Konva `<Layer>` (not a `<Group>`) so it sits behind the main layer
- [ ] Create `src/components/GridLayer/GridLayer.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 4.3 — Wire Grid into Canvas
- [ ] In `Canvas.tsx`, add `<GridLayer width={width} height={height} />` as the first `<Layer>` before the main shapes layer
- [ ] Import `snapToGrid` from `src/lib/gridUtils.ts`
- [ ] Snap placement: in `handleStageClickWithArrow` and the non-arrow path, snap `x` and `y` via `snapToGrid` before passing to `addElementAt` or `arrowDrawing.handleCanvasClick`
- [ ] **Note:** `resolvePointerWithSnap` is now a pure function imported from `lib/shapes.ts`. Use it (or its `Canvas.tsx` wrapper) for pointer resolution — do not redefine it locally
- [ ] Snap on drag: in `handleChange` when `x` or `y` are present in the update, apply `snapToGrid`
- [ ] Update `Canvas.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 4.4 — Full Feature 4 Validation
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds
- [ ] Manual smoke test:
  - Grid lines are visible across the entire canvas surface
  - Place a rect → its position snaps to the nearest 10px grid point
  - Drag a shape and release → it snaps to the nearest 10px grid point

---

### Step 5.1 — LayersPanel Component
- [ ] Create `src/components/LayersPanel/LayersPanel.tsx`
  - Props:
    ```ts
    interface LayersPanelProps {
      elements: WireframeElement[]
      selectedIds: Set<string>
      onSelect: (id: string, shiftKey: boolean) => void
      onUpdate: (update: ElementUpdate) => void
      onMoveElementTo: (id: string, targetIndex: number) => void
      onBringToFront: (id: string) => void
      onSendToBack: (id: string) => void
    }
    ```
  - Renders elements in **reverse** z-order (index `elements.length - 1` shown first) so the top-most shape appears at the top of the list
  - Each row contains:
    - Eye icon button — `onUpdate({ id, visible: !el.visible })`; icon dimmed when hidden
    - Lock icon button — `onUpdate({ id, locked: !el.locked })`; icon highlighted when locked
    - Shape type badge (text label: `rect` / `ellipse` / `line` / `arrow`)
    - Label text (falls back to type name when `el.label` is empty) — single-click opens inline `<input>`; blur or Enter commits via `onUpdate({ id, label: value })`
    - Bring-to-front / send-to-back chevron buttons calling `onBringToFront` / `onSendToBack`
  - Clicking the row body calls `onSelect(el.id, false)`
  - Row is highlighted when `selectedIds.has(el.id)`
  - Panel width: `w-56`; fixed full height with `overflow-y-auto`
  - Header: "Layers" text + element count badge
- [ ] Create `src/components/LayersPanel/LayersPanel.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 5.2 — Wire LayersPanel into App
- [ ] In `App.tsx`:
  - Read `elements`, `selectedIds`, `selectElements`, `toggleElementSelection`, `updateElement`, `moveElementTo`, `bringToFront`, `sendToBack` from the store
  - Add `<LayersPanel>` as the third child in the top-level flex container (after `<main>`), passing all required props
  - `onSelect` wraps `selectElements` / `toggleElementSelection` based on `shiftKey`
- [ ] Update `App.test.tsx`
- [ ] **Validation:** `npm test` — all tests pass

### Step 5.3 — Full Feature 5 Validation
- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — succeeds
- [ ] Manual smoke test:
  - Layers panel shows all elements in z-order, top-most shape listed first
  - Click a layer row → shape is selected on the canvas
  - Toggle eye icon → shape hides / shows on canvas
  - Toggle lock icon → shape cannot be dragged
  - Click a layer label → inline input appears → type → blur → label updates on canvas and in the panel
  - Click bring-to-front chevron → element moves to top of the list and renders above all others

---

## Final Sign-Off

- [ ] `npm test` — all tests pass (target: >= 95% statement coverage)
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — production build succeeds
