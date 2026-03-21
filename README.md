# mCanva

A canvas-based wireframing tool built with React, Konva, and Zustand.

Draw shapes, connect them with smart arrows, label them, and style them — all on a persistent Konva canvas with a fully test-covered codebase.

---

## Tech Stack

| Package | Version | Role |
|---|---|---|
| `react` + `react-dom` | 19.2.4 | UI framework |
| `konva` + `react-konva` | 10.2.3 / 19.2.3 | Canvas rendering engine |
| `zustand` | 5.0.12 | Global state management |
| `tailwindcss` | 4.2.2 | Utility-first styling |
| `vite` | 8.0.1 | Build tool and dev server |
| `typescript` | 5.9.3 | Type safety |
| `vitest` | 4.1.0 | Test runner |
| `oxlint` | latest | Linter |

---

## Installation

**Requirements:** Node.js (latest LTS recommended). The project uses [mise](https://mise.jdx.dev/) to pin the Node version — if you have it installed, run `mise install` first.

```sh
# Clone the repository
git clone https://github.com/ramongr/mCanva.git
cd mCanva

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Available scripts

```sh
npm run dev           # Start Vite dev server with HMR
npm run build         # Type-check and build for production
npm run preview       # Serve the production build locally
npm run typecheck     # Run TypeScript type checking without emitting
npm run lint          # Run oxlint on src/
npm run test          # Run the full test suite once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with V8 coverage report
```

### OpenCode (AI assistant)

If you want to use the built-in OpenCode AI assistant:

```sh
# Copy the env template and add your API key
cp .env.opencode.example .env.opencode
# Edit .env.opencode and set ANTHROPIC_API_KEY=...

# Launch the assistant
just opencode
# (requires `just` — https://just.systems)
```

---

## What Has Been Built

### Phase 1 — Core Wireframing

The foundational layer: a working canvas where shapes can be placed, selected, resized, and dragged.

**Shapes:** Rectangle, Ellipse, and Line can be placed on the canvas by selecting the corresponding tool in the left sidebar and clicking anywhere on the canvas.

**Selection and transformation:** Clicking a shape selects it. A `Konva.Transformer` attaches to the selected shape, providing resize handles. Resizing a shape absorbs the Konva scale back into the element's dimensions (width/height for rects, radiusX/radiusY for ellipses) and resets scale to 1, keeping the store state in sync.

**Drag and drop:** All shapes are draggable. Position is committed to the Zustand store on `dragend`.

**Tool palette:** A sidebar toolbar lists all available tools. Each tool has a label, a keyboard shortcut indicator, and `aria-pressed` state. The active tool can be deactivated by clicking it again.

**Architecture established in Phase 1:**
- The Zustand store (`canvasStore.ts`) is the single source of truth. All mutations are pure actions with no side effects — fully unit-testable without mounting React.
- Shape components (`RectShape`, `EllipseShape`, `LineShape`) are purely prop-driven. They take an `element` prop and emit `onSelect` / `onChange` callbacks. No direct store access.
- `ShapeRenderer` dispatches on `element.type` to keep `Canvas.tsx` free of type-switch logic.
- `useCanvasEvents` encapsulates stage-level pointer events (click-to-add, click-to-deselect).
- All library functions in `src/lib/` are pure (no React, no Zustand) and independently unit-tested.

### Phase 2 — Colors, Text Labels, and Smart Connectors

Three features layered on the Phase 1 foundation.

**Shape styling:** A `FloatingToolbar` HTML overlay appears above the selected shape. It exposes fill color (with a transparent toggle), border/stroke color, stroke width (clamped 1–20), and corner radius for rectangles. All changes are applied immediately. The selection highlight is a separate Konva overlay node so the shape's own stroke color is always preserved.

**Text labels:** All shapes support an optional text label rendered centered inside the shape body. Double-clicking a shape opens an absolutely-positioned `<textarea>` overlay for editing. Pressing `Enter` or blurring the textarea commits the label; pressing `Escape` cancels without saving.

**Smart connectors (arrows):** Arrows are first-class elements with their own type, factory, and component. Key behaviors:

- **Two-click drawing:** Select the Arrow tool, click to set the start point, move the cursor to see a live dashed preview, then click again to place the arrow.
- **Anchor snapping:** When drawing or reconnecting, hovering within 20px of a shape's edge midpoint (top, right, bottom, left) snaps the endpoint to that anchor. Anchor indicators appear as circles on all non-arrow shapes when the arrow tool is active.
- **Connection tracking:** An `ArrowElement` stores `from` and `to` connection descriptors (`{ shapeId, anchor }`). When a connected shape is moved or resized, the store automatically recomputes the arrow's points to keep it routed correctly.
- **Live rerouting:** During a drag, `liveUpdateArrowConnections` updates arrow points in real-time without committing the shape's position to the store, preventing React/Konva position conflicts.
- **Endpoint reconnection:** Clicking a connected endpoint handle on a selected arrow enters reconnect mode. The endpoint can be snapped to a new anchor or released as a free point.
- **Arrow body drag:** An arrow whose endpoints are both free can be dragged as a whole. An arrow with one free endpoint can be dragged — only the free endpoint's coordinate updates; the connected endpoint stays anchored.

**Interaction hooks:**
- `useArrowDrawing` — idle/drawing state machine for two-click arrow placement, with a ref-based closure fix to ensure the latest `onAddArrow` callback is always used.
- `useArrowReconnect` — idle/reconnecting state machine for editing existing arrow endpoints, with the same ref pattern to prevent stale closures between `startReconnect` and `commit` calls.

### Phase 3 — Planned (not yet started)

The next phase is documented in `.opencode/plans/keyboard-multiselect-layers-grid.md` and covers:

- **Keyboard shortcuts** — tool activation via R/E/L/A, Delete/Backspace to remove shapes, Escape to cancel, Ctrl+D to duplicate
- **Multi-select** — Shift+click to toggle, marquee rubber-band selection, group drag
- **Layers panel** — right sidebar with visibility/lock toggles, z-order controls, inline label rename
- **Snap to grid** — always-visible 10px grid with placement and drag snapping

---

## Project Structure

```
src/
├── types/
│   ├── shapes.ts          # WireframeElement union, all shape types, ArrowConnection
│   └── konva.ts           # KonvaPointerEvent / KonvaDragEvent type aliases
├── lib/
│   ├── shapes.ts          # Pure shape factories, geometry helpers, type guards
│   ├── elementUtils.ts    # Pure immutable array operations for the elements list
│   ├── stageUtils.ts      # Pure Konva stage event utilities
│   └── toolConfig.ts      # Tool metadata registry (label, description, shortcut)
├── store/
│   └── canvasStore.ts     # Zustand store: elements, selection, active tool, arrow actions
├── hooks/
│   ├── useCanvasEvents.ts   # Stage-level pointer events (place shape, deselect)
│   ├── useArrowDrawing.ts   # Two-click arrow placement state machine
│   └── useArrowReconnect.ts # Arrow endpoint reconnect state machine
├── components/
│   ├── Canvas/              # Main drawing surface; orchestrates all interaction logic
│   ├── Toolbar/             # Left sidebar tool palette (prop-driven)
│   ├── FloatingToolbar/     # HTML overlay for fill, stroke, and style controls
│   ├── ShapeRenderer/       # Type dispatcher: element.type → shape component
│   ├── SelectionTransformer/# Konva.Transformer wrapper for resize handles
│   ├── AnchorPoints/        # Anchor indicators overlay for arrow snapping
│   └── shapes/
│       ├── RectShape.tsx
│       ├── EllipseShape.tsx
│       ├── LineShape.tsx
│       └── ArrowShape.tsx
├── test-utils/
│   └── KonvaTestWrapper.tsx # Stage + Layer wrapper for Konva component tests
├── App.tsx                  # Top-level layout: Toolbar + Canvas, ResizeObserver
└── main.tsx                 # React entry point
```

Every source file has a co-located `.test.ts` / `.test.tsx` file. Tests use Vitest, `@testing-library/react`, and `vitest-canvas-mock` to polyfill the Canvas API in jsdom.
