// ---------------------------------------------------------------------------
// Shape type discriminant
// ---------------------------------------------------------------------------

export type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow'

// ---------------------------------------------------------------------------
// Arrow connection types
// ---------------------------------------------------------------------------

/** One of the four cardinal attachment points on a shape */
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

/** Describes one endpoint of an arrow that is snapped to a shape anchor */
export interface ArrowConnection {
  shapeId: string
  anchor: AnchorPosition
}

// ---------------------------------------------------------------------------
// Shared base — every element on the canvas has these fields
// ---------------------------------------------------------------------------

export interface BaseElement {
  /** Unique identifier for this element */
  id: string
  /** Discriminant used to narrow to a concrete element type */
  type: ShapeType
  /** X position of the element's origin on the canvas */
  x: number
  /** Y position of the element's origin on the canvas */
  y: number
  /** Fill colour (CSS colour string or 'transparent') */
  fill: string
  /** Stroke colour */
  stroke: string
  /** Stroke width in pixels */
  strokeWidth: number
  /** Rotation in degrees */
  rotation: number
  /** Whether the element is locked (cannot be selected or moved) */
  locked: boolean
  /** Whether the element is visible */
  visible: boolean
  /** Optional text label rendered inside the shape */
  label: string
}

// ---------------------------------------------------------------------------
// Concrete element types
// ---------------------------------------------------------------------------

export interface RectElement extends BaseElement {
  type: 'rect'
  width: number
  height: number
  /** Corner radius for rounded rectangles */
  cornerRadius: number
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse'
  /** Horizontal radius */
  radiusX: number
  /** Vertical radius */
  radiusY: number
}

export interface LineElement extends BaseElement {
  type: 'line'
  /** Flat array of [x1, y1, x2, y2, ...] points relative to (x, y) */
  points: number[]
}

export interface ArrowElement extends BaseElement {
  type: 'arrow'
  /**
   * Flat array [x1, y1, x2, y2] in canvas (world) coordinates.
   * Recomputed automatically when connected shapes move.
   */
  points: number[]
  /** Start connection — null means the start endpoint is free-floating */
  from: ArrowConnection | null
  /** End connection — null means the end endpoint is free-floating */
  to: ArrowConnection | null
  /** Whether to render an arrowhead at the start (from) endpoint */
  pointerAtStart: boolean
  /** Whether to render an arrowhead at the end (to) endpoint */
  pointerAtEnd: boolean
}

// ---------------------------------------------------------------------------
// Union type — use this everywhere a shape element is accepted
// ---------------------------------------------------------------------------

export type WireframeElement = RectElement | EllipseElement | LineElement | ArrowElement

// ---------------------------------------------------------------------------
// Bounding box — axis-aligned rectangle used for hit-testing and snapping
// ---------------------------------------------------------------------------

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Partial update — used by store.updateElement; id is required, rest optional
// ---------------------------------------------------------------------------

export type ElementUpdate<T extends WireframeElement = WireframeElement> = Partial<
  Omit<T, 'id' | 'type'>
> & { id: string }
