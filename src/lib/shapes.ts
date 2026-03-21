import type {
  AnchorPosition,
  ArrowElement,
  BoundingBox,
  EllipseElement,
  LineElement,
  RectElement,
  ShapeType,
  WireframeElement,
} from '@/types/shapes'

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a unique element ID using the Web Crypto API.
 * Falls back to a timestamp-based ID in environments without crypto support.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `element-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const BASE_DEFAULTS = {
  x: 0,
  y: 0,
  fill: 'transparent',
  stroke: '#1a1a1a',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
} as const

export const SHAPE_DEFAULTS = {
  rect: {
    width: 160,
    height: 100,
    cornerRadius: 0,
  },
  ellipse: {
    radiusX: 80,
    radiusY: 50,
  },
  line: {
    points: [0, 0, 160, 0],
  },
  arrow: {
    points: [0, 0, 160, 0],
    from: null,
    to: null,
    pointerAtStart: false,
    pointerAtEnd: true,
  },
} as const

// ---------------------------------------------------------------------------
// Element factories
// ---------------------------------------------------------------------------

/**
 * Creates a new RectElement with sensible defaults.
 * Any field can be overridden via the `overrides` parameter.
 */
export function createRectElement(overrides: Partial<Omit<RectElement, 'type'>> = {}): RectElement {
  return {
    ...BASE_DEFAULTS,
    ...SHAPE_DEFAULTS.rect,
    id: generateId(),
    type: 'rect',
    ...overrides,
  }
}

/**
 * Creates a new EllipseElement with sensible defaults.
 */
export function createEllipseElement(
  overrides: Partial<Omit<EllipseElement, 'type'>> = {},
): EllipseElement {
  return {
    ...BASE_DEFAULTS,
    ...SHAPE_DEFAULTS.ellipse,
    id: generateId(),
    type: 'ellipse',
    ...overrides,
  }
}

/**
 * Creates a new LineElement with sensible defaults.
 */
export function createLineElement(overrides: Partial<Omit<LineElement, 'type'>> = {}): LineElement {
  return {
    ...BASE_DEFAULTS,
    points: [...SHAPE_DEFAULTS.line.points],
    id: generateId(),
    type: 'line',
    ...overrides,
  }
}

/**
 * Creates a new ArrowElement with sensible defaults.
 * @param x1 - Start X coordinate in canvas space
 * @param y1 - Start Y coordinate in canvas space
 * @param x2 - End X coordinate in canvas space
 * @param y2 - End Y coordinate in canvas space
 */
export function createArrowElement(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  overrides: Partial<Omit<ArrowElement, 'type' | 'points'>> = {},
): ArrowElement {
  return {
    ...BASE_DEFAULTS,
    id: generateId(),
    type: 'arrow',
    // Arrows use absolute canvas coordinates stored in points; x/y are always 0
    x: 0,
    y: 0,
    points: [x1, y1, x2, y2],
    from: null,
    to: null,
    pointerAtStart: false,
    pointerAtEnd: true,
    ...overrides,
  }
}

/**
 * Factory dispatcher — creates an element for any ShapeType.
 */
export function createElement(
  type: ShapeType,
  overrides: Partial<Omit<WireframeElement, 'type'>> = {},
): WireframeElement {
  switch (type) {
    case 'rect':
      return createRectElement(overrides as Partial<Omit<RectElement, 'type'>>)
    case 'ellipse':
      return createEllipseElement(overrides as Partial<Omit<EllipseElement, 'type'>>)
    case 'line':
      return createLineElement(overrides as Partial<Omit<LineElement, 'type'>>)
    case 'arrow':
      return createArrowElement(0, 0, 160, 0, overrides as Partial<Omit<ArrowElement, 'type' | 'points'>>)
  }
}

// ---------------------------------------------------------------------------
// Anchor point helpers
// ---------------------------------------------------------------------------

/**
 * Returns the world-space coordinates of an anchor point on a shape.
 * Anchors are at the center of each of the four edges of the bounding box.
 * Note: does not account for rotation.
 */
export function getAnchorPoint(
  element: WireframeElement,
  anchor: AnchorPosition,
): { x: number; y: number } {
  const bb = getBoundingBox(element)
  switch (anchor) {
    case 'top':
      return { x: bb.x + bb.width / 2, y: bb.y }
    case 'right':
      return { x: bb.x + bb.width, y: bb.y + bb.height / 2 }
    case 'bottom':
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height }
    case 'left':
      return { x: bb.x, y: bb.y + bb.height / 2 }
  }
}

/**
 * Computes the [x1, y1, x2, y2] points array for an arrow, resolving any
 * connected endpoints from the provided elements list.
 * Falls back to the arrow's existing point values for disconnected endpoints.
 */
export function computeArrowPoints(
  arrow: ArrowElement,
  elements: WireframeElement[],
): number[] {
  const [x1, y1, x2, y2] = arrow.points

  let startX = x1
  let startY = y1
  let endX = x2
  let endY = y2

  if (arrow.from) {
    const source = elements.find((el) => el.id === arrow.from!.shapeId)
    if (source) {
      const pt = getAnchorPoint(source, arrow.from.anchor)
      startX = pt.x
      startY = pt.y
    }
  }

  if (arrow.to) {
    const target = elements.find((el) => el.id === arrow.to!.shapeId)
    if (target) {
      const pt = getAnchorPoint(target, arrow.to.anchor)
      endX = pt.x
      endY = pt.y
    }
  }

  return [startX, startY, endX, endY]
}

/**
 * Returns all ArrowElements in a list that are connected to a given shape id.
 */
export function getConnectedArrows(
  elements: WireframeElement[],
  shapeId: string,
): ArrowElement[] {
  return elements.filter(
    (el): el is ArrowElement =>
      el.type === 'arrow' &&
      (el.from?.shapeId === shapeId || el.to?.shapeId === shapeId),
  )
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

/**
 * Returns the axis-aligned bounding box for any WireframeElement.
 * Note: does not account for rotation — use for approximate hit-testing only.
 */
export function getBoundingBox(element: WireframeElement): BoundingBox {
  switch (element.type) {
    case 'rect':
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      }
    case 'ellipse':
      return {
        x: element.x - element.radiusX,
        y: element.y - element.radiusY,
        width: element.radiusX * 2,
        height: element.radiusY * 2,
      }
    case 'line': {
      const xs = element.points.filter((_, i) => i % 2 === 0).map((v) => v + element.x)
      const ys = element.points.filter((_, i) => i % 2 !== 0).map((v) => v + element.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    case 'arrow': {
      // Arrow points are absolute canvas coordinates (x/y of arrow element are always 0)
      const [x1, y1, x2, y2] = element.points
      const minX = Math.min(x1, x2)
      const minY = Math.min(y1, y2)
      const maxX = Math.max(x1, x2)
      const maxY = Math.max(y1, y2)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
  }
}

/**
 * Returns true if point (px, py) is inside the element's bounding box.
 */
export function isPointInBoundingBox(
  element: WireframeElement,
  px: number,
  py: number,
): boolean {
  const bb = getBoundingBox(element)
  return px >= bb.x && px <= bb.x + bb.width && py >= bb.y && py <= bb.y + bb.height
}

/**
 * Returns true if the element's bounding box intersects (overlaps) with the
 * given axis-aligned rectangle. Uses AABB overlap — any partial overlap counts.
 *
 * @param element - The canvas element to test
 * @param rect - The selection rectangle { x, y, width, height } where width/height may be negative
 */
export function intersectsBoundingBox(
  element: WireframeElement,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const bb = getBoundingBox(element)
  // Normalise the selection rect so x/y is always the top-left corner
  const rx = rect.width >= 0 ? rect.x : rect.x + rect.width
  const ry = rect.height >= 0 ? rect.y : rect.y + rect.height
  const rw = Math.abs(rect.width)
  const rh = Math.abs(rect.height)
  // AABB overlap test
  return (
    bb.x < rx + rw &&
    bb.x + bb.width > rx &&
    bb.y < ry + rh &&
    bb.y + bb.height > ry
  )
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isRectElement(el: WireframeElement): el is RectElement {
  return el.type === 'rect'
}

export function isEllipseElement(el: WireframeElement): el is EllipseElement {
  return el.type === 'ellipse'
}

export function isLineElement(el: WireframeElement): el is LineElement {
  return el.type === 'line'
}

export function isArrowElement(el: WireframeElement): el is ArrowElement {
  return el.type === 'arrow'
}
