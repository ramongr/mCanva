/**
 * Pure utilities for working with Konva Stage events.
 * No React, no Zustand — independently testable.
 */
import type { KonvaEventObject } from 'konva/lib/Node'

export interface StageClickCoords {
  x: number
  y: number
}

/**
 * Returns the pointer position relative to the stage from a Konva stage
 * click event. Returns null if the pointer position is unavailable.
 */
export function getStageClickCoords(
  e: KonvaEventObject<MouseEvent>,
): StageClickCoords | null {
  const stage = e.target.getStage()
  if (!stage) return null
  const pos = stage.getPointerPosition()
  if (!pos) return null
  return { x: pos.x, y: pos.y }
}

/**
 * Returns true when the click target is the Stage itself (i.e. the user
 * clicked on empty canvas, not on a shape).
 */
export function isStageClick(e: KonvaEventObject<MouseEvent>): boolean {
  return e.target === e.target.getStage()
}
