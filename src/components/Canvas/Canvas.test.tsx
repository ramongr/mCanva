import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act, screen, fireEvent } from '@testing-library/react'
import Konva from 'konva'
import { Canvas } from './Canvas'
import { useCanvasStore } from '@/store/canvasStore'
import { createRectElement, createEllipseElement, createArrowElement, getAnchorPoint } from '@/lib/shapes'
import type { ArrowElement } from '@/types/shapes'

function resetStore() {
  useCanvasStore.setState({ elements: [], selectedIds: new Set(), activeTool: null })
}

/**
 * Renders the Canvas and returns the Konva Stage that was freshly created
 * by this render. We snapshot Konva.stages.length before rendering and take
 * the difference after — this is reliable even when other test files leave
 * stale stage references in the global registry.
 */
function renderCanvas(width = 800, height = 600) {
  const countBefore = Konva.stages.length
  const result = render(<Canvas width={width} height={height} />)
  // Find the first new stage added since we started
  const newStages = Konva.stages.slice(countBefore)
  if (newStages.length === 0) {
    throw new Error(
      `Expected at least one new Konva stage to be created. Total stages: ${Konva.stages.length}`,
    )
  }
  const stage = newStages[0]
  return { ...result, stage }
}

describe('Canvas', () => {
  beforeEach(resetStore)
  afterEach(() => {
    // Destroy stages BEFORE cleanup so Konva can still access its DOM container
    ;[...Konva.stages].forEach((s) => {
      try { s.destroy() } catch { /* ignore already-destroyed */ }
    })
    cleanup()
  })

  it('renders a Konva Stage', () => {
    const { stage } = renderCanvas()
    expect(stage).toBeDefined()
    expect(stage.width()).toBe(800)
  })

  it('renders no shape nodes when the store is empty', () => {
    const { stage } = renderCanvas()
    // Elements are now wrapped in Groups with ids; Transformer anchors do not have ids
    const userGroups = stage.find('Group').filter((n) => !!n.id())
    expect(userGroups).toHaveLength(0)
  })

  it('renders a Group node for each rect element in the store', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2' }))
    const { stage } = renderCanvas()
    // Shapes are wrapped in Groups with the element id
    const userGroups = stage.find('Group').filter((n) => !!n.id())
    expect(userGroups).toHaveLength(2)
  })

  it('renders a Group node for ellipse elements', () => {
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1' }))
    const { stage } = renderCanvas()
    const userGroups = stage.find('Group').filter((n) => !!n.id())
    expect(userGroups).toHaveLength(1)
  })

  it('uses a crosshair cursor when an activeTool is set', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    const { stage } = renderCanvas()
    expect(stage.container().style.cursor).toBe('crosshair')
  })

  it('uses default cursor when no activeTool is set', () => {
    const { stage } = renderCanvas()
    expect(stage.container().style.cursor).toBe('default')
  })

  it('renders a Transformer node', () => {
    const { stage } = renderCanvas()
    expect(stage.findOne('Transformer')).toBeDefined()
  })

  it('attaches the Transformer to the selected element', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })
    const { stage } = renderCanvas()
    const transformer = stage.findOne('Transformer') as Konva.Transformer
    expect(transformer.nodes()).toHaveLength(1)
    expect(transformer.nodes()[0].id()).toBe('r1')
  })

  it('selects an element when clicked', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    const { stage } = renderCanvas()
    // Elements are now wrapped in Groups; the id is on the Group
    const group = stage.findOne('#r1') as Konva.Group
    act(() => { group.fire('click', { cancelBubble: false }) })
    expect(useCanvasStore.getState().selectedIds.has('r1')).toBe(true)
  })

  it('shift+click adds a second element to the selection', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })
    const { stage } = renderCanvas()
    const group2 = stage.findOne('#r2') as Konva.Group
    act(() => { group2.fire('click', { cancelBubble: false, evt: { shiftKey: true } }) })
    const ids = useCanvasStore.getState().selectedIds
    expect(ids.has('r1')).toBe(true)
    expect(ids.has('r2')).toBe(true)
  })

  it('shift+click on already-selected element deselects it', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1', 'r2']) })
    const { stage } = renderCanvas()
    const group1 = stage.findOne('#r1') as Konva.Group
    act(() => { group1.fire('click', { cancelBubble: false, evt: { shiftKey: true } }) })
    const ids = useCanvasStore.getState().selectedIds
    expect(ids.has('r1')).toBe(false)
    expect(ids.has('r2')).toBe(true)
  })

  it('updates element position in the store after drag', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    const { stage } = renderCanvas()
    const group = stage.findOne('#r1') as Konva.Group
    act(() => {
      group.position({ x: 70, y: 80 })
      group.fire('dragend')
    })
    const el = useCanvasStore.getState().elements[0]
    expect(el.x).toBe(70)
    expect(el.y).toBe(80)
  })

  it('sets the correct width and height on the Konva Stage', () => {
    const { stage } = renderCanvas(1024, 768)
    expect(stage.width()).toBe(1024)
    expect(stage.height()).toBe(768)
  })

  it('shows the floating toolbar when a shape is selected', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })
    renderCanvas()
    expect(screen.getByTestId('floating-toolbar')).toBeInTheDocument()
  })

  it('does not show the floating toolbar when nothing is selected', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    renderCanvas()
    expect(screen.queryByTestId('floating-toolbar')).not.toBeInTheDocument()
  })

  it('shows a textarea overlay when a shape label is being edited', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    const { stage } = renderCanvas()
    const group = stage.findOne('#r1') as Konva.Group
    act(() => { group.fire('dblclick', { cancelBubble: false }) })
    expect(screen.getByTestId('label-textarea')).toBeInTheDocument()
  })

  it('commits label on Enter key in textarea', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', label: '' }))
    const { stage } = renderCanvas()
    const group = stage.findOne('#r1') as Konva.Group
    act(() => { group.fire('dblclick', { cancelBubble: false }) })
    const textarea = screen.getByTestId('label-textarea') as HTMLTextAreaElement
    act(() => {
      fireEvent.change(textarea, { target: { value: 'My Label' } })
      fireEvent.keyDown(textarea, { key: 'Enter' })
    })
    expect(screen.queryByTestId('label-textarea')).not.toBeInTheDocument()
    expect(useCanvasStore.getState().elements[0].label).toBe('My Label')
  })

  it('dismisses textarea on Escape without saving', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', label: 'original' }))
    const { stage } = renderCanvas()
    const group = stage.findOne('#r1') as Konva.Group
    act(() => { group.fire('dblclick', { cancelBubble: false }) })
    const textarea = screen.getByTestId('label-textarea')
    act(() => {
      fireEvent.keyDown(textarea, { key: 'Escape' })
    })
    expect(screen.queryByTestId('label-textarea')).not.toBeInTheDocument()
    // Label unchanged
    expect(useCanvasStore.getState().elements[0].label).toBe('original')
  })

  // ---------------------------------------------------------------------------
  // Arrow tool integration
  // ---------------------------------------------------------------------------

  it('shows anchor point circles when the arrow tool is active', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()
    // AnchorPoints renders 4 circles per non-arrow shape
    const circles = stage.find('Circle') as Konva.Circle[]
    expect(circles.length).toBeGreaterThanOrEqual(4)
  })

  it('does not show anchor point circles when the arrow tool is inactive', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    const { stage } = renderCanvas()
    const circles = stage.find('Circle') as Konva.Circle[]
    expect(circles).toHaveLength(0)
  })

  it('deactivates the arrow tool after placing one arrow', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 }))
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()

    // Provide a pointer position so getPointerPosition() returns a value
    stage.setPointersPositions({ x: 50, y: 50 })
    act(() => { stage.fire('click', { target: stage }) })

    stage.setPointersPositions({ x: 300, y: 200 })
    act(() => { stage.fire('click', { target: stage }) })

    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('adds an arrow element to the store after two stage clicks', () => {
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()

    stage.setPointersPositions({ x: 10, y: 10 })
    act(() => { stage.fire('click', { target: stage }) })

    stage.setPointersPositions({ x: 200, y: 200 })
    act(() => { stage.fire('click', { target: stage }) })

    const elements = useCanvasStore.getState().elements
    expect(elements.some((el) => el.type === 'arrow')).toBe(true)
  })

  it('renders placed arrow elements on the canvas', () => {
    const arrow = createArrowElement(10, 10, 200, 200, { id: 'a1' })
    useCanvasStore.getState().addElement(arrow)
    const { stage } = renderCanvas()
    const arrowGroup = stage.findOne('#a1') as Konva.Group
    expect(arrowGroup).toBeDefined()
    expect(arrowGroup.name()).toBe('arrow')
  })

  it('shapes layer is non-interactive when arrow tool is active (clicks pass through to stage)', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()

    // The shapes layer should have listening=false when arrow tool is active
    const layers = stage.find('Layer') as Konva.Layer[]
    const shapesLayer = layers[1]
    expect(shapesLayer.listening()).toBe(false)
  })

  it('deactivating the arrow tool restores shape interactivity', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()

    act(() => {
      useCanvasStore.getState().setActiveTool(null)
    })

    const layers = stage.find('Layer') as Konva.Layer[]
    const shapesLayer = layers[1]
    expect(shapesLayer.listening()).toBe(true)
  })

  // Regression: arrow tool must call the latest onAddArrow even across re-renders
  it('calls the store addElement with an arrow after two clicks without stale closure', () => {
    useCanvasStore.setState({ activeTool: 'arrow' })
    const { stage } = renderCanvas()

    // First click starts drawing
    stage.setPointersPositions({ x: 10, y: 10 })
    act(() => { stage.fire('click', { target: stage }) })

    // Trigger a re-render by touching unrelated store state (simulates a mid-draw re-render)
    act(() => { useCanvasStore.setState({ selectedIds: new Set() }) })

    // Second click should still finalize the arrow — not silently drop it due to a stale closure
    stage.setPointersPositions({ x: 300, y: 300 })
    act(() => { stage.fire('click', { target: stage }) })

    const elements = useCanvasStore.getState().elements
    expect(elements.filter((el) => el.type === 'arrow')).toHaveLength(1)
    // And the tool must be off
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Arrow endpoint reconnect — integration tests
  // ---------------------------------------------------------------------------

  it('shows anchor overlay when a selected arrow endpoint handle is clicked', () => {
    // Arrow with one free endpoint
    const arrow = createArrowElement(10, 10, 200, 200, { id: 'a1', from: null, to: null })
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })
    const { stage } = renderCanvas()

    // Click the 'from' endpoint handle to enter reconnect mode
    const group = stage.findOne('#a1') as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    act(() => { fromHandle.fire('click', { cancelBubble: false }) })

    // Anchor overlay layer should now be present (circles rendered for all shapes)
    // No other shapes on canvas, so just verify the overlay layer appeared by
    // checking the shapes layer is now non-interactive
    const layers = stage.find('Layer') as Konva.Layer[]
    expect(layers[1].listening()).toBe(false)
  })

  it('connects a free endpoint to a shape anchor without disconnecting the other side', () => {
    // Shape 1 — arrow's from is already connected here
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    // Shape 2 — we will connect the free 'to' endpoint here
    const ellipse2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })

    // Arrow: from=ellipse1.right, to=free
    const e1RightAnchor = getAnchorPoint(ellipse1, 'right')
    const arrow = createArrowElement(e1RightAnchor.x, e1RightAnchor.y, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(ellipse2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click the free 'to' handle to enter reconnect mode
    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    act(() => { toHandle.fire('click', { cancelBubble: false }) })

    // Click the left anchor of ellipse2
    const e2LeftAnchor = stage.findOne('.anchor-e2-left') as Konva.Circle
    act(() => { e2LeftAnchor.fire('click', { cancelBubble: false }) })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    // 'from' must still be connected to ellipse1
    expect(updatedArrow.from).toEqual({ shapeId: 'e1', anchor: 'right' })
    // 'to' must now be connected to ellipse2
    expect(updatedArrow.to).toEqual({ shapeId: 'e2', anchor: 'left' })
  })

  // Regression: clicking an anchor during reconnect must NOT fire a second
  // commit via event bubbling, which was disconnecting the just-connected endpoint.
  // We verify this by asserting the final store state: both endpoints connected,
  // meaning the second (unwanted) call with connection=null did NOT run.
  it('anchor click during reconnect commits exactly once — does not bubble to stage and undo the connection', () => {
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const ellipse2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(ellipse2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Enter reconnect mode for the free 'to' endpoint
    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    act(() => { toHandle.fire('click', { cancelBubble: false }) })

    // Click the anchor on ellipse2
    const e2LeftAnchor = stage.findOne('.anchor-e2-left') as Konva.Circle
    act(() => { e2LeftAnchor.fire('click', { cancelBubble: false }) })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement

    // If the event had bubbled to the stage and triggered a second commit (with
    // connection=null), 'to' would have been set to null here — that's the bug.
    expect(updatedArrow.to).not.toBeNull()
    expect(updatedArrow.to).toEqual({ shapeId: 'e2', anchor: 'left' })

    // 'from' must be completely unaffected
    expect(updatedArrow.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  it('clicking a connected endpoint handle immediately disconnects it', () => {
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e1RightAnchor = getAnchorPoint(ellipse1, 'right')
    const arrow = createArrowElement(e1RightAnchor.x, e1RightAnchor.y, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click the connected 'from' handle — should disconnect immediately, no second click needed
    const group = stage.findOne('#a1') as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    act(() => { fromHandle.fire('click', { cancelBubble: false }) })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.from).toBeNull()
    // Endpoint stays at its current canvas position (not moved)
    expect(updatedArrow.points[0]).toBeCloseTo(e1RightAnchor.x)
    expect(updatedArrow.points[1]).toBeCloseTo(e1RightAnchor.y)
    // 'to' was already null and must remain null
    expect(updatedArrow.to).toBeNull()
  })

  it('clicking a connected endpoint handle does NOT enter reconnect mode', () => {
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e1RightAnchor = getAnchorPoint(ellipse1, 'right')
    const arrow = createArrowElement(e1RightAnchor.x, e1RightAnchor.y, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    const group = stage.findOne('#a1') as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    act(() => { fromHandle.fire('click', { cancelBubble: false }) })

    // Shapes layer must remain interactive (no anchor overlay shown)
    const layers = stage.find('Layer') as Konva.Layer[]
    expect(layers[1].listening()).toBe(true)
  })

  it('clicking a free endpoint handle enters reconnect mode (anchor overlay appears)', () => {
    const arrow = createArrowElement(50, 50, 300, 100, { id: 'a1', from: null, to: null })
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    const group = stage.findOne('#a1') as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    act(() => { fromHandle.fire('click', { cancelBubble: false }) })

    // Anchor overlay layer should be active (shapes layer non-interactive)
    const layers = stage.find('Layer') as Konva.Layer[]
    expect(layers[1].listening()).toBe(false)
  })

  it('clicking empty canvas during reconnect (free endpoint flow) disconnects and places free', () => {
    // This exercises the reconnect→cancel path for a FREE endpoint
    // (connected endpoints now disconnect immediately on handle click)
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(50, 50, 300, 100, {
      id: 'a1',
      from: null,  // free — will enter reconnect mode
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click the free 'from' handle → enter reconnect mode
    const group = stage.findOne('#a1') as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    act(() => { fromHandle.fire('click', { cancelBubble: false }) })

    // Click empty canvas → commits free position
    stage.setPointersPositions({ x: 80, y: 80 })
    act(() => { stage.fire('click', { target: stage }) })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.from).toBeNull()
    expect(updatedArrow.to).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Regression: native DOM click after anchor click must not cause a second
  // commit — this was the root cause of the "disconnects from first shape" bug.
  // Covers the one-shape scenario specifically reported by the user.
  // ---------------------------------------------------------------------------

  it('connecting free endpoint to an anchor on the only shape does not disconnect the other endpoint', () => {
    // Only ONE shape on the canvas — the exact user-reported scenario
    const ellipse = createEllipseElement({ id: 'e1', x: 200, y: 200, radiusX: 60, radiusY: 40 })
    const e1RightAnchor = getAnchorPoint(ellipse, 'right')

    // Arrow already connected on 'from', free on 'to'
    const arrow = createArrowElement(e1RightAnchor.x, e1RightAnchor.y, 400, 200, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click the free 'to' handle to enter reconnect mode
    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    act(() => { toHandle.fire('click', { cancelBubble: false }) })

    // Click an anchor on the same (and only) shape — bottom anchor
    const e1BottomAnchor = stage.findOne('.anchor-e1-bottom') as Konva.Circle
    act(() => { e1BottomAnchor.fire('click', { cancelBubble: false }) })

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement

    // 'to' must be connected to the bottom anchor of e1
    expect(updated.to).toEqual({ shapeId: 'e1', anchor: 'bottom' })
    // 'from' must still be connected to the right anchor of e1
    expect(updated.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  it('anchor click during reconnect does not fire a second commit via native DOM event (anchorCommittedRef guard)', () => {
    // This test exercises the guard that swallows the native DOM click event
    // that fires on <canvas> even after Konva's cancelBubble=true stops
    // Konva-level propagation — the root cause of the one-shape disconnect bug.
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const ellipse2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(ellipse2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Enter reconnect mode for the free 'to' endpoint
    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    act(() => { toHandle.fire('click', { cancelBubble: false }) })

    // Simulate the anchor click followed immediately by the native DOM click
    // (which is what happens in the real browser)
    const e2LeftAnchor = stage.findOne('.anchor-e2-left') as Konva.Circle
    act(() => {
      // 1. Konva anchor click — commits and sets anchorCommittedRef
      e2LeftAnchor.fire('click', { cancelBubble: false })
      // 2. Native DOM click reaches the stage — must be swallowed by the guard
      stage.fire('click', { target: stage })
    })

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    // 'to' must be connected — not disconnected by the native DOM click
    expect(updated.to).toEqual({ shapeId: 'e2', anchor: 'left' })
    // 'from' must be unchanged
    expect(updated.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  // ---------------------------------------------------------------------------
  // Arrow drag-end snap to anchor
  // ---------------------------------------------------------------------------

  it('snaps the free endpoint to a shape anchor when the arrow is dragged near it', () => {
    // Arrow: from=free, to=free — dragged so that the 'to' endpoint lands near e1's left anchor
    const ellipse = createEllipseElement({ id: 'e1', x: 300, y: 200, radiusX: 50, radiusY: 30 })
    // left anchor of e1: x=250, y=200

    // Arrow starting far from any shape
    const arrow = createArrowElement(50, 50, 100, 100, { id: 'a1', from: null, to: null })

    useCanvasStore.getState().addElement(ellipse)
    useCanvasStore.getState().addElement(arrow)

    const { stage } = renderCanvas()

    // Simulate dragend: group offset puts the 'to' endpoint at (248, 199) —
    // within 20px of e1's left anchor at (250, 200)
    const group = stage.findOne('#a1') as Konva.Group
    // dx = 248 - 100 = 148, dy = 199 - 100 = 99
    group.position({ x: 148, y: 99 })
    act(() => { group.fire('dragend') })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement

    // 'to' should have snapped to e1's left anchor
    expect(updatedArrow.to).toEqual({ shapeId: 'e1', anchor: 'left' })
    // 'from' should remain free
    expect(updatedArrow.from).toBeNull()
  })

  it('does not snap when the free endpoint lands outside the snap radius', () => {
    const ellipse = createEllipseElement({ id: 'e1', x: 300, y: 200, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(50, 50, 100, 100, { id: 'a1', from: null, to: null })

    useCanvasStore.getState().addElement(ellipse)
    useCanvasStore.getState().addElement(arrow)

    const { stage } = renderCanvas()

    // 'to' would land at (150, 150) — far from any anchor
    const group = stage.findOne('#a1') as Konva.Group
    group.position({ x: 50, y: 50 })
    act(() => { group.fire('dragend') })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.to).toBeNull()
    expect(updatedArrow.from).toBeNull()
    // Points should be updated to the dragged position
    expect(updatedArrow.points[2]).toBe(150)
    expect(updatedArrow.points[3]).toBe(150)
  })

  it('snaps a partially-connected arrow free endpoint to a new shape anchor on drag', () => {
    const ellipse1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const ellipse2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    // left anchor of e2: x=350, y=100

    // Arrow: from=e1.right (at x=150, y=100), to=free at (200, 100)
    const arrow = createArrowElement(150, 100, 200, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse1)
    useCanvasStore.getState().addElement(ellipse2)
    useCanvasStore.getState().addElement(arrow)

    const { stage } = renderCanvas()

    // Drag: dx=149, dy=0 → free 'to' endpoint moves to (200+149, 100) = (349, 100)
    // e2 left anchor is at (350, 100) — within 20px snap radius
    const group = stage.findOne('#a1') as Konva.Group
    group.position({ x: 149, y: 0 })
    act(() => { group.fire('dragend') })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement

    // Free 'to' endpoint should have snapped to e2's left anchor
    expect(updatedArrow.to).toEqual({ shapeId: 'e2', anchor: 'left' })
    // Existing 'from' connection must be preserved
    expect(updatedArrow.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  // ---------------------------------------------------------------------------
  // Anchor hint when a partially-connected arrow is selected
  // ---------------------------------------------------------------------------

  it('shows anchor circles on shapes when a partially-connected arrow is selected', () => {
    const ellipse = createEllipseElement({ id: 'e1', x: 200, y: 200, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(250, 200, 400, 200, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,  // one free endpoint — partial arrow
    })

    useCanvasStore.getState().addElement(ellipse)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // AnchorPoints circles should be visible (4 per non-arrow shape)
    const circles = stage.find('Circle') as Konva.Circle[]
    // Filter to anchor circles (not endpoint handles)
    const anchorCircles = circles.filter((c) => c.name().startsWith('anchor-'))
    expect(anchorCircles.length).toBeGreaterThanOrEqual(4)
  })

  it('does NOT show anchor circles when a fully-connected arrow is selected', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 350, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: { shapeId: 'e2', anchor: 'left' },
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(e2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    const anchorCircles = (stage.find('Circle') as Konva.Circle[])
      .filter((c) => c.name().startsWith('anchor-'))
    expect(anchorCircles).toHaveLength(0)
  })

  it('does NOT show anchor circles when a non-arrow element is selected', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0 })
    useCanvasStore.getState().addElement(rect)
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    const { stage } = renderCanvas()

    const anchorCircles = (stage.find('Circle') as Konva.Circle[])
      .filter((c) => c.name().startsWith('anchor-'))
    expect(anchorCircles).toHaveLength(0)
  })

  it('shapes layer stays interactive when a partially-connected arrow is selected (no active drawing)', () => {
    const ellipse = createEllipseElement({ id: 'e1', x: 200, y: 200, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(250, 200, 400, 200, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(ellipse)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Shapes layer must remain interactive — user should still be able to click shapes
    const layers = stage.find('Layer') as Konva.Layer[]
    expect(layers[1].listening()).toBe(true)
  })

  it('clicking an anchor hint directly connects the free endpoint without entering reconnect mode', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(e2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click the left anchor of e2 directly (passive hint mode)
    const e2LeftAnchor = stage.findOne('.anchor-e2-left') as Konva.Circle
    act(() => { e2LeftAnchor.fire('click', { cancelBubble: false }) })

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    // Free 'to' endpoint should now be connected to e2
    expect(updated.to).toEqual({ shapeId: 'e2', anchor: 'left' })
    // 'from' must remain unchanged
    expect(updated.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  // ---------------------------------------------------------------------------
  // Endpoint handle drag — Whimsical-style stretch to connect
  // ---------------------------------------------------------------------------

  it('dragging a free endpoint handle and dropping near an anchor snaps and connects', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    // left anchor of e2: x=350, y=100

    const arrow = createArrowElement(150, 100, 200, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(e2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Drag the free 'to' handle to near e2's left anchor (350, 100)
    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    toHandle.position({ x: 352, y: 101 }) // within 20px snap radius
    act(() => { toHandle.fire('dragend') })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    // Should snap to e2's left anchor
    expect(updatedArrow.to).toEqual({ shapeId: 'e2', anchor: 'left' })
    // 'from' must be preserved
    expect(updatedArrow.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  it('dragging a free endpoint handle and dropping away from anchors leaves it free', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 200, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    const group = stage.findOne('#a1') as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    // Drop far from any anchor
    toHandle.position({ x: 600, y: 400 })
    act(() => { toHandle.fire('dragend') })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.to).toBeNull()
    // Points updated to the drop position
    expect(updatedArrow.points[2]).toBeCloseTo(600)
    expect(updatedArrow.points[3]).toBeCloseTo(400)
    // 'from' must be preserved
    expect(updatedArrow.from).toEqual({ shapeId: 'e1', anchor: 'right' })
  })

  // ---------------------------------------------------------------------------
  // Dismiss anchor hint on click-off
  // ---------------------------------------------------------------------------

  it('clicking empty canvas when a partial arrow is selected deselects and hides anchors', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Confirm anchors are visible while partial arrow is selected
    const anchorsBefore = (stage.find('Circle') as Konva.Circle[])
      .filter((c) => c.name().startsWith('anchor-'))
    expect(anchorsBefore.length).toBeGreaterThan(0)

    // Click empty canvas — should deselect
    act(() => { stage.fire('click', { target: stage }) })

    expect(useCanvasStore.getState().selectedIds.size).toBe(0)

    // After deselect, re-render and check anchors are gone
    const anchorsAfter = (stage.find('Circle') as Konva.Circle[])
      .filter((c) => c.name().startsWith('anchor-'))
    expect(anchorsAfter).toHaveLength(0)
  })

  it('clicking a different shape when a partial arrow is selected deselects the arrow', () => {
    const e1 = createEllipseElement({ id: 'e1', x: 100, y: 100, radiusX: 50, radiusY: 30 })
    const e2 = createEllipseElement({ id: 'e2', x: 400, y: 100, radiusX: 50, radiusY: 30 })
    const arrow = createArrowElement(150, 100, 300, 100, {
      id: 'a1',
      from: { shapeId: 'e1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(e1)
    useCanvasStore.getState().addElement(e2)
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    const { stage } = renderCanvas()

    // Click e2 — shapes layer is still interactive in passive mode
    const e2Group = stage.findOne('#e2') as Konva.Group
    act(() => { e2Group.fire('click', { cancelBubble: false }) })

    // Selection should switch to e2, not the arrow
    expect(useCanvasStore.getState().selectedIds.has('e2')).toBe(true)

    // Anchor circles should be gone (no longer a partial arrow selected)
    const anchorsAfter = (stage.find('Circle') as Konva.Circle[])
      .filter((c) => c.name().startsWith('anchor-'))
    expect(anchorsAfter).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Marquee (rubber-band) selection
  // ---------------------------------------------------------------------------

  it('dragging on empty canvas selects all overlapping elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 50, y: 50, width: 80, height: 60 }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2', x: 300, y: 300, width: 80, height: 60 }))
    const { stage } = renderCanvas()

    // Drag from (0, 0) to (200, 200) — should cover r1 but not r2
    stage.setPointersPositions({ clientX: 0, clientY: 0 })
    act(() => { stage.fire('mousedown', { target: stage }) })

    stage.setPointersPositions({ clientX: 200, clientY: 200 })
    act(() => { stage.fire('mousemove') })

    act(() => { stage.fire('mouseup') })

    const ids = useCanvasStore.getState().selectedIds
    expect(ids.has('r1')).toBe(true)
    expect(ids.has('r2')).toBe(false)
  })

  it('dragging over multiple elements selects them all', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 50, y: 50, width: 80, height: 60 }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1', x: 200, y: 200, radiusX: 40, radiusY: 30 }))
    const { stage } = renderCanvas()

    // Drag from (0, 0) to (400, 400) — covers both r1 and e1
    stage.setPointersPositions({ clientX: 0, clientY: 0 })
    act(() => { stage.fire('mousedown', { target: stage }) })

    stage.setPointersPositions({ clientX: 400, clientY: 400 })
    act(() => { stage.fire('mousemove') })

    act(() => { stage.fire('mouseup') })

    const ids = useCanvasStore.getState().selectedIds
    expect(ids.has('r1')).toBe(true)
    expect(ids.has('e1')).toBe(true)
  })

  it('a tiny drag (less than 4px) does not trigger marquee selection', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 50, y: 50, width: 80, height: 60 }))
    const { stage } = renderCanvas()

    stage.setPointersPositions({ clientX: 0, clientY: 0 })
    act(() => { stage.fire('mousedown', { target: stage }) })

    stage.setPointersPositions({ clientX: 2, clientY: 2 })
    act(() => { stage.fire('mousemove') })

    act(() => { stage.fire('mouseup') })

    // No marquee selection should have happened
    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  it('dragging on empty area with no elements clears the selection', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 500, y: 500, width: 80, height: 60 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })
    const { stage } = renderCanvas()

    // Drag over the top-left corner — no elements there
    stage.setPointersPositions({ clientX: 0, clientY: 0 })
    act(() => { stage.fire('mousedown', { target: stage }) })

    stage.setPointersPositions({ clientX: 200, clientY: 200 })
    act(() => { stage.fire('mousemove') })

    act(() => { stage.fire('mouseup') })

    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  it('mousedown on a shape (not the stage) does not start marquee', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 50, y: 50, width: 80, height: 60 }))
    const { stage } = renderCanvas()

    const group = stage.findOne('#r1') as Konva.Group
    // Fire mousedown with target = the shape group (not the stage)
    stage.setPointersPositions({ clientX: 90, clientY: 80 })
    act(() => { stage.fire('mousedown', { target: group }) })

    stage.setPointersPositions({ clientX: 400, clientY: 400 })
    act(() => { stage.fire('mousemove') })

    act(() => { stage.fire('mouseup') })

    // Should NOT have selected r1 via marquee (shape click handler would, but not marquee)
    // The important thing is no marquee selection overrides a shape drag
    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  // ---------------------------------------------------------------------------
  // Multi-selection drag — move all selected elements together
  // ---------------------------------------------------------------------------

  it('dragging one element in a multi-selection moves all selected elements by the same delta', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2', x: 100, y: 100 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1', 'r2']) })
    const { stage } = renderCanvas()

    // Drag r1 from (0,0) to (50, 60)
    const group1 = stage.findOne('#r1') as Konva.Group
    act(() => {
      group1.position({ x: 50, y: 60 })
      group1.fire('dragend')
    })

    const els = useCanvasStore.getState().elements
    const el1 = els.find((e) => e.id === 'r1')!
    const el2 = els.find((e) => e.id === 'r2')!

    // r1 moved to (50, 60) — delta is (+50, +60)
    expect(el1.x).toBe(50)
    expect(el1.y).toBe(60)
    // r2 should also move by (+50, +60) — from (100, 100) to (150, 160)
    expect(el2.x).toBe(150)
    expect(el2.y).toBe(160)
  })

  it('dragging an unselected element does not move other selected elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2', x: 100, y: 100 }))
    // Only r2 is selected; dragging r1 (unselected)
    useCanvasStore.setState({ selectedIds: new Set(['r2']) })
    const { stage } = renderCanvas()

    const group1 = stage.findOne('#r1') as Konva.Group
    act(() => {
      group1.position({ x: 50, y: 60 })
      group1.fire('dragend')
    })

    const els = useCanvasStore.getState().elements
    const el1 = els.find((e) => e.id === 'r1')!
    const el2 = els.find((e) => e.id === 'r2')!

    // r1 moved normally
    expect(el1.x).toBe(50)
    expect(el1.y).toBe(60)
    // r2 is selected but was NOT dragged — it stays at (100, 100)
    expect(el2.x).toBe(100)
    expect(el2.y).toBe(100)
  })

  it('dragging a single selected element moves only that element', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2', x: 100, y: 100 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })
    const { stage } = renderCanvas()

    const group1 = stage.findOne('#r1') as Konva.Group
    act(() => {
      group1.position({ x: 50, y: 60 })
      group1.fire('dragend')
    })

    const els = useCanvasStore.getState().elements
    const el1 = els.find((e) => e.id === 'r1')!
    const el2 = els.find((e) => e.id === 'r2')!

    expect(el1.x).toBe(50)
    expect(el1.y).toBe(60)
    // r2 is not selected — stays put
    expect(el2.x).toBe(100)
    expect(el2.y).toBe(100)
  })
})
