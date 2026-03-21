import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from './canvasStore'
import { createRectElement, createEllipseElement, createArrowElement } from '@/lib/shapes'
import type { ArrowElement } from '@/types/shapes'

// ---------------------------------------------------------------------------
// Helpers — reset store state between tests
// ---------------------------------------------------------------------------

function resetStore() {
  useCanvasStore.setState({
    elements: [],
    selectedId: null,
    activeTool: null,
  })
}

// ---------------------------------------------------------------------------
// addElement
// ---------------------------------------------------------------------------

describe('addElement', () => {
  beforeEach(resetStore)

  it('adds an element to an empty canvas', () => {
    const el = createRectElement({ id: 'r1' })
    useCanvasStore.getState().addElement(el)
    expect(useCanvasStore.getState().elements).toHaveLength(1)
    expect(useCanvasStore.getState().elements[0].id).toBe('r1')
  })

  it('appends subsequent elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1' }))
    expect(useCanvasStore.getState().elements).toHaveLength(2)
    expect(useCanvasStore.getState().elements[1].id).toBe('e1')
  })

  it('does not change selectedId', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    expect(useCanvasStore.getState().selectedId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// addElementAt
// ---------------------------------------------------------------------------

describe('addElementAt', () => {
  beforeEach(resetStore)

  it('creates a rect element at the given position', () => {
    useCanvasStore.getState().addElementAt('rect', 100, 200)
    const elements = useCanvasStore.getState().elements
    expect(elements).toHaveLength(1)
    expect(elements[0].type).toBe('rect')
    expect(elements[0].x).toBe(100)
    expect(elements[0].y).toBe(200)
  })

  it('creates an ellipse element', () => {
    useCanvasStore.getState().addElementAt('ellipse', 0, 0)
    expect(useCanvasStore.getState().elements[0].type).toBe('ellipse')
  })

  it('creates a line element', () => {
    useCanvasStore.getState().addElementAt('line', 0, 0)
    expect(useCanvasStore.getState().elements[0].type).toBe('line')
  })

  it('auto-selects the new element', () => {
    useCanvasStore.getState().addElementAt('rect', 0, 0)
    const { selectedId, elements } = useCanvasStore.getState()
    expect(selectedId).toBe(elements[0].id)
  })

  it('resets activeTool to null after placing', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    useCanvasStore.getState().addElementAt('rect', 0, 0)
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateElement
// ---------------------------------------------------------------------------

describe('updateElement', () => {
  beforeEach(resetStore)

  it('updates position of an existing element', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.getState().updateElement({ id: 'r1', x: 50, y: 75 })
    const el = useCanvasStore.getState().elements[0]
    expect(el.x).toBe(50)
    expect(el.y).toBe(75)
  })

  it('preserves fields not included in the update', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', fill: '#red' }))
    useCanvasStore.getState().updateElement({ id: 'r1', x: 10 })
    const el = useCanvasStore.getState().elements[0]
    expect(el.fill).toBe('#red')
  })

  it('is a no-op for an unknown id', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().updateElement({ id: 'unknown', x: 99 })
    expect(useCanvasStore.getState().elements[0].x).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// removeElement
// ---------------------------------------------------------------------------

describe('removeElement', () => {
  beforeEach(resetStore)

  it('removes the element with the given id', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1' }))
    useCanvasStore.getState().removeElement('r1')
    const elements = useCanvasStore.getState().elements
    expect(elements).toHaveLength(1)
    expect(elements[0].id).toBe('e1')
  })

  it('clears selectedId when the selected element is removed', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ selectedId: 'r1' })
    useCanvasStore.getState().removeElement('r1')
    expect(useCanvasStore.getState().selectedId).toBeNull()
  })

  it('preserves selectedId when a different element is removed', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1' }))
    useCanvasStore.setState({ selectedId: 'e1' })
    useCanvasStore.getState().removeElement('r1')
    expect(useCanvasStore.getState().selectedId).toBe('e1')
  })

  it('is a no-op for an unknown id', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().removeElement('unknown')
    expect(useCanvasStore.getState().elements).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// selectElement / clearSelection
// ---------------------------------------------------------------------------

describe('selectElement', () => {
  beforeEach(resetStore)

  it('sets selectedId to the given id', () => {
    useCanvasStore.getState().selectElement('r1')
    expect(useCanvasStore.getState().selectedId).toBe('r1')
  })

  it('can select null to deselect', () => {
    useCanvasStore.setState({ selectedId: 'r1' })
    useCanvasStore.getState().selectElement(null)
    expect(useCanvasStore.getState().selectedId).toBeNull()
  })
})

describe('clearSelection', () => {
  beforeEach(resetStore)

  it('resets selectedId to null', () => {
    useCanvasStore.setState({ selectedId: 'r1' })
    useCanvasStore.getState().clearSelection()
    expect(useCanvasStore.getState().selectedId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setActiveTool
// ---------------------------------------------------------------------------

describe('setActiveTool', () => {
  beforeEach(resetStore)

  it('sets the active tool', () => {
    useCanvasStore.getState().setActiveTool('ellipse')
    expect(useCanvasStore.getState().activeTool).toBe('ellipse')
  })

  it('can clear the active tool', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    useCanvasStore.getState().setActiveTool(null)
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// bringToFront / sendToBack
// ---------------------------------------------------------------------------

describe('bringToFront', () => {
  beforeEach(resetStore)

  it('moves element to the top of z-order', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'a' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'b' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'c' }))
    useCanvasStore.getState().bringToFront('a')
    const elements = useCanvasStore.getState().elements
    expect(elements[elements.length - 1].id).toBe('a')
  })
})

describe('sendToBack', () => {
  beforeEach(resetStore)

  it('moves element to the bottom of z-order', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'a' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'b' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'c' }))
    useCanvasStore.getState().sendToBack('c')
    expect(useCanvasStore.getState().elements[0].id).toBe('c')
  })
})

// ---------------------------------------------------------------------------
// getElementById
// ---------------------------------------------------------------------------

describe('getElementById', () => {
  beforeEach(resetStore)

  it('returns the element with the given id', () => {
    const el = createRectElement({ id: 'r1' })
    useCanvasStore.getState().addElement(el)
    expect(useCanvasStore.getState().getElementById('r1')).toEqual(el)
  })

  it('returns undefined for unknown ids', () => {
    expect(useCanvasStore.getState().getElementById('unknown')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// clearCanvas
// ---------------------------------------------------------------------------

describe('clearCanvas', () => {
  beforeEach(resetStore)

  it('removes all elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createEllipseElement({ id: 'e1' }))
    useCanvasStore.getState().clearCanvas()
    expect(useCanvasStore.getState().elements).toHaveLength(0)
  })

  it('resets selectedId', () => {
    useCanvasStore.setState({ selectedId: 'r1' })
    useCanvasStore.getState().clearCanvas()
    expect(useCanvasStore.getState().selectedId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateArrowConnections
// ---------------------------------------------------------------------------

describe('updateArrowConnections', () => {
  beforeEach(resetStore)

  it('recomputes points of an arrow connected to the moved shape', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(50, 60, 300, 300, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'bottom' },
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    // Move the rect
    useCanvasStore.getState().updateElement({ id: 'r1', x: 200, y: 100 })

    const updatedArrow = useCanvasStore
      .getState()
      .elements.find((el) => el.id === 'a1') as ArrowElement

    // After move: rect bottom anchor = (200 + 50, 100 + 60) = (250, 160)
    expect(updatedArrow.points[0]).toBe(250)
    expect(updatedArrow.points[1]).toBe(160)
  })

  it('does not modify arrows unconnected to the moved shape', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const unrelatedArrow = createArrowElement(0, 0, 50, 50, {
      id: 'a1',
      from: null,
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(unrelatedArrow)

    useCanvasStore.getState().updateElement({ id: 'r1', x: 500 })

    const arrow = useCanvasStore
      .getState()
      .elements.find((el) => el.id === 'a1') as ArrowElement
    expect(arrow.points).toEqual([0, 0, 50, 50])
  })

  it('updateArrowConnections action directly recomputes connected arrows', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(50, 60, 300, 300, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    // Manually move the rect in state without going through updateElement
    useCanvasStore.setState((s) => ({
      elements: s.elements.map((el) => el.id === 'r1' ? { ...el, x: 100 } : el),
    }))

    useCanvasStore.getState().updateArrowConnections('r1')

    const updatedArrow = useCanvasStore
      .getState()
      .elements.find((el) => el.id === 'a1') as ArrowElement

    // right anchor of rect at x=100, y=0, w=100, h=60 → (200, 30)
    expect(updatedArrow.points[0]).toBe(200)
    expect(updatedArrow.points[1]).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// reconnectArrowEndpoint
// ---------------------------------------------------------------------------

describe('reconnectArrowEndpoint', () => {
  beforeEach(resetStore)

  it('snaps the "to" endpoint to an anchor', () => {
    const rect = createRectElement({ id: 'r2', x: 200, y: 50, width: 100, height: 60 })
    const arrow = createArrowElement(0, 0, 50, 50, { id: 'a1', from: null, to: null })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    useCanvasStore.getState().reconnectArrowEndpoint(
      'a1', 'to', { shapeId: 'r2', anchor: 'left' },
    )

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updated.to).toEqual({ shapeId: 'r2', anchor: 'left' })
    // left anchor of r2: x=200, y=50+30=80
    expect(updated.points[2]).toBe(200)
    expect(updated.points[3]).toBe(80)
  })

  it('snaps the "from" endpoint to an anchor', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(50, 50, 300, 300, { id: 'a1', from: null, to: null })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    useCanvasStore.getState().reconnectArrowEndpoint(
      'a1', 'from', { shapeId: 'r1', anchor: 'right' },
    )

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updated.from).toEqual({ shapeId: 'r1', anchor: 'right' })
    // right anchor of r1: x=100, y=30
    expect(updated.points[0]).toBe(100)
    expect(updated.points[1]).toBe(30)
  })

  it('disconnects the "to" endpoint and moves it to freePoint', () => {
    const rect = createRectElement({ id: 'r2', x: 200, y: 50, width: 100, height: 60 })
    const arrow = createArrowElement(0, 0, 200, 80, {
      id: 'a1',
      from: null,
      to: { shapeId: 'r2', anchor: 'left' },
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    useCanvasStore.getState().reconnectArrowEndpoint('a1', 'to', null, { x: 400, y: 300 })

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updated.to).toBeNull()
    expect(updated.points[2]).toBe(400)
    expect(updated.points[3]).toBe(300)
  })

  it('disconnects the "from" endpoint and moves it to freePoint', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(100, 30, 300, 300, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    useCanvasStore.getState().reconnectArrowEndpoint('a1', 'from', null, { x: 10, y: 10 })

    const updated = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updated.from).toBeNull()
    expect(updated.points[0]).toBe(10)
    expect(updated.points[1]).toBe(10)
  })

  it('is a no-op when the arrow id does not exist', () => {
    useCanvasStore.getState().reconnectArrowEndpoint('nonexistent', 'to', null)
    expect(useCanvasStore.getState().elements).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// liveUpdateArrowConnections
// ---------------------------------------------------------------------------

describe('liveUpdateArrowConnections', () => {
  beforeEach(resetStore)

  it('recomputes arrow points using the live position without updating the shape x/y in the store', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(100, 30, 300, 300, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    // Simulate dragging r1 to (200, 100) without committing to the store
    useCanvasStore.getState().liveUpdateArrowConnections('r1', { x: 200, y: 100 })

    const state = useCanvasStore.getState()

    // Arrow points must reflect the live position: right anchor of rect at x=200, y=100, w=100, h=60 → (300, 130)
    const updatedArrow = state.elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.points[0]).toBe(300)
    expect(updatedArrow.points[1]).toBe(130)

    // Shape's stored x/y must NOT have changed
    const shape = state.elements.find((el) => el.id === 'r1')!
    expect(shape.x).toBe(0)
    expect(shape.y).toBe(0)
  })

  it('is a no-op when no arrows are connected to the shape', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(0, 0, 50, 50, { id: 'a1', from: null, to: null })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    const before = useCanvasStore.getState().elements
    useCanvasStore.getState().liveUpdateArrowConnections('r1', { x: 999, y: 999 })
    const after = useCanvasStore.getState().elements

    // Elements must be reference-equal (no state update triggered)
    expect(after).toBe(before)
  })

  it('updates arrows connected on "to" endpoint during live drag', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(0, 0, 50, 30, {
      id: 'a1',
      from: null,
      to: { shapeId: 'r1', anchor: 'left' },
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    // left anchor of rect at x=100, y=50, w=100, h=60 → (100, 80)
    useCanvasStore.getState().liveUpdateArrowConnections('r1', { x: 100, y: 50 })

    const updatedArrow = useCanvasStore.getState().elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.points[2]).toBe(100)
    expect(updatedArrow.points[3]).toBe(80)
  })

  it('shape x/y in the store is committed correctly by a subsequent updateElement call', () => {
    const rect = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
    const arrow = createArrowElement(100, 30, 300, 300, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })

    useCanvasStore.getState().addElement(rect)
    useCanvasStore.getState().addElement(arrow)

    // Live update during drag (does not commit shape position)
    useCanvasStore.getState().liveUpdateArrowConnections('r1', { x: 200, y: 100 })

    // DragEnd commits the final position
    useCanvasStore.getState().updateElement({ id: 'r1', x: 200, y: 100 })

    const state = useCanvasStore.getState()
    const shape = state.elements.find((el) => el.id === 'r1')!
    expect(shape.x).toBe(200)
    expect(shape.y).toBe(100)

    // Arrow should still be correctly routed
    const updatedArrow = state.elements.find((el) => el.id === 'a1') as ArrowElement
    expect(updatedArrow.points[0]).toBe(300)
    expect(updatedArrow.points[1]).toBe(130)
  })
})
