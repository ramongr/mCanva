import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useArrowReconnect } from './useArrowReconnect'
import type { ArrowConnection } from '@/types/shapes'

function setup(onReconnect = vi.fn()) {
  const { result, rerender } = renderHook(
    ({ cb }) => useArrowReconnect({ onReconnect: cb }),
    { initialProps: { cb: onReconnect } },
  )
  return { result, rerender, onReconnect }
}

const connA: ArrowConnection = { shapeId: 'r1', anchor: 'right' }
const connB: ArrowConnection = { shapeId: 'r2', anchor: 'left' }

describe('useArrowReconnect', () => {
  it('starts in idle phase', () => {
    const { result } = setup()
    expect(result.current.phase).toBe('idle')
    expect(result.current.session).toBeNull()
    expect(result.current.hoveredAnchor).toBeNull()
  })

  it('transitions to reconnecting on startReconnect', () => {
    const { result } = setup()
    act(() => { result.current.startReconnect('a1', 'to') })
    expect(result.current.phase).toBe('reconnecting')
    expect(result.current.session).toMatchObject({ arrowId: 'a1', endpoint: 'to' })
  })

  it('startReconnect records the correct endpoint', () => {
    const { result } = setup()
    act(() => { result.current.startReconnect('a1', 'from') })
    expect(result.current.session?.endpoint).toBe('from')
  })

  it('commitAnchor calls onReconnect with connection and resets to idle', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'to') })
    act(() => { result.current.commitAnchor(connB, { x: 200, y: 80 }) })

    expect(onReconnect).toHaveBeenCalledWith('a1', 'to', connB, { x: 200, y: 80 })
    expect(result.current.phase).toBe('idle')
    expect(result.current.session).toBeNull()
  })

  it('commitFreePoint calls onReconnect with null connection and resets to idle', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'from') })
    act(() => { result.current.commitFreePoint(50, 75) })

    expect(onReconnect).toHaveBeenCalledWith('a1', 'from', null, { x: 50, y: 75 })
    expect(result.current.phase).toBe('idle')
  })

  it('cancel resets to idle without calling onReconnect', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'to') })
    act(() => { result.current.cancel() })

    expect(onReconnect).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('idle')
    expect(result.current.session).toBeNull()
  })

  it('updatePreview updates previewPoint and hoveredAnchor while reconnecting', () => {
    const { result } = setup()
    act(() => { result.current.startReconnect('a1', 'to') })
    act(() => { result.current.updatePreview(120, 80, connA) })

    expect(result.current.session?.previewPoint).toEqual({ x: 120, y: 80 })
    expect(result.current.hoveredAnchor).toEqual(connA)
  })

  it('updatePreview is a no-op when idle', () => {
    const { result } = setup()
    act(() => { result.current.updatePreview(120, 80, connA) })
    expect(result.current.session).toBeNull()
    expect(result.current.hoveredAnchor).toBeNull()
  })

  it('setHoveredAnchor updates hoveredAnchor directly', () => {
    const { result } = setup()
    act(() => { result.current.setHoveredAnchor(connA) })
    expect(result.current.hoveredAnchor).toEqual(connA)
    act(() => { result.current.setHoveredAnchor(null) })
    expect(result.current.hoveredAnchor).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // onReconnect must be called exactly once — never twice for a single commit
  // ---------------------------------------------------------------------------

  it('commitAnchor calls onReconnect exactly once', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'to') })
    act(() => { result.current.commitAnchor(connB, { x: 200, y: 80 }) })
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('commitFreePoint calls onReconnect exactly once', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'from') })
    act(() => { result.current.commitFreePoint(50, 75) })
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('commitAnchor is a no-op when called again after already committing (session is null)', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'to') })
    act(() => { result.current.commitAnchor(connB, { x: 200, y: 80 }) })
    // session is now null; calling commitAnchor again must not fire onReconnect
    act(() => { result.current.commitAnchor(connA, { x: 100, y: 30 }) })
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('commitFreePoint is a no-op when called again after already committing', () => {
    const onReconnect = vi.fn()
    const { result } = setup(onReconnect)
    act(() => { result.current.startReconnect('a1', 'from') })
    act(() => { result.current.commitFreePoint(50, 75) })
    act(() => { result.current.commitFreePoint(999, 999) })
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // sessionRef stale-closure regression
  // Reproduces: startReconnect sets session, then a re-render happens before
  // commitAnchor fires. commitAnchor must still read the correct arrowId/endpoint
  // from the ref, not a stale closure.
  // ---------------------------------------------------------------------------

  it('commitAnchor reads session from ref — works correctly after a re-render between start and commit', () => {
    const onReconnect = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useArrowReconnect({ onReconnect: cb }),
      { initialProps: { cb: onReconnect } },
    )

    act(() => { result.current.startReconnect('arrow-99', 'to') })

    // Simulate a re-render (e.g. store state change) between startReconnect and commitAnchor
    rerender({ cb: onReconnect })

    act(() => { result.current.commitAnchor(connB, { x: 200, y: 80 }) })

    // Must use the session recorded during startReconnect, not a stale null
    expect(onReconnect).toHaveBeenCalledWith('arrow-99', 'to', connB, { x: 200, y: 80 })
  })

  it('commitFreePoint reads session from ref — works correctly after a re-render', () => {
    const onReconnect = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useArrowReconnect({ onReconnect: cb }),
      { initialProps: { cb: onReconnect } },
    )

    act(() => { result.current.startReconnect('arrow-99', 'from') })
    rerender({ cb: onReconnect })
    act(() => { result.current.commitFreePoint(42, 99) })

    expect(onReconnect).toHaveBeenCalledWith('arrow-99', 'from', null, { x: 42, y: 99 })
  })

  // ---------------------------------------------------------------------------
  // Stale-closure regression: onReconnect ref must always be latest
  // ---------------------------------------------------------------------------

  it('calls the latest onReconnect even when it is replaced before commit', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useArrowReconnect({ onReconnect: cb }),
      { initialProps: { cb: first } },
    )
    act(() => { result.current.startReconnect('a1', 'to') })
    rerender({ cb: second })
    act(() => { result.current.commitAnchor(connB, { x: 200, y: 80 }) })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})
