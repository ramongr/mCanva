/**
 * Canvas — the main drawing surface.
 *
 * Composes: Konva Stage + Layer, ShapeRenderer (for each element),
 * SelectionTransformer, FloatingToolbar, and useCanvasEvents for
 * stage-level interaction.
 *
 * Reads from and writes to the Zustand store — this is the only component
 * that has a store dependency, keeping all others purely prop-driven.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Stage, Layer, Arrow, Rect as KonvaRect } from 'react-konva'
import type Konva from 'konva'
import { useCanvasStore } from '@/store/canvasStore'
import { ShapeRenderer } from '@/components/ShapeRenderer/ShapeRenderer'
import { SelectionTransformer } from '@/components/SelectionTransformer/SelectionTransformer'
import { FloatingToolbar } from '@/components/FloatingToolbar/FloatingToolbar'
import { AnchorPoints } from '@/components/AnchorPoints/AnchorPoints'
import { useCanvasEvents } from '@/hooks/useCanvasEvents'
import { useArrowDrawing } from '@/hooks/useArrowDrawing'
import { useArrowReconnect } from '@/hooks/useArrowReconnect'
import { getBoundingBox, getAnchorPoint, intersectsBoundingBox } from '@/lib/shapes'
import { GridLayer } from '@/components/GridLayer/GridLayer'
import { snapToGrid } from '@/lib/gridUtils'
import type { TransformAttrs } from '@/components/SelectionTransformer/SelectionTransformer'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { ArrowConnection, RectElement } from '@/types/shapes'
import type { ArrowDragEndPayload } from '@/components/shapes/ArrowShape'

export interface CanvasProps {
  width: number
  height: number
}

const TOOLBAR_OFFSET_Y = 44

/** Minimum pixel distance to a shape anchor to trigger snap */
const ANCHOR_SNAP_RADIUS = 20

export function Canvas({ width, height }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  /**
   * Set to true synchronously when an anchor click commits a reconnect or
   * drawing step. Consumed (and reset) at the top of handleStageClickWithArrow
   * to swallow the native DOM click event that always follows a Konva anchor
   * click — even when cancelBubble=true stops Konva propagation, the browser
   * still fires a native click on the <canvas> element which would otherwise
   * trigger a second (unwanted) commit.
   */
  const anchorCommittedRef = useRef(false)

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)

  /**
   * Marquee (rubber-band) selection state.
   * Active while the user drags on empty canvas with no tool selected.
   * The ref mirrors state so event handlers always read the latest value
   * without needing to be recreated on every render.
   */
  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const marqueeRef = useRef<typeof marquee>(null)

  const elements = useCanvasStore((s) => s.elements)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeTool = useCanvasStore((s) => s.activeTool)
  const addElementAt = useCanvasStore((s) => s.addElementAt)
  const addElement = useCanvasStore((s) => s.addElement)
  const updateElement = useCanvasStore((s) => s.updateElement)
  const selectElements = useCanvasStore((s) => s.selectElements)
  const toggleElementSelection = useCanvasStore((s) => s.toggleElementSelection)
  const clearSelection = useCanvasStore((s) => s.clearSelection)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)
  const reconnectArrowEndpoint = useCanvasStore((s) => s.reconnectArrowEndpoint)
  const liveUpdateArrowConnections = useCanvasStore((s) => s.liveUpdateArrowConnections)

  const isArrowTool = activeTool === 'arrow'

  const arrowDrawing = useArrowDrawing({
    onAddArrow: (arrow) => {
      addElement(arrow)
      setActiveTool(null)
    },
  })

  const arrowReconnect = useArrowReconnect({
    onReconnect: (arrowId, endpoint, connection, freePoint) => {
      reconnectArrowEndpoint(arrowId, endpoint, connection, freePoint)
    },
  })

  const isReconnecting = arrowReconnect.phase === 'reconnecting'

  // A partially-connected arrow is selected (has at least one free endpoint)
  // Only applies when exactly one element is selected and it is an arrow
  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0] : null
  const selectedArrow = singleSelectedId
    ? elements.find((el) => el.id === singleSelectedId && el.type === 'arrow')
    : null
  const isPartialArrowSelected =
    selectedArrow?.type === 'arrow' &&
    (selectedArrow.from === null || selectedArrow.to === null)

  // Show anchor dots when: drawing a new arrow, reconnecting an endpoint,
  // OR a partially-connected arrow is selected (visual hint of available connections)
  const showAnchorOverlay = isArrowTool || isReconnecting || isPartialArrowSelected
  // Shapes layer only goes non-interactive during active drawing/reconnect — not
  // just because a partial arrow is selected (user should still be able to click shapes)
  const blockShapesLayer = isArrowTool || isReconnecting

  // Reset arrow drawing state when arrow tool is deactivated
  useEffect(() => {
    if (!isArrowTool) {
      arrowDrawing.cancel()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArrowTool])

  // Update cursor on the stage container imperatively so it is testable
  useEffect(() => {
    const container = stageRef.current?.container()
    if (container) {
      container.style.cursor = activeTool ? 'crosshair' : 'default'
    }
  }, [activeTool])

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editingLabelId) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [editingLabelId])

  /** Find the nearest anchor within ANCHOR_SNAP_RADIUS of (x, y), or undefined */
  const findNearestAnchor = useCallback(
    (x: number, y: number): ArrowConnection | undefined => {
      const ANCHORS: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left']
      let best: ArrowConnection | undefined
      let bestDist = ANCHOR_SNAP_RADIUS

      for (const el of elements) {
        if (el.type === 'arrow') continue
        for (const anchor of ANCHORS) {
          const pt = getAnchorPoint(el, anchor)
          const dist = Math.hypot(pt.x - x, pt.y - y)
          if (dist < bestDist) {
            bestDist = dist
            best = { shapeId: el.id, anchor }
          }
        }
      }
      return best
    },
    [elements],
  )

  const { handleStageClick } = useCanvasEvents({
    activeTool: isArrowTool ? null : activeTool, // suppress default click handler for arrow tool
    onAddElement: (type, x, y) => addElementAt(type, snapToGrid(x), snapToGrid(y)),
    onClearSelection: clearSelection,
  })

  // Keep both arrow hook results in refs so stage event callbacks never go stale
  const arrowDrawingRef = useRef(arrowDrawing)
  arrowDrawingRef.current = arrowDrawing
  const arrowReconnectRef = useRef(arrowReconnect)
  arrowReconnectRef.current = arrowReconnect

  /** Resolve a pointer position to {x,y}, snapping to the nearest anchor if within radius */
  const resolvePointerWithSnap = useCallback(
    (pos: { x: number; y: number }): { x: number; y: number; anchorHit?: ArrowConnection } => {
      const anchorHit = findNearestAnchor(pos.x, pos.y)
      if (anchorHit) {
        const anchorEl = elements.find((el) => el.id === anchorHit.shapeId)
        if (anchorEl) {
          const pt = getAnchorPoint(anchorEl, anchorHit.anchor)
          return { x: pt.x, y: pt.y, anchorHit }
        }
      }
      return { x: pos.x, y: pos.y }
    },
    [findNearestAnchor, elements],
  )

  const handleStageClickWithArrow = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // An anchor circle was just clicked — its Konva handler already committed
      // the action synchronously. The native DOM click event still fires on the
      // <canvas> and reaches this handler even though cancelBubble=true stopped
      // Konva propagation. Consume the flag and bail out immediately.
      if (anchorCommittedRef.current) {
        anchorCommittedRef.current = false
        return
      }

      const stage = stageRef.current
      const pos = stage?.getPointerPosition()

      // Reconnect mode: commit the endpoint wherever user clicked
      if (arrowReconnectRef.current.phase === 'reconnecting') {
        if (!pos) return
        const { x, y, anchorHit } = resolvePointerWithSnap(pos)
        if (anchorHit) {
          arrowReconnectRef.current.commitAnchor(anchorHit, { x, y })
        } else {
          arrowReconnectRef.current.commitFreePoint(x, y)
        }
        return
      }

      // Arrow drawing mode: two-click placement
      if (isArrowTool) {
        if (!pos) return
        const { x, y, anchorHit } = resolvePointerWithSnap(pos)
        // Snap to grid when not snapping to an anchor
        const snappedX = anchorHit ? x : snapToGrid(x)
        const snappedY = anchorHit ? y : snapToGrid(y)
        arrowDrawingRef.current.handleCanvasClick(snappedX, snappedY, anchorHit)
        return
      }

      handleStageClick(e)
    },
    [isArrowTool, resolvePointerWithSnap, handleStageClick],
  )

  const handleStageMouseMove = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current
      const pos = stage?.getPointerPosition()
      if (!pos) return
      const anchorHit = findNearestAnchor(pos.x, pos.y)

      if (arrowReconnectRef.current.phase === 'reconnecting') {
        arrowReconnectRef.current.updatePreview(pos.x, pos.y, anchorHit)
        return
      }

      if (isArrowTool && arrowDrawingRef.current.phase === 'drawing') {
        arrowDrawingRef.current.handleMouseMove(pos.x, pos.y, anchorHit)
      }
    },
    [isArrowTool, findNearestAnchor],
  )

  const handleChange = useCallback(
    (id: string, update: Record<string, unknown>) => {
      // Snap x/y to the grid on drag-end (position updates only)
      const snapped = { ...update }
      if ('x' in snapped) snapped.x = snapToGrid(snapped.x as number)
      if ('y' in snapped) snapped.y = snapToGrid(snapped.y as number)
      updateElement({ id, ...snapped })

      // Multi-selection drag: propagate the x/y delta to all other selected elements.
      // We only act when a position update comes in AND more than one element is selected.
      if (
        selectedIds.size > 1 &&
        selectedIds.has(id) &&
        ('x' in snapped || 'y' in snapped)
      ) {
        // Find the element's previous position to compute the delta
        const el = elements.find((e) => e.id === id)
        if (!el) return
        const prevX = ('x' in el ? (el as { x: number }).x : 0)
        const prevY = ('y' in el ? (el as { y: number }).y : 0)
        const newX = 'x' in snapped ? (snapped.x as number) : prevX
        const newY = 'y' in snapped ? (snapped.y as number) : prevY
        const dx = newX - prevX
        const dy = newY - prevY

        for (const otherId of selectedIds) {
          if (otherId === id) continue
          const other = elements.find((e) => e.id === otherId)
          if (!other) continue
          // Arrows don't have a simple x/y position — skip them for group drag
          if (other.type === 'arrow') continue
          const otherX = ('x' in other ? (other as { x: number }).x : 0)
          const otherY = ('y' in other ? (other as { y: number }).y : 0)
          updateElement({ id: otherId, x: snapToGrid(otherX + dx), y: snapToGrid(otherY + dy) })
        }
      }
    },
    [updateElement, selectedIds, elements],
  )

  const handleDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const el = elements.find((e) => e.id === id)
      if (!el) return

      // Arrows: Konva handles the visual drag freely; connected endpoints are
      // anchored on dragend via computeNewPoints in ArrowShape. No store update
      // here — updating points mid-drag causes React to re-render and reset the
      // group position, which makes the delta compound on every pixel moved.
      if (el.type === 'arrow') return

      // For shapes: live-update connected arrow positions without committing shape x/y
      liveUpdateArrowConnections(id, { x, y })

      // Multi-selection drag: visually move all other selected non-arrow elements
      // by the same delta so they appear to move together during the drag.
      if (selectedIds.size > 1 && selectedIds.has(id)) {
        const stage = stageRef.current
        if (!stage) return
        const elX = ('x' in el ? (el as { x: number }).x : 0)
        const elY = ('y' in el ? (el as { y: number }).y : 0)
        const dx = x - elX
        const dy = y - elY

        for (const otherId of selectedIds) {
          if (otherId === id) continue
          const other = elements.find((e) => e.id === otherId)
          if (!other || other.type === 'arrow') continue
          const node = stage.findOne(`#${otherId}`)
          if (!node) continue
          const otherEl = other as { x: number; y: number }
          node.position({ x: otherEl.x + dx, y: otherEl.y + dy })
          liveUpdateArrowConnections(otherId, { x: otherEl.x + dx, y: otherEl.y + dy })
        }
      }
    },
    [elements, selectedIds, liveUpdateArrowConnections],
  )

  const handleTransformEnd = (id: string, attrs: TransformAttrs) => {
    updateElement({ id, ...attrs })
  }

  /**
   * Called when a free endpoint handle finishes being dragged.
   * Snaps to the nearest anchor if within radius, otherwise commits free position.
   */
  const handleEndpointDragEnd = useCallback(
    (arrowId: string, endpoint: 'from' | 'to', position: { x: number; y: number }) => {
      const anchorHit = findNearestAnchor(position.x, position.y)
      if (anchorHit) {
        reconnectArrowEndpoint(arrowId, endpoint, anchorHit)
      } else {
        reconnectArrowEndpoint(arrowId, endpoint, null, position)
      }
    },
    [findNearestAnchor, reconnectArrowEndpoint],
  )

  /**
   * Called when a free (or partially-connected) arrow body finishes dragging.
   * Snaps any free endpoint that landed within ANCHOR_SNAP_RADIUS of a shape
   * anchor, then commits the result — either as a reconnection (if snapped)
   * or as a plain position update (if not snapped).
   */
  const handleArrowDragEnd = useCallback(
    (arrowId: string, payload: ArrowDragEndPayload) => {
      const arrow = elements.find((el) => el.id === arrowId)
      if (!arrow || arrow.type !== 'arrow') return

      const snapFrom = payload.freeFrom
        ? findNearestAnchor(payload.freeFrom.x, payload.freeFrom.y)
        : undefined
      const snapTo = payload.freeTo
        ? findNearestAnchor(payload.freeTo.x, payload.freeTo.y)
        : undefined

      const hasSnap = snapFrom !== undefined || snapTo !== undefined

      if (hasSnap) {
        // Commit the plain points first (so the arrow sits at the dragged position)
        updateElement({
          id: arrowId,
          points: payload.newPoints,
        } as Parameters<typeof updateElement>[0])

        // Then apply each snap as a reconnection
        if (snapFrom) {
          reconnectArrowEndpoint(arrowId, 'from', snapFrom)
        }
        if (snapTo) {
          reconnectArrowEndpoint(arrowId, 'to', snapTo)
        }
      } else {
        // No snap — just commit the new free positions
        updateElement({
          id: arrowId,
          points: payload.newPoints,
        } as Parameters<typeof updateElement>[0])
      }
    },
    [elements, findNearestAnchor, updateElement, reconnectArrowEndpoint],
  )

  const handleEditLabel = useCallback((id: string) => {
    setEditingLabelId(id)
  }, [])

  const commitLabel = useCallback((value: string) => {
    if (editingLabelId) {
      updateElement({ id: editingLabelId, label: value })
      setEditingLabelId(null)
    }
  }, [editingLabelId, updateElement])

  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    commitLabel(e.target.value)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitLabel((e.target as HTMLTextAreaElement).value)
    }
    if (e.key === 'Escape') {
      if (editingLabelId) {
        setEditingLabelId(null)
      } else if (isArrowTool) {
        arrowDrawing.cancel()
      }
    }
  }

  // Compute toolbar position — show when at least 1 shape is selected
  // When exactly 1 shape: show that shape's toolbar position
  // When 2+ shapes: show the first selected shape's toolbar position (shared properties mode)
  const firstSelectedId = selectedIds.size > 0 ? [...selectedIds][0] : null
  const selectedElement = firstSelectedId ? elements.find((el) => el.id === firstSelectedId) : null
  let toolbarPosition: { x: number; y: number } | null = null
  if (selectedElement) {
    const bb = getBoundingBox(selectedElement)
    toolbarPosition = {
      x: bb.x,
      y: Math.max(0, bb.y - TOOLBAR_OFFSET_Y),
    }
  }

  // Extract only the fields FloatingToolbar renders — keeps it from re-rendering on x/y/rotation changes
  const toolbarElement = useMemo(() => {
    if (!selectedElement) return null
    return {
      id: selectedElement.id,
      type: selectedElement.type,
      fill: selectedElement.fill,
      stroke: selectedElement.stroke,
      strokeWidth: selectedElement.strokeWidth,
      cornerRadius: (selectedElement as RectElement).cornerRadius,
    } as RectElement
  }, [
    selectedElement?.id,
    selectedElement?.type,
    selectedElement?.fill,
    selectedElement?.stroke,
    selectedElement?.strokeWidth,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (selectedElement as RectElement | null)?.cornerRadius,
  ])

  // Compute textarea position for the element being edited
  const editingElement = editingLabelId ? elements.find((el) => el.id === editingLabelId) : null
  let textareaStyle: React.CSSProperties | null = null
  if (editingElement) {
    const bb = getBoundingBox(editingElement)
    textareaStyle = {
      left: bb.x,
      top: bb.y,
      width: Math.max(bb.width, 80),
      height: Math.max(bb.height, 32),
    }
  }

  // Unified hovered anchor — from whichever mode is active
  const hoveredAnchor = isArrowTool
    ? arrowDrawing.hoveredAnchor
    : arrowReconnect.hoveredAnchor

  // Preview line while drawing a new arrow
  const drawingPreviewPoints =
    arrowDrawing.phase === 'drawing' && arrowDrawing.startPoint && arrowDrawing.previewEnd
      ? [
          arrowDrawing.startPoint.x,
          arrowDrawing.startPoint.y,
          arrowDrawing.previewEnd.x,
          arrowDrawing.previewEnd.y,
        ]
      : null

  // Preview line while reconnecting an existing endpoint
  const reconnectPreviewPoints = (() => {
    const s = arrowReconnect.session
    if (!s || !s.previewPoint) return null
    const arrow = elements.find((el) => el.id === s.arrowId)
    if (!arrow || arrow.type !== 'arrow') return null
    const [x1, y1, x2, y2] = arrow.points
    return s.endpoint === 'from'
      ? [s.previewPoint.x, s.previewPoint.y, x2, y2]
      : [x1, y1, s.previewPoint.x, s.previewPoint.y]
  })()

  /**
   * Marquee (rubber-band) selection handlers.
   * Dragging on empty canvas (no tool, click target is the Stage itself)
   * draws a dashed rectangle and selects all elements whose bounding boxes
   * overlap it on mouse-up.
   */
  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only start marquee when: no tool active, clicked on empty canvas (stage target),
      // not in arrow draw/reconnect mode, and no modifier key is pressed
      if (activeTool) return
      if (isArrowTool || isReconnecting) return
      if (e.target !== stageRef.current) return

      const pos = stageRef.current?.getPointerPosition()
      if (!pos) return

      const m = { startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y }
      marqueeRef.current = m
      setMarquee(m)
    },
    [activeTool, isArrowTool, isReconnecting],
  )

  const handleStageMouseMoveWithMarquee = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Update marquee rectangle if active (use ref for latest value)
      if (marqueeRef.current) {
        const pos = stageRef.current?.getPointerPosition()
        if (pos) {
          const m = { ...marqueeRef.current, currentX: pos.x, currentY: pos.y }
          marqueeRef.current = m
          setMarquee(m)
        }
        return
      }
      // Otherwise delegate to existing arrow/reconnect mouse-move handler
      handleStageMouseMove(e)
    },
    [handleStageMouseMove],
  )

  const handleStageMouseUp = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      const m = marqueeRef.current
      if (!m) return
      const rect = {
        x: m.startX,
        y: m.startY,
        width: m.currentX - m.startX,
        height: m.currentY - m.startY,
      }
      marqueeRef.current = null
      setMarquee(null)
      // Only apply selection if the user actually dragged (not just clicked)
      const MIN_DRAG = 4
      if (Math.abs(rect.width) > MIN_DRAG || Math.abs(rect.height) > MIN_DRAG) {
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

  const handleEndpointClick = useCallback(
    (arrowId: string, endpoint: 'from' | 'to') => {
      const arrow = elements.find((el) => el.id === arrowId)
      if (!arrow || arrow.type !== 'arrow') return

      const isConnected = endpoint === 'from' ? arrow.from !== null : arrow.to !== null

      if (isConnected) {
        // Already connected — disconnect immediately, leaving the endpoint free
        // at its current canvas position (no move needed).
        const [x1, y1, x2, y2] = arrow.points
        const freePoint = endpoint === 'from' ? { x: x1, y: y1 } : { x: x2, y: y2 }
        reconnectArrowEndpoint(arrowId, endpoint, null, freePoint)
      } else {
        // Free endpoint — enter reconnect mode so the user can attach it to a shape
        arrowReconnectRef.current.startReconnect(arrowId, endpoint)
      }
    },
    [elements, reconnectArrowEndpoint],
  )

  return (
    <div className="relative">
      {toolbarElement && toolbarPosition && !editingLabelId && !showAnchorOverlay && (
        <FloatingToolbar
          element={toolbarElement}
          position={toolbarPosition}
          onUpdate={(update) => updateElement(update)}
        />
      )}
      {editingElement && textareaStyle && (
        <textarea
          data-testid="label-textarea"
          ref={textareaRef}
          defaultValue={editingElement.label}
          style={textareaStyle}
          className="absolute z-20 resize-none rounded border border-blue-400 bg-white/90 p-1 text-center text-sm text-gray-900 shadow outline-none focus:ring-2 focus:ring-blue-400"
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClickWithArrow as (e: KonvaEventObject<MouseEvent>) => void}
        onMouseDown={handleStageMouseDown as (e: KonvaEventObject<MouseEvent>) => void}
        onMouseMove={handleStageMouseMoveWithMarquee as (e: KonvaEventObject<MouseEvent>) => void}
        onMouseUp={handleStageMouseUp as (e: KonvaEventObject<MouseEvent>) => void}
      >
        {/* Grid layer — always visible, sits behind all other layers */}
        <GridLayer width={width} height={height} />

        {/* Shapes layer — non-interactive when anchor overlay is shown so
            clicks pass through to the stage and into the drawing state machine */}
        <Layer listening={!blockShapesLayer}>
          {elements.map((element) => (
            <ShapeRenderer
              key={element.id}
              element={element}
              isSelected={selectedIds.has(element.id)}
              onSelect={(id, addToSelection) =>
                addToSelection
                  ? toggleElementSelection(id)
                  : selectElements(new Set([id]))
              }
              onChange={handleChange}
              onEditLabel={handleEditLabel}
              onEndpointClick={handleEndpointClick}
              onDragMove={handleDragMove}
              onArrowDragEnd={handleArrowDragEnd}
              onEndpointDragEnd={handleEndpointDragEnd}
            />
          ))}
          <SelectionTransformer
            selectedIds={selectedIds}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>

        {/* Anchor overlay layer — shown during new-arrow drawing, endpoint reconnect,
            or when a partially-connected arrow is selected (passive hint) */}
        {showAnchorOverlay && (
          <Layer>
            {/* Invisible hit rect — only in active drawing/reconnect mode so that
                clicks on empty canvas still reach the stage (clearSelection) in
                passive partial-arrow-selected mode */}
            {blockShapesLayer && (
              <KonvaRect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="transparent"
                listening={true}
              />
            )}
            <AnchorPoints
              elements={elements}
              hoveredAnchor={hoveredAnchor}
              onAnchorClick={(connection) => {
                // Set the guard BEFORE committing so handleStageClickWithArrow
                // can detect and discard the native DOM click that follows.
                anchorCommittedRef.current = true
                const el = elements.find((e) => e.id === connection.shapeId)
                if (!el) return
                const pt = getAnchorPoint(el, connection.anchor)
                if (arrowReconnectRef.current.phase === 'reconnecting') {
                  // Active reconnect — commit to the clicked anchor
                  arrowReconnectRef.current.commitAnchor(connection, pt)
                } else if (isPartialArrowSelected && selectedArrow?.type === 'arrow') {
                  // Partial arrow selected (passive anchor hint) — connect the
                  // free endpoint directly to the clicked anchor
                  const freeEndpoint = selectedArrow.from === null ? 'from' : 'to'
                  reconnectArrowEndpoint(selectedArrow.id, freeEndpoint, connection)
                } else {
                  // Arrow drawing tool — advance the two-click drawing state machine
                  arrowDrawingRef.current.handleCanvasClick(pt.x, pt.y, connection)
                }
              }}
              onAnchorHover={(anchor) => {
                if (arrowReconnectRef.current.phase === 'reconnecting') {
                  arrowReconnectRef.current.setHoveredAnchor(anchor)
                } else {
                  arrowDrawingRef.current.setHoveredAnchor(anchor)
                }
              }}
            />
            {/* Live preview while drawing a new arrow */}
            {drawingPreviewPoints && (
              <Arrow
                points={drawingPreviewPoints}
                stroke="#0099ff"
                strokeWidth={2}
                fill="#0099ff"
                pointerAtEnding={true}
                opacity={0.6}
                listening={false}
                dash={[6, 3]}
              />
            )}
            {/* Live preview while reconnecting an endpoint */}
            {reconnectPreviewPoints && (
              <Arrow
                points={reconnectPreviewPoints}
                stroke="#0099ff"
                strokeWidth={2}
                fill="#0099ff"
                pointerAtEnding={arrowReconnect.session?.endpoint === 'to'}
                pointerAtBeginning={arrowReconnect.session?.endpoint === 'from'}
                opacity={0.6}
                listening={false}
                dash={[6, 3]}
              />
            )}
          </Layer>
        )}

        {/* Marquee (rubber-band) selection rectangle */}
        {marquee && (
          <Layer listening={false}>
            <KonvaRect
              data-testid="marquee-rect"
              x={Math.min(marquee.startX, marquee.currentX)}
              y={Math.min(marquee.startY, marquee.currentY)}
              width={Math.abs(marquee.currentX - marquee.startX)}
              height={Math.abs(marquee.currentY - marquee.startY)}
              fill="rgba(0, 120, 255, 0.08)"
              stroke="#0078ff"
              strokeWidth={1}
              dash={[4, 3]}
              listening={false}
            />
          </Layer>
        )}
      </Stage>
    </div>
  )
}
