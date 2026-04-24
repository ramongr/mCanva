/**
 * useFloatingToolbar — derives toolbar state from selection.
 *
 * Extracts only the style-relevant fields from the selected element
 * to prevent unnecessary re-renders when position/rotation changes.
 */
import { useMemo } from 'react'
import type { WireframeElement, BoundingBox } from '@/types/shapes'
import { getBoundingBox } from '@/lib/shapes'
import { hasCornerRadius } from '@/types/guards'
import { TOOLBAR_OFFSET_Y } from '@/config/constants'

export interface ToolbarElement {
  id: string
  type: string
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius?: number
}

export interface UseFloatingToolbarOptions {
  /** All elements on the canvas */
  elements: WireframeElement[]
  /** Set of selected element IDs */
  selectedIds: Set<string>
}

export interface UseFloatingToolbarResult {
  /** Position to render the toolbar (null if no selection) */
  toolbarPosition: { x: number; y: number } | null
  /** Memoized element with only style-relevant fields (null if no selection) */
  toolbarElement: ToolbarElement | null
  /** The first selected element (for reference) */
  selectedElement: WireframeElement | null
}

/**
 * Hook for computing floating toolbar state from the current selection.
 *
 * The returned `toolbarElement` is memoized to only include style-relevant
 * fields (id, type, fill, stroke, strokeWidth, cornerRadius), preventing
 * the toolbar from re-rendering when the element is dragged (x/y changes).
 *
 * Usage:
 * ```tsx
 * const { toolbarPosition, toolbarElement } = useFloatingToolbar({
 *   elements,
 *   selectedIds,
 * })
 *
 * {toolbarElement && toolbarPosition && (
 *   <FloatingToolbar element={toolbarElement} position={toolbarPosition} />
 * )}
 * ```
 */
export function useFloatingToolbar({
  elements,
  selectedIds,
}: UseFloatingToolbarOptions): UseFloatingToolbarResult {
  // Find the first selected element
  const firstSelectedId = selectedIds.size > 0 ? [...selectedIds][0] : null
  const selectedElement = firstSelectedId
    ? elements.find((el) => el.id === firstSelectedId) ?? null
    : null

  // Compute toolbar position above the selected element
  let toolbarPosition: { x: number; y: number } | null = null
  if (selectedElement) {
    const bb: BoundingBox = getBoundingBox(selectedElement)
    toolbarPosition = {
      x: bb.x,
      y: Math.max(0, bb.y - TOOLBAR_OFFSET_Y),
    }
  }

  // Extract only style-relevant fields to prevent re-renders on position changes
  // These individual property extractions ensure the useMemo only updates when
  // style properties actually change, not when x/y/rotation change during drag
  const selectedId = selectedElement?.id
  const selectedType = selectedElement?.type
  const selectedFill = selectedElement?.fill
  const selectedStroke = selectedElement?.stroke
  const selectedStrokeWidth = selectedElement?.strokeWidth
  const selectedCornerRadius = selectedElement && hasCornerRadius(selectedElement)
    ? selectedElement.cornerRadius
    : undefined

  const toolbarElement = useMemo<ToolbarElement | null>(() => {
    if (!selectedId) return null
    return {
      id: selectedId,
      type: selectedType!,
      fill: selectedFill!,
      stroke: selectedStroke!,
      strokeWidth: selectedStrokeWidth!,
      cornerRadius: selectedCornerRadius,
    }
  }, [
    selectedId,
    selectedType,
    selectedFill,
    selectedStroke,
    selectedStrokeWidth,
    selectedCornerRadius,
  ])

  return {
    toolbarPosition,
    toolbarElement,
    selectedElement,
  }
}
