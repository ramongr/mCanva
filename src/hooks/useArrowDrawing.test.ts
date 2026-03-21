import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useArrowDrawing } from './useArrowDrawing'
import type { WireframeElement } from '@/types/shapes'

function setup(onAddArrow = vi.fn()) {
  const { result, rerender } = renderHook(
    ({ cb }) => useArrowDrawing({ onAddArrow: cb }),
    { initialProps: { cb: onAddArrow } },
  )
  return { result, rerender, onAddArrow }
}

describe('useArrowDrawing', () => {
  it('starts in idle phase', () => {
    const { result } = setup()
    expect(result.current.phase).toBe('idle')
    expect(result.current.startPoint).toBeNull()
    expect(result.current.previewEnd).toBeNull()
    expect(result.current.hoveredAnchor).toBeNull()
  })

  it('transitions to drawing on first click', () => {
    const { result } = setup()
    act(() => {
      result.current.handleCanvasClick(100, 150)
    })
    expect(result.current.phase).toBe('drawing')
    expect(result.current.startPoint).toEqual({ x: 100, y: 150 })
    expect(result.current.previewEnd).toEqual({ x: 100, y: 150 })
    expect(result.current.startConnection).toBeNull()
  })

  it('records start connection when first click hits an anchor', () => {
    const { result } = setup()
    const connection = { shapeId: 'r1', anchor: 'right' as const }
    act(() => {
      result.current.handleCanvasClick(200, 100, connection)
    })
    expect(result.current.startConnection).toEqual(connection)
  })

  it('transitions to idle and calls onAddArrow on second click', () => {
    const { result, onAddArrow } = setup()
    act(() => {
      result.current.handleCanvasClick(10, 20)
    })
    act(() => {
      result.current.handleCanvasClick(150, 80)
    })
    expect(result.current.phase).toBe('idle')
    expect(onAddArrow).toHaveBeenCalledOnce()
    const arrow = onAddArrow.mock.calls[0][0] as WireframeElement
    expect(arrow.type).toBe('arrow')
  })

  it('creates arrow with to connection when second click hits an anchor', () => {
    const { result, onAddArrow } = setup()
    act(() => {
      result.current.handleCanvasClick(10, 20)
    })
    const toConnection = { shapeId: 'r2', anchor: 'left' as const }
    act(() => {
      result.current.handleCanvasClick(200, 80, toConnection)
    })
    const arrow = onAddArrow.mock.calls[0][0] as WireframeElement & { to: typeof toConnection }
    expect(arrow.to).toEqual(toConnection)
  })

  it('creates arrow with from connection when both endpoints are connected', () => {
    const { result, onAddArrow } = setup()
    const fromConnection = { shapeId: 'r1', anchor: 'right' as const }
    const toConnection = { shapeId: 'r2', anchor: 'left' as const }
    act(() => {
      result.current.handleCanvasClick(10, 20, fromConnection)
    })
    act(() => {
      result.current.handleCanvasClick(200, 80, toConnection)
    })
    const arrow = onAddArrow.mock.calls[0][0] as WireframeElement & {
      from: typeof fromConnection
      to: typeof toConnection
    }
    expect(arrow.from).toEqual(fromConnection)
    expect(arrow.to).toEqual(toConnection)
  })

  it('updates previewEnd on mouse move while drawing', () => {
    const { result } = setup()
    act(() => {
      result.current.handleCanvasClick(0, 0)
    })
    act(() => {
      result.current.handleMouseMove(55, 77)
    })
    expect(result.current.previewEnd).toEqual({ x: 55, y: 77 })
  })

  it('does not update previewEnd on mouse move while idle', () => {
    const { result } = setup()
    act(() => {
      result.current.handleMouseMove(55, 77)
    })
    expect(result.current.previewEnd).toBeNull()
  })

  it('updates hoveredAnchor on mouse move with anchor hit', () => {
    const { result } = setup()
    const connection = { shapeId: 'r1', anchor: 'top' as const }
    act(() => {
      result.current.handleCanvasClick(0, 0)
    })
    act(() => {
      result.current.handleMouseMove(50, 50, connection)
    })
    expect(result.current.hoveredAnchor).toEqual(connection)
  })

  it('resets hoveredAnchor to null when no anchor is hit on move', () => {
    const { result } = setup()
    act(() => {
      result.current.handleCanvasClick(0, 0)
    })
    act(() => {
      result.current.handleMouseMove(50, 50, { shapeId: 'r1', anchor: 'top' })
    })
    act(() => {
      result.current.handleMouseMove(500, 500)
    })
    expect(result.current.hoveredAnchor).toBeNull()
  })

  it('cancel resets to idle', () => {
    const { result } = setup()
    act(() => {
      result.current.handleCanvasClick(10, 20)
    })
    act(() => {
      result.current.cancel()
    })
    expect(result.current.phase).toBe('idle')
    expect(result.current.startPoint).toBeNull()
    expect(result.current.previewEnd).toBeNull()
  })

  it('setHoveredAnchor updates hoveredAnchor state', () => {
    const { result } = setup()
    const connection = { shapeId: 'r1', anchor: 'bottom' as const }
    act(() => {
      result.current.setHoveredAnchor(connection)
    })
    expect(result.current.hoveredAnchor).toEqual(connection)
  })

  // -------------------------------------------------------------------------
  // Stale-closure regression: onAddArrow must always be the latest version
  // even when it changes between the first click (idle→drawing) and the
  // second click (drawing→idle). This is what the useRef fix ensures.
  // -------------------------------------------------------------------------

  it('calls the latest onAddArrow even when it is replaced between clicks', () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()

    const { result, rerender } = renderHook(
      ({ cb }) => useArrowDrawing({ onAddArrow: cb }),
      { initialProps: { cb: firstCallback } },
    )

    // First click — start drawing with the first callback
    act(() => {
      result.current.handleCanvasClick(0, 0)
    })
    expect(result.current.phase).toBe('drawing')

    // Swap the callback (simulates Canvas re-rendering with a new closure)
    rerender({ cb: secondCallback })

    // Second click — should call secondCallback (the latest), NOT firstCallback
    act(() => {
      result.current.handleCanvasClick(100, 100)
    })

    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).toHaveBeenCalledOnce()
    const arrow = secondCallback.mock.calls[0][0] as WireframeElement
    expect(arrow.type).toBe('arrow')
  })

  it('resets to idle after onAddArrow is called, regardless of which callback version ran', () => {
    const { result, rerender } = renderHook(
      ({ cb }) => useArrowDrawing({ onAddArrow: cb }),
      { initialProps: { cb: vi.fn() } },
    )

    act(() => { result.current.handleCanvasClick(0, 0) })
    rerender({ cb: vi.fn() }) // swap callback mid-draw

    act(() => { result.current.handleCanvasClick(100, 100) })

    // State machine must return to idle
    expect(result.current.phase).toBe('idle')
    expect(result.current.startPoint).toBeNull()
    expect(result.current.previewEnd).toBeNull()
  })
})
