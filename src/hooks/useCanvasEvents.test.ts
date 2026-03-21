import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanvasEvents } from './useCanvasEvents'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import type { ShapeType } from '@/types/shapes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStage(pointerPos: { x: number; y: number } | null = { x: 100, y: 200 }) {
  return {
    getPointerPosition: vi.fn().mockReturnValue(pointerPos),
  }
}

/**
 * Creates a fake Konva stage click event.
 * When `isStageSelf` is true the target IS the stage object (isStageClick → true).
 */
function makeEvent(
  stage: ReturnType<typeof makeStage>,
  isStageSelf: boolean,
): KonvaEventObject<MouseEvent> {
  const target = isStageSelf
    ? Object.assign(stage, { getStage: vi.fn().mockReturnValue(stage) })
    : { getStage: vi.fn().mockReturnValue(stage) }

  return {
    target: target as unknown as Konva.Node,
    currentTarget: target as unknown as Konva.Node,
    evt: {} as MouseEvent,
    type: 'click',
    cancelBubble: false,
    pointerId: 1,
  } as unknown as KonvaEventObject<MouseEvent>
}

// ---------------------------------------------------------------------------

describe('useCanvasEvents', () => {
  let onAddElement: (type: ShapeType, x: number, y: number) => void
  let onClearSelection: () => void

  beforeEach(() => {
    onAddElement = vi.fn() as unknown as typeof onAddElement
    onClearSelection = vi.fn() as unknown as typeof onClearSelection
  })

  describe('when activeTool is set', () => {
    it('calls onAddElement with tool type and pointer coords', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: 'rect', onAddElement, onClearSelection }),
      )
      const stage = makeStage({ x: 150, y: 250 })
      const e = makeEvent(stage, false)
      result.current.handleStageClick(e)
      expect(onAddElement).toHaveBeenCalledWith('rect', 150, 250)
      expect(onClearSelection).not.toHaveBeenCalled()
    })

    it('calls onAddElement with correct tool type for ellipse', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: 'ellipse', onAddElement, onClearSelection }),
      )
      const stage = makeStage({ x: 10, y: 20 })
      const e = makeEvent(stage, false)
      result.current.handleStageClick(e)
      expect(onAddElement).toHaveBeenCalledWith('ellipse', 10, 20)
    })

    it('calls onAddElement with correct tool type for line', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: 'line', onAddElement, onClearSelection }),
      )
      const stage = makeStage({ x: 5, y: 15 })
      const e = makeEvent(stage, false)
      result.current.handleStageClick(e)
      expect(onAddElement).toHaveBeenCalledWith('line', 5, 15)
    })

    it('does not call onAddElement when pointer position is unavailable', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: 'rect', onAddElement, onClearSelection }),
      )
      const stage = makeStage(null)
      const e = makeEvent(stage, false)
      result.current.handleStageClick(e)
      expect(onAddElement).not.toHaveBeenCalled()
    })
  })

  describe('when activeTool is null (select mode)', () => {
    it('calls onClearSelection when clicking on the stage background', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: null, onAddElement, onClearSelection }),
      )
      const stage = makeStage()
      const e = makeEvent(stage, true)
      result.current.handleStageClick(e)
      expect(onClearSelection).toHaveBeenCalledOnce()
      expect(onAddElement).not.toHaveBeenCalled()
    })

    it('does not call onClearSelection when clicking on a shape', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: null, onAddElement, onClearSelection }),
      )
      const stage = makeStage()
      const e = makeEvent(stage, false)
      result.current.handleStageClick(e)
      expect(onClearSelection).not.toHaveBeenCalled()
    })

    it('does not call onAddElement in select mode', () => {
      const { result } = renderHook(() =>
        useCanvasEvents({ activeTool: null, onAddElement, onClearSelection }),
      )
      const stage = makeStage()
      const e = makeEvent(stage, true)
      result.current.handleStageClick(e)
      expect(onAddElement).not.toHaveBeenCalled()
    })
  })

  describe('handler stability', () => {
    it('returns the same handler reference when deps do not change', () => {
      const { result, rerender } = renderHook(() =>
        useCanvasEvents({ activeTool: null, onAddElement, onClearSelection }),
      )
      const first = result.current.handleStageClick
      rerender()
      expect(result.current.handleStageClick).toBe(first)
    })
  })
})
