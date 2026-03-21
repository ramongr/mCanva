/**
 * useArrowDrawing — encapsulates the two-click arrow drawing state machine.
 *
 * State machine:
 *   idle     → handleCanvasClick (with optional anchor) → drawing
 *   drawing  → handleCanvasClick (with optional anchor) → idle (arrow created)
 *   drawing  → handleMouseMove                          → updates preview end
 *   *        → cancel()                                 → idle
 */
import { useState, useCallback, useRef } from 'react'
import type { ArrowConnection } from '@/types/shapes'
import { createArrowElement } from '@/lib/shapes'
import type { WireframeElement } from '@/types/shapes'

export type ArrowDrawingPhase = 'idle' | 'drawing'

export interface UseArrowDrawingOptions {
  /** Called when a complete arrow has been drawn and should be added to the canvas */
  onAddArrow: (element: WireframeElement) => void
}

export interface UseArrowDrawingResult {
  phase: ArrowDrawingPhase
  /** Start point in canvas coordinates (set after first click) */
  startPoint: { x: number; y: number } | null
  /** The connection at the start endpoint (null if start is free) */
  startConnection: ArrowConnection | null
  /** Current cursor/preview end point in canvas coordinates */
  previewEnd: { x: number; y: number } | null
  /** The anchor currently being hovered (for AnchorPoints highlight) */
  hoveredAnchor: ArrowConnection | null
  /** Handle a canvas click (first click = set start, second = finalize) */
  handleCanvasClick: (x: number, y: number, anchorHit?: ArrowConnection) => void
  /** Handle mouse move to update the live preview line */
  handleMouseMove: (x: number, y: number, anchorHit?: ArrowConnection) => void
  /** Cancel drawing and return to idle */
  cancel: () => void
  /** Update the hovered anchor state directly (for AnchorPoints hover) */
  setHoveredAnchor: (anchor: ArrowConnection | null) => void
}

export function useArrowDrawing({ onAddArrow }: UseArrowDrawingOptions): UseArrowDrawingResult {
  // Keep onAddArrow in a ref so handleCanvasClick never goes stale
  const onAddArrowRef = useRef(onAddArrow)
  onAddArrowRef.current = onAddArrow

  const [phase, setPhase] = useState<ArrowDrawingPhase>('idle')
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [startConnection, setStartConnection] = useState<ArrowConnection | null>(null)
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null)
  const [hoveredAnchor, setHoveredAnchor] = useState<ArrowConnection | null>(null)

  const cancel = useCallback(() => {
    setPhase('idle')
    setStartPoint(null)
    setStartConnection(null)
    setPreviewEnd(null)
    setHoveredAnchor(null)
  }, [])

  const handleCanvasClick = useCallback(
    (x: number, y: number, anchorHit?: ArrowConnection) => {
      if (phase === 'idle') {
        // First click — record start
        setPhase('drawing')
        setStartPoint({ x, y })
        setStartConnection(anchorHit ?? null)
        setPreviewEnd({ x, y })
      } else {
        // Second click — finalize arrow
        if (!startPoint) return

        const arrow = createArrowElement(startPoint.x, startPoint.y, x, y, {
          from: startConnection ?? null,
          to: anchorHit ?? null,
        })

        onAddArrowRef.current(arrow)
        cancel()
      }
    },
    [phase, startPoint, startConnection, cancel],
  )

  const handleMouseMove = useCallback(
    (x: number, y: number, anchorHit?: ArrowConnection) => {
      if (phase !== 'drawing') return
      setPreviewEnd({ x, y })
      setHoveredAnchor(anchorHit ?? null)
    },
    [phase],
  )

  return {
    phase,
    startPoint,
    startConnection,
    previewEnd,
    hoveredAnchor,
    handleCanvasClick,
    handleMouseMove,
    cancel,
    setHoveredAnchor,
  }
}
