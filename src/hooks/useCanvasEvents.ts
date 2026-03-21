/**
 * useCanvasEvents — encapsulates all stage-level pointer event logic.
 *
 * Returns stable handler callbacks to pass directly to a Konva <Stage>.
 * All side-effects go through the provided action callbacks, keeping this
 * hook decoupled from the store and fully testable via renderHook.
 */
import { useCallback } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { ShapeType } from '@/types/shapes'
import { getStageClickCoords, isStageClick } from '@/lib/stageUtils'

export interface UseCanvasEventsOptions {
  /** The currently active tool (shape to place), or null for select mode */
  activeTool: ShapeType | null
  /** Called when the user places a new shape on the canvas */
  onAddElement: (type: ShapeType, x: number, y: number) => void
  /** Called when the user clicks empty canvas (deselect) */
  onClearSelection: () => void
}

export interface CanvasEventHandlers {
  handleStageClick: (e: KonvaEventObject<MouseEvent>) => void
}

export function useCanvasEvents({
  activeTool,
  onAddElement,
  onClearSelection,
}: UseCanvasEventsOptions): CanvasEventHandlers {
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool) {
        // Place a new shape wherever the user clicked
        const coords = getStageClickCoords(e)
        if (!coords) return
        onAddElement(activeTool, coords.x, coords.y)
        return
      }

      // In select mode: click on empty canvas → deselect
      if (isStageClick(e)) {
        onClearSelection()
      }
    },
    [activeTool, onAddElement, onClearSelection],
  )

  return { handleStageClick }
}
