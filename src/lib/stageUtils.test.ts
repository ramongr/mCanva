import { describe, it, expect, vi } from 'vitest'
import { getStageClickCoords, isStageClick } from './stageUtils'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'

// ---------------------------------------------------------------------------
// Helpers — build minimal fake Konva event objects
// ---------------------------------------------------------------------------

function makeStageWithPointer(pos: { x: number; y: number } | null) {
  return {
    getPointerPosition: vi.fn().mockReturnValue(pos),
  } as unknown as Konva.Stage
}

function makeEvent(
  target: unknown,
  stageOverride?: unknown,
): KonvaEventObject<MouseEvent> {
  const node = {
    getStage: vi.fn().mockReturnValue(stageOverride ?? target),
    ...(target as object),
  } as unknown as Konva.Node

  return {
    target: node,
    currentTarget: node,
    evt: {} as MouseEvent,
    type: 'click',
    cancelBubble: false,
    pointerId: 1,
  } as unknown as KonvaEventObject<MouseEvent>
}

// ---------------------------------------------------------------------------
// getStageClickCoords
// ---------------------------------------------------------------------------

describe('getStageClickCoords', () => {
  it('returns the pointer position from the stage', () => {
    const stage = makeStageWithPointer({ x: 100, y: 200 })
    const e = makeEvent({}, stage)
    expect(getStageClickCoords(e)).toEqual({ x: 100, y: 200 })
  })

  it('returns null when getStage() returns null', () => {
    const node = { getStage: vi.fn().mockReturnValue(null) } as unknown as Konva.Node
    const e = {
      target: node,
      currentTarget: node,
      evt: {} as MouseEvent,
      type: 'click',
      cancelBubble: false,
      pointerId: 1,
    } as unknown as KonvaEventObject<MouseEvent>
    expect(getStageClickCoords(e)).toBeNull()
  })

  it('returns null when getPointerPosition() returns null', () => {
    const stage = makeStageWithPointer(null)
    const e = makeEvent({}, stage)
    expect(getStageClickCoords(e)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isStageClick
// ---------------------------------------------------------------------------

describe('isStageClick', () => {
  it('returns true when the target is the Stage itself', () => {
    // target === the object returned by getStage (same reference)
    const stage = makeStageWithPointer({ x: 0, y: 0 })
    const stageAsNode = stage as unknown as Konva.Node
    const withGetStage = Object.assign(stageAsNode, {
      getStage: vi.fn().mockReturnValue(stage),
    })
    const e = {
      target: withGetStage,
      currentTarget: withGetStage,
      evt: {} as MouseEvent,
      type: 'click',
      cancelBubble: false,
      pointerId: 1,
    } as unknown as KonvaEventObject<MouseEvent>
    expect(isStageClick(e)).toBe(true)
  })

  it('returns false when the target is a child node, not the Stage', () => {
    const stage = makeStageWithPointer({ x: 0, y: 0 })
    const shape = { getStage: vi.fn().mockReturnValue(stage) } as unknown as Konva.Node
    const e = {
      target: shape,
      currentTarget: shape,
      evt: {} as MouseEvent,
      type: 'click',
      cancelBubble: false,
      pointerId: 1,
    } as unknown as KonvaEventObject<MouseEvent>
    expect(isStageClick(e)).toBe(false)
  })
})
