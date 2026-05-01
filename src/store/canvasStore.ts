import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { ArrowConnection, ElementUpdate, ShapeType, WireframeElement } from '@/types/shapes'
import { createElement, computeArrowPoints, getConnectedArrows } from '@/lib/shapes'
import {
  addElement,
  updateElement,
  removeElement,
  bringToFront,
  sendToBack,
  findElement,
  moveElementTo as moveElementToUtil,
} from '@/lib/elementUtils'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface CanvasState {
  /** All elements on the canvas, ordered bottom-to-top (last = top) */
  elements: WireframeElement[]
  /** Ids of the currently selected elements */
  selectedIds: Set<string>
  /** The active tool — which shape will be placed on the next canvas click */
  activeTool: ShapeType | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface CanvasActions {
  /** Add a pre-built element to the canvas */
  addElement: (element: WireframeElement) => void
  /** Create and add a new element of the given type at (x, y) */
  addElementAt: (type: ShapeType, x: number, y: number) => void
  /** Apply a partial update to an existing element */
  updateElement: (update: ElementUpdate) => void
  /** Remove an element by id */
  removeElement: (id: string) => void
  /** Replace the entire selection with the given set of ids */
  selectElements: (ids: Set<string>) => void
  /** Toggle a single element in/out of the selection */
  toggleElementSelection: (id: string) => void
  /** Add a single element to the selection without clearing others */
  addToSelection: (id: string) => void
  /** Clear the current selection */
  clearSelection: () => void
  /** Set the active tool */
  setActiveTool: (tool: ShapeType | null) => void
  /** Move element to top of z-order */
  bringToFront: (id: string) => void
  /** Move element to bottom of z-order */
  sendToBack: (id: string) => void
  /**
   * Move element to a specific z-order index.
   *
   * Reserved for future drag-to-reorder feature in LayersPanel.
   * When implemented, users will be able to drag layers up/down in the
   * panel to reorder them, which will call this action with the target index.
   */
  moveElementTo: (id: string, targetIndex: number) => void
  /** Look up an element by id (read-only convenience) */
  getElementById: (id: string) => WireframeElement | undefined
  /** Remove all elements and reset selection */
  clearCanvas: () => void
  /**
   * Recomputes the points of all arrows connected to the given shape id.
   * Should be called after any shape is moved or resized.
   */
  updateArrowConnections: (movedShapeId: string) => void
  /**
   * Recomputes arrow points using a live position override for the dragged
   * shape, WITHOUT updating the shape's stored x/y. This lets arrows track
   * the shape in real-time during a drag without causing React to fight Konva
   * over the dragged node's position.
   */
  liveUpdateArrowConnections: (
    shapeId: string,
    livePosition: { x: number; y: number },
  ) => void
  /**
   * Updates one endpoint (from or to) of an existing arrow.
   * Pass null for connection to disconnect that endpoint (free-floating).
   * Automatically recomputes arrow points.
   */
  reconnectArrowEndpoint: (
    arrowId: string,
    endpoint: 'from' | 'to',
    connection: ArrowConnection | null,
    freePoint?: { x: number; y: number },
  ) => void
}

export type CanvasStore = CanvasState & CanvasActions

// ---------------------------------------------------------------------------
// Store with localStorage persistence and undo/redo support
// Temporal (undo/redo) wraps persist so temporal.getState() works properly
// ---------------------------------------------------------------------------

export const useCanvasStore = create<CanvasStore>()(
  temporal(
    persist(
      (set, get) => ({
        // --- initial state ---
        elements: [],
        selectedIds: new Set<string>(),
        activeTool: null,

        // --- actions ---
        addElement: (element) =>
          set((s) => ({ elements: addElement(s.elements, element) })),

        addElementAt: (type, x, y) => {
          const element = createElement(type, { x, y })
          set((s) => ({
            elements: addElement(s.elements, element),
            selectedIds: new Set([element.id]),
            activeTool: null,
          }))
        },

  updateElement: (update) => {
    set((s) => {
      const updatedElements = updateElement(s.elements, update)

      // If the update touches position or size, recompute connected arrow points
      const positionSizeKeys = ['x', 'y', 'width', 'height', 'radiusX', 'radiusY']
      const touchesGeometry = positionSizeKeys.some((k) => k in update)
      if (!touchesGeometry) return { elements: updatedElements }

      // Recompute points for all arrows connected to this element
      const connectedArrows = getConnectedArrows(updatedElements, update.id)
      if (connectedArrows.length === 0) return { elements: updatedElements }

      const reroutedElements = updatedElements.map((el) => {
        const arrow = connectedArrows.find((a) => a.id === el.id)
        if (!arrow) return el
        return { ...arrow, points: computeArrowPoints(arrow, updatedElements) }
      })

      return { elements: reroutedElements }
    })
  },

  removeElement: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      next.delete(id)
      return {
        elements: removeElement(s.elements, id),
        selectedIds: next,
      }
    }),

  selectElements: (ids) => set({ selectedIds: new Set(ids) }),

  toggleElementSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedIds: next }
    }),

  addToSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      next.add(id)
      return { selectedIds: next }
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  bringToFront: (id) =>
    set((s) => ({ elements: bringToFront(s.elements, id) })),

  sendToBack: (id) =>
    set((s) => ({ elements: sendToBack(s.elements, id) })),

  moveElementTo: (id, targetIndex) =>
    set((s) => ({ elements: moveElementToUtil(s.elements, id, targetIndex) })),

  getElementById: (id) => findElement(get().elements, id),

  clearCanvas: () => set({ elements: [], selectedIds: new Set() }),

  updateArrowConnections: (movedShapeId) =>
    set((s) => {
      const connectedArrows = getConnectedArrows(s.elements, movedShapeId)
      if (connectedArrows.length === 0) return {}

      const reroutedElements = s.elements.map((el) => {
        const arrow = connectedArrows.find((a) => a.id === el.id)
        if (!arrow) return el
        return { ...arrow, points: computeArrowPoints(arrow, s.elements) }
      })

      return { elements: reroutedElements }
    }),

  liveUpdateArrowConnections: (shapeId, livePosition) =>
    set((s) => {
      const connectedArrows = getConnectedArrows(s.elements, shapeId)
      if (connectedArrows.length === 0) return {}

      // Build a temporary element list with the shape at its live drag position.
      // This does NOT commit the shape's x/y to the store.
      const liveElements = s.elements.map((el) =>
        el.id === shapeId ? { ...el, ...livePosition } : el,
      )

      const reroutedElements = s.elements.map((el) => {
        const arrow = connectedArrows.find((a) => a.id === el.id)
        if (!arrow) return el
        return { ...arrow, points: computeArrowPoints(arrow, liveElements) }
      })

      return { elements: reroutedElements }
    }),

  reconnectArrowEndpoint: (arrowId, endpoint, connection, freePoint) =>
    set((s) => {
      const arrow = s.elements.find(
        (el): el is import('@/types/shapes').ArrowElement =>
          el.type === 'arrow' && el.id === arrowId,
      )
      if (!arrow) return {}

      // Build the updated arrow with the new connection
      const updated = {
        ...arrow,
        [endpoint]: connection,
      }

      // If disconnecting, move the free endpoint to freePoint (or keep existing)
      if (!connection && freePoint) {
        const [x1, y1, x2, y2] = arrow.points
        updated.points =
          endpoint === 'from'
            ? [freePoint.x, freePoint.y, x2, y2]
            : [x1, y1, freePoint.x, freePoint.y]
      }

      // Recompute points for the connected endpoints
      updated.points = computeArrowPoints(updated, s.elements)

      const elements = s.elements.map((el) => (el.id === arrowId ? updated : el))
      return { elements }
    }),
  }),
  {
    name: 'mcanva-canvas-storage',
    // Only persist elements (not selection or tool state)
    partialize: (state) => ({ elements: state.elements }),
  },
  ),
  {
    // Only track elements changes for undo/redo (not selection or tool state)
    partialize: (state) => ({ elements: state.elements }),
    // Limit history to 50 states to prevent memory bloat
    limit: 50,
  },
))
