/**
 * useMarqueeSelection — encapsulates rubber-band selection logic.
 *
 * Handles the drag-to-select interaction where users draw a rectangle
 * on the canvas to select all elements whose bounding boxes intersect it.
 */
import { useState, useCallback, useRef } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { WireframeElement, BoundingBox } from '@/types/shapes'
import { intersectsBoundingBox } from '@/lib/shapes'
import { MIN_MARQUEE_DRAG } from '@/config/constants'

export interface MarqueeState {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export interface UseMarqueeSelectionOptions {
  /** Reference to the Konva Stage */
  stageRef: React.RefObject<Konva.Stage | null>
  /** All elements on the canvas */
  elements: WireframeElement[]
  /** Whether the arrow tool is active (blocks marquee) */
  isArrowTool: boolean
  /** Whether arrow reconnect mode is active (blocks marquee) */
  isReconnecting: boolean
  /** Currently active tool (null = select mode) */
  activeTool: string | null
  /** Called to select elements by their IDs */
  selectElements: (ids: Set<string>) => void
  /** Called to clear all selection */
  clearSelection: () => void
  /** Optional fallback mouse move handler when marquee is not active */
  onMouseMoveFallback?: (e: KonvaEventObject<MouseEvent>) => void
}

export interface UseMarqueeSelectionResult {
  /** Current marquee rectangle state, or null if not dragging */
  marquee: MarqueeState | null
  /** Handler for stage mousedown - starts marquee if conditions are met */
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void
  /** Handler for stage mousemove - updates marquee or delegates to fallback */
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void
  /** Handler for stage mouseup - finalizes selection */
  handleMouseUp: (e: KonvaEventObject<MouseEvent>) => void
}

/**
 * Hook for managing rubber-band (marquee) selection on a canvas.
 *
 * Usage:
 * ```tsx
 * const { marquee, handleMouseDown, handleMouseMove, handleMouseUp } = useMarqueeSelection({
 *   stageRef,
 *   elements,
 *   isArrowTool,
 *   isReconnecting,
 *   activeTool,
 *   selectElements,
 *   clearSelection,
 * })
 *
 * <Stage onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
 *   ...
 *   {marquee && <MarqueeRect marquee={marquee} />}
 * </Stage>
 * ```
 */
export function useMarqueeSelection({
  stageRef,
  elements,
  isArrowTool,
  isReconnecting,
  activeTool,
  selectElements,
  clearSelection,
  onMouseMoveFallback,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionResult {
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  // Ref mirrors state so handlers always read latest value without recreation
  const marqueeRef = useRef<MarqueeState | null>(null)

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only start marquee when: no tool active, clicked on empty canvas (stage target),
      // not in arrow draw/reconnect mode
      if (activeTool) return
      if (isArrowTool || isReconnecting) return
      if (e.target !== stageRef.current) return

      const pos = stageRef.current?.getPointerPosition()
      if (!pos) return

      const m: MarqueeState = {
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      }
      marqueeRef.current = m
      setMarquee(m)
    },
    [activeTool, isArrowTool, isReconnecting, stageRef],
  )

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Update marquee rectangle if active
      if (marqueeRef.current) {
        const pos = stageRef.current?.getPointerPosition()
        if (pos) {
          const m: MarqueeState = {
            ...marqueeRef.current,
            currentX: pos.x,
            currentY: pos.y,
          }
          marqueeRef.current = m
          setMarquee(m)
        }
        return
      }
      // Otherwise delegate to fallback handler (e.g., arrow drawing)
      onMouseMoveFallback?.(e)
    },
    [stageRef, onMouseMoveFallback],
  )

  const handleMouseUp = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      const m = marqueeRef.current
      if (!m) return

      const rect: BoundingBox = {
        x: m.startX,
        y: m.startY,
        width: m.currentX - m.startX,
        height: m.currentY - m.startY,
      }
      marqueeRef.current = null
      setMarquee(null)

      // Only apply selection if the user actually dragged (not just clicked)
      if (Math.abs(rect.width) > MIN_MARQUEE_DRAG || Math.abs(rect.height) > MIN_MARQUEE_DRAG) {
        const hit = elements.filter((el) => intersectsBoundingBox(el, rect))
        if (hit.length > 0) {
          selectElements(new Set(hit.map((el) => el.id)))
        } else {
          clearSelection()
        }
      }
    },
    [elements, selectElements, clearSelection],
  )

  return {
    marquee,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
