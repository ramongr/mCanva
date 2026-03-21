/**
 * ArrowShape — renders a Konva Arrow for an ArrowElement.
 *
 * - When both from and to are connected, the arrow body is not independently
 *   draggable (it re-routes via the store when connected shapes move).
 * - When either endpoint is free, the arrow body is draggable.
 * - When selected, endpoint handles appear:
 *     blue filled  = connected endpoint (click to disconnect immediately)
 *     white filled = free endpoint (draggable to stretch / connect to a shape)
 *
 * Free endpoint handles are draggable. During drag the arrow body is updated
 * imperatively (no store update) for smooth live feedback. On dragend the
 * parent is notified via onEndpointDragEnd so it can snap to an anchor and
 * commit to the store.
 *
 * Purely prop-driven — no store access.
 */
import { useRef } from 'react'
import { Arrow, Group, Circle } from 'react-konva'
import type Konva from 'konva'
import type { ArrowElement } from '@/types/shapes'
import type { KonvaPointerEvent, KonvaDragEvent } from '@/types/konva'

export interface ArrowDragEndPayload {
  /** Which endpoint(s) are free and were moved by the drag */
  movedEndpoint: 'from' | 'to' | 'both'
  /** Final canvas position of the free start endpoint (null if from is connected) */
  freeFrom: { x: number; y: number } | null
  /** Final canvas position of the free end endpoint (null if to is connected) */
  freeTo: { x: number; y: number } | null
  /** Fully resolved new points [x1,y1,x2,y2] */
  newPoints: number[]
}

export interface ArrowShapeProps {
  element: ArrowElement
  isSelected: boolean
  onSelect: (id: string, addToSelection: boolean) => void
  onChange: (update: Partial<Omit<ArrowElement, 'id' | 'type'>>) => void
  /** Called when the user clicks an endpoint handle */
  onEndpointClick?: (arrowId: string, endpoint: 'from' | 'to') => void
  /**
   * Called when a drag ends on a partially- or fully-free arrow body.
   * Canvas uses this to snap free endpoints to nearby shape anchors.
   * If not provided, falls back to a plain onChange with new points.
   */
  onArrowDragEnd?: (arrowId: string, payload: ArrowDragEndPayload) => void
  /**
   * Called when a free endpoint handle finishes being dragged.
   * Canvas uses this to snap to an anchor and commit the new position.
   */
  onEndpointDragEnd?: (
    arrowId: string,
    endpoint: 'from' | 'to',
    position: { x: number; y: number },
  ) => void
}

const SELECTION_COLOR = '#0099ff'
const SELECTION_EXTRA_WIDTH = 4
const HANDLE_RADIUS = 6
const HANDLE_CONNECTED_FILL = '#0099ff'
const HANDLE_FREE_FILL = '#ffffff'
const HANDLE_STROKE = '#0099ff'

export function ArrowShape({
  element,
  isSelected,
  onSelect,
  onChange,
  onEndpointClick,
  onArrowDragEnd,
  onEndpointDragEnd,
}: ArrowShapeProps) {
  const isFullyConnected = element.from !== null && element.to !== null
  const isDraggable = !element.locked && !isFullyConnected

  const [x1, y1, x2, y2] = element.points

  // Refs to the Konva Arrow nodes so we can update points imperatively during
  // endpoint handle drag (avoids React re-render fighting Konva's drag)
  const bodyRef = useRef<Konva.Arrow>(null)
  const overlayRef = useRef<Konva.Arrow>(null)

  const handleClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onSelect(element.id, e.evt?.shiftKey ?? false)
  }

  // ---------------------------------------------------------------------------
  // Arrow body drag (moves free endpoints only)
  // ---------------------------------------------------------------------------

  const computeNewPoints = (dx: number, dy: number): number[] => {
    const newX1 = element.from ? x1 : x1 + dx
    const newY1 = element.from ? y1 : y1 + dy
    const newX2 = element.to   ? x2 : x2 + dx
    const newY2 = element.to   ? y2 : y2 + dy
    return [newX1, newY1, newX2, newY2]
  }

  const handleDragEnd = (e: KonvaDragEvent) => {
    const dx = e.target.x()
    const dy = e.target.y()
    const newPoints = computeNewPoints(dx, dy)
    e.target.position({ x: 0, y: 0 })

    if (onArrowDragEnd) {
      const [nx1, ny1, nx2, ny2] = newPoints
      const movedEndpoint =
        !element.from && !element.to ? 'both'
        : !element.from ? 'from'
        : 'to'
      onArrowDragEnd(element.id, {
        movedEndpoint,
        freeFrom: element.from ? null : { x: nx1, y: ny1 },
        freeTo:   element.to   ? null : { x: nx2, y: ny2 },
        newPoints,
      })
    } else {
      onChange({ x: 0, y: 0, points: newPoints })
    }
  }

  // ---------------------------------------------------------------------------
  // Endpoint handle interactions
  // ---------------------------------------------------------------------------

  const handleFromClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onEndpointClick?.(element.id, 'from')
  }

  const handleToClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onEndpointClick?.(element.id, 'to')
  }

  /** Live-update the arrow body imperatively during an endpoint handle drag */
  const updateArrowBodyLive = (newX1: number, newY1: number, newX2: number, newY2: number) => {
    const pts = [newX1, newY1, newX2, newY2]
    bodyRef.current?.points(pts)
    overlayRef.current?.points(pts)
    bodyRef.current?.getLayer()?.batchDraw()
  }

  const handleFromHandleDragMove = (e: KonvaDragEvent) => {
    e.cancelBubble = true
    // Handle position is absolute within the group (group is at 0,0)
    const nx1 = e.target.x()
    const ny1 = e.target.y()
    updateArrowBodyLive(nx1, ny1, x2, y2)
  }

  const handleFromHandleDragEnd = (e: KonvaDragEvent) => {
    e.cancelBubble = true
    const nx1 = e.target.x()
    const ny1 = e.target.y()
    // Reset handle to original position — store commit will re-render it correctly
    e.target.position({ x: x1, y: y1 })
    onEndpointDragEnd?.(element.id, 'from', { x: nx1, y: ny1 })
  }

  const handleToHandleDragMove = (e: KonvaDragEvent) => {
    e.cancelBubble = true
    const nx2 = e.target.x()
    const ny2 = e.target.y()
    updateArrowBodyLive(x1, y1, nx2, ny2)
  }

  const handleToHandleDragEnd = (e: KonvaDragEvent) => {
    e.cancelBubble = true
    const nx2 = e.target.x()
    const ny2 = e.target.y()
    e.target.position({ x: x2, y: y2 })
    onEndpointDragEnd?.(element.id, 'to', { x: nx2, y: ny2 })
  }

  return (
    <Group
      id={element.id}
      name="arrow"
      x={0}
      y={0}
      rotation={element.rotation}
      visible={element.visible}
      draggable={isDraggable}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
    >
      {/* Selection highlight overlay */}
      {isSelected && (
        <Arrow
          ref={overlayRef}
          points={element.points}
          stroke={SELECTION_COLOR}
          strokeWidth={element.strokeWidth + SELECTION_EXTRA_WIDTH}
          fill={SELECTION_COLOR}
          pointerAtBeginning={element.pointerAtStart}
          pointerAtEnding={element.pointerAtEnd}
          listening={false}
          opacity={0.25}
        />
      )}

      {/* Arrow body */}
      <Arrow
        ref={bodyRef}
        name="shape-body"
        points={element.points}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        fill={element.stroke}
        pointerAtBeginning={element.pointerAtStart}
        pointerAtEnding={element.pointerAtEnd}
      />

      {/* Endpoint handles — shown only when selected */}
      {isSelected && (
        <>
          {/* FROM endpoint (tail / start) */}
          <Circle
            name="endpoint-from"
            x={x1}
            y={y1}
            radius={HANDLE_RADIUS}
            fill={element.from ? HANDLE_CONNECTED_FILL : HANDLE_FREE_FILL}
            stroke={HANDLE_STROKE}
            strokeWidth={2}
            hitStrokeWidth={14}
            // Free endpoints are draggable; connected endpoints are click-only
            draggable={!element.from && !element.locked}
            onClick={handleFromClick}
            onTap={handleFromClick}
            onDragMove={handleFromHandleDragMove}
            onDragEnd={handleFromHandleDragEnd}
          />
          {/* TO endpoint (head / end) */}
          <Circle
            name="endpoint-to"
            x={x2}
            y={y2}
            radius={HANDLE_RADIUS}
            fill={element.to ? HANDLE_CONNECTED_FILL : HANDLE_FREE_FILL}
            stroke={HANDLE_STROKE}
            strokeWidth={2}
            hitStrokeWidth={14}
            draggable={!element.to && !element.locked}
            onClick={handleToClick}
            onTap={handleToClick}
            onDragMove={handleToHandleDragMove}
            onDragEnd={handleToHandleDragEnd}
          />
        </>
      )}
    </Group>
  )
}
