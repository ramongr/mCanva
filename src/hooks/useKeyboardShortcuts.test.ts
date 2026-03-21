import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useCanvasStore } from '@/store/canvasStore'
import { createRectElement, createArrowElement } from '@/lib/shapes'

function resetStore() {
  useCanvasStore.setState({
    elements: [],
    selectedIds: new Set(),
    activeTool: null,
  })
}

/** Fire a keydown event on window */
function pressKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
  act(() => { window.dispatchEvent(event) })
}

describe('useKeyboardShortcuts', () => {
  beforeEach(resetStore)

  afterEach(() => {
    // Ensure no stale listeners remain
  })

  it('mounts without errors', () => {
    expect(() => renderHook(() => useKeyboardShortcuts())).not.toThrow()
  })

  // ---------------------------------------------------------------------------
  // Tool activation shortcuts
  // ---------------------------------------------------------------------------

  it('pressing R activates the rect tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('r')
    expect(useCanvasStore.getState().activeTool).toBe('rect')
  })

  it('pressing E activates the ellipse tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('e')
    expect(useCanvasStore.getState().activeTool).toBe('ellipse')
  })

  it('pressing L activates the line tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('l')
    expect(useCanvasStore.getState().activeTool).toBe('line')
  })

  it('pressing A activates the arrow tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('a')
    expect(useCanvasStore.getState().activeTool).toBe('arrow')
  })

  it('pressing R again when rect is already active deactivates the tool', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    renderHook(() => useKeyboardShortcuts())
    pressKey('r')
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('pressing a tool shortcut with Ctrl held does not activate the tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('r', { ctrlKey: true })
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('pressing a tool shortcut with Meta held does not activate the tool', () => {
    renderHook(() => useKeyboardShortcuts())
    pressKey('r', { metaKey: true })
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('ignores key events when focus is in a textarea', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    renderHook(() => useKeyboardShortcuts())
    pressKey('r')

    expect(useCanvasStore.getState().activeTool).toBeNull()
    document.body.removeChild(textarea)
  })

  it('ignores key events when focus is in an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useKeyboardShortcuts())
    pressKey('r')

    expect(useCanvasStore.getState().activeTool).toBeNull()
    document.body.removeChild(input)
  })

  // ---------------------------------------------------------------------------
  // Escape
  // ---------------------------------------------------------------------------

  it('pressing Escape deactivates the active tool', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    renderHook(() => useKeyboardShortcuts())
    pressKey('Escape')
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('pressing Escape calls onCancelArrow if provided', () => {
    const cancel = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onCancelArrow: cancel }))
    pressKey('Escape')
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('pressing Escape does not throw when onCancelArrow is not provided', () => {
    expect(() => {
      renderHook(() => useKeyboardShortcuts())
      pressKey('Escape')
    }).not.toThrow()
  })

  // ---------------------------------------------------------------------------
  // Delete / Backspace
  // ---------------------------------------------------------------------------

  it('pressing Delete removes the selected element', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('Delete')

    expect(useCanvasStore.getState().elements).toHaveLength(0)
    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  it('pressing Backspace removes the selected element', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('Backspace')

    expect(useCanvasStore.getState().elements).toHaveLength(0)
    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  it('pressing Delete removes all elements in a multi-selection', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2' }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r3' }))
    useCanvasStore.setState({ selectedIds: new Set(['r1', 'r2']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('Delete')

    const els = useCanvasStore.getState().elements
    expect(els).toHaveLength(1)
    expect(els[0].id).toBe('r3')
    expect(useCanvasStore.getState().selectedIds.size).toBe(0)
  })

  it('pressing Delete when nothing is selected does nothing', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))

    renderHook(() => useKeyboardShortcuts())
    pressKey('Delete')

    expect(useCanvasStore.getState().elements).toHaveLength(1)
  })

  // ---------------------------------------------------------------------------
  // Ctrl+D / Cmd+D — duplicate
  // ---------------------------------------------------------------------------

  it('Ctrl+D duplicates the selected element with a +20/+20 offset', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 100, y: 100 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { ctrlKey: true })

    const els = useCanvasStore.getState().elements
    expect(els).toHaveLength(2)
    const copy = els.find((e) => e.id !== 'r1')!
    expect(copy).toBeDefined()
    expect((copy as { x: number; y: number }).x).toBe(120)
    expect((copy as { x: number; y: number }).y).toBe(120)
  })

  it('Cmd+D duplicates the selected element (Mac)', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 50, y: 50 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { metaKey: true })

    expect(useCanvasStore.getState().elements).toHaveLength(2)
  })

  it('Ctrl+D selects the newly duplicated elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { ctrlKey: true })

    const ids = useCanvasStore.getState().selectedIds
    // The NEW copy should be selected (not the original)
    expect(ids.has('r1')).toBe(false)
    expect(ids.size).toBe(1)
  })

  it('Ctrl+D duplicates multiple selected elements', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1', x: 0, y: 0 }))
    useCanvasStore.getState().addElement(createRectElement({ id: 'r2', x: 100, y: 100 }))
    useCanvasStore.setState({ selectedIds: new Set(['r1', 'r2']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { ctrlKey: true })

    const els = useCanvasStore.getState().elements
    expect(els).toHaveLength(4)
    // Newly selected IDs should not include original r1/r2
    const ids = useCanvasStore.getState().selectedIds
    expect(ids.has('r1')).toBe(false)
    expect(ids.has('r2')).toBe(false)
    expect(ids.size).toBe(2)
  })

  it('Ctrl+D does nothing when nothing is selected', () => {
    useCanvasStore.getState().addElement(createRectElement({ id: 'r1' }))

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { ctrlKey: true })

    expect(useCanvasStore.getState().elements).toHaveLength(1)
  })

  it('Ctrl+D duplicates arrow elements, preserving connection references', () => {
    const arrow = createArrowElement(0, 0, 100, 100, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })
    useCanvasStore.getState().addElement(arrow)
    useCanvasStore.setState({ selectedIds: new Set(['a1']) })

    renderHook(() => useKeyboardShortcuts())
    pressKey('d', { ctrlKey: true })

    const els = useCanvasStore.getState().elements
    expect(els).toHaveLength(2)
    const copy = els.find((e) => e.id !== 'a1')!
    expect(copy.type).toBe('arrow')
    if (copy.type === 'arrow') {
      expect(copy.from).toEqual({ shapeId: 'r1', anchor: 'right' })
      expect(copy.to).toBeNull()
      // Points offset by +20, +20
      expect(copy.points[0]).toBe(20)
      expect(copy.points[1]).toBe(20)
      expect(copy.points[2]).toBe(120)
      expect(copy.points[3]).toBe(120)
    }
  })

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  it('removes the keydown listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts())
    unmount()

    // After unmount, pressing R should NOT activate the tool
    pressKey('r')
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })
})
