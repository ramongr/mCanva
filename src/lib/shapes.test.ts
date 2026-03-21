import { describe, it, expect } from 'vitest'
import {
  generateId,
  createRectElement,
  createEllipseElement,
  createLineElement,
  createArrowElement,
  createElement,
  getBoundingBox,
  getAnchorPoint,
  computeArrowPoints,
  getConnectedArrows,
  isPointInBoundingBox,
  isRectElement,
  isEllipseElement,
  isLineElement,
  isArrowElement,
  SHAPE_DEFAULTS,
} from './shapes'
import type { RectElement, EllipseElement, LineElement } from '@/types/shapes'

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId))
    expect(ids.size).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// createRectElement
// ---------------------------------------------------------------------------

describe('createRectElement', () => {
  it('creates a rect element with correct type', () => {
    const el = createRectElement()
    expect(el.type).toBe('rect')
  })

  it('applies default dimensions', () => {
    const el = createRectElement()
    expect(el.width).toBe(SHAPE_DEFAULTS.rect.width)
    expect(el.height).toBe(SHAPE_DEFAULTS.rect.height)
    expect(el.cornerRadius).toBe(SHAPE_DEFAULTS.rect.cornerRadius)
  })

  it('applies base defaults', () => {
    const el = createRectElement()
    expect(el.x).toBe(0)
    expect(el.y).toBe(0)
    expect(el.fill).toBe('transparent')
    expect(el.stroke).toBe('#1a1a1a')
    expect(el.strokeWidth).toBe(2)
    expect(el.rotation).toBe(0)
    expect(el.locked).toBe(false)
    expect(el.visible).toBe(true)
    expect(el.label).toBe('')
  })

  it('generates a unique id', () => {
    const a = createRectElement()
    const b = createRectElement()
    expect(a.id).not.toBe(b.id)
  })

  it('overrides are applied over defaults', () => {
    const el = createRectElement({ x: 50, y: 100, width: 200, fill: '#ff0000' })
    expect(el.x).toBe(50)
    expect(el.y).toBe(100)
    expect(el.width).toBe(200)
    expect(el.fill).toBe('#ff0000')
    // unchanged defaults still present
    expect(el.height).toBe(SHAPE_DEFAULTS.rect.height)
  })

  it('allows setting a fixed id via override', () => {
    const el = createRectElement({ id: 'my-id' })
    expect(el.id).toBe('my-id')
  })
})

// ---------------------------------------------------------------------------
// createEllipseElement
// ---------------------------------------------------------------------------

describe('createEllipseElement', () => {
  it('creates an ellipse element with correct type', () => {
    const el = createEllipseElement()
    expect(el.type).toBe('ellipse')
  })

  it('applies default radii', () => {
    const el = createEllipseElement()
    expect(el.radiusX).toBe(SHAPE_DEFAULTS.ellipse.radiusX)
    expect(el.radiusY).toBe(SHAPE_DEFAULTS.ellipse.radiusY)
  })

  it('generates a unique id', () => {
    const a = createEllipseElement()
    const b = createEllipseElement()
    expect(a.id).not.toBe(b.id)
  })

  it('overrides are applied', () => {
    const el = createEllipseElement({ radiusX: 120, stroke: '#0000ff' })
    expect(el.radiusX).toBe(120)
    expect(el.stroke).toBe('#0000ff')
  })
})

// ---------------------------------------------------------------------------
// createLineElement
// ---------------------------------------------------------------------------

describe('createLineElement', () => {
  it('creates a line element with correct type', () => {
    const el = createLineElement()
    expect(el.type).toBe('line')
  })

  it('applies default points', () => {
    const el = createLineElement()
    expect(el.points).toEqual(SHAPE_DEFAULTS.line.points)
  })

  it('generates a unique id', () => {
    const a = createLineElement()
    const b = createLineElement()
    expect(a.id).not.toBe(b.id)
  })

  it('overrides are applied', () => {
    const el = createLineElement({ points: [0, 0, 50, 50, 100, 0] })
    expect(el.points).toEqual([0, 0, 50, 50, 100, 0])
  })
})

// ---------------------------------------------------------------------------
// createElement (dispatcher)
// ---------------------------------------------------------------------------

describe('createElement', () => {
  it('creates a RectElement for type "rect"', () => {
    const el = createElement('rect')
    expect(el.type).toBe('rect')
  })

  it('creates an EllipseElement for type "ellipse"', () => {
    const el = createElement('ellipse')
    expect(el.type).toBe('ellipse')
  })

  it('creates a LineElement for type "line"', () => {
    const el = createElement('line')
    expect(el.type).toBe('line')
  })

  it('forwards overrides to the created element', () => {
    const el = createElement('rect', { x: 42, y: 99 })
    expect(el.x).toBe(42)
    expect(el.y).toBe(99)
  })
})

// ---------------------------------------------------------------------------
// getBoundingBox
// ---------------------------------------------------------------------------

describe('getBoundingBox', () => {
  it('returns correct bounding box for a rect', () => {
    const el: RectElement = createRectElement({ x: 10, y: 20, width: 100, height: 60 })
    expect(getBoundingBox(el)).toEqual({ x: 10, y: 20, width: 100, height: 60 })
  })

  it('returns correct bounding box for an ellipse', () => {
    const el: EllipseElement = createEllipseElement({ x: 50, y: 50, radiusX: 30, radiusY: 20 })
    expect(getBoundingBox(el)).toEqual({ x: 20, y: 30, width: 60, height: 40 })
  })

  it('returns correct bounding box for a horizontal line', () => {
    const el: LineElement = createLineElement({ x: 10, y: 10, points: [0, 0, 100, 0] })
    expect(getBoundingBox(el)).toEqual({ x: 10, y: 10, width: 100, height: 0 })
  })

  it('returns correct bounding box for a diagonal line', () => {
    const el: LineElement = createLineElement({ x: 0, y: 0, points: [0, 0, 80, 60] })
    expect(getBoundingBox(el)).toEqual({ x: 0, y: 0, width: 80, height: 60 })
  })

  it('returns correct bounding box for a multi-point line', () => {
    const el: LineElement = createLineElement({ x: 5, y: 5, points: [0, 0, 50, 30, 100, 10] })
    // absolute xs: 5, 55, 105 — ys: 5, 35, 15
    expect(getBoundingBox(el)).toEqual({ x: 5, y: 5, width: 100, height: 30 })
  })
})

// ---------------------------------------------------------------------------
// isPointInBoundingBox
// ---------------------------------------------------------------------------

describe('isPointInBoundingBox', () => {
  const rect = createRectElement({ x: 0, y: 0, width: 100, height: 100 })

  it('returns true for a point inside the bounding box', () => {
    expect(isPointInBoundingBox(rect, 50, 50)).toBe(true)
  })

  it('returns true for a point on the boundary', () => {
    expect(isPointInBoundingBox(rect, 0, 0)).toBe(true)
    expect(isPointInBoundingBox(rect, 100, 100)).toBe(true)
  })

  it('returns false for a point outside the bounding box', () => {
    expect(isPointInBoundingBox(rect, 101, 50)).toBe(false)
    expect(isPointInBoundingBox(rect, 50, -1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe('type guards', () => {
  const rect = createRectElement()
  const ellipse = createEllipseElement()
  const line = createLineElement()

  describe('isRectElement', () => {
    it('returns true for rect elements', () => expect(isRectElement(rect)).toBe(true))
    it('returns false for ellipse elements', () => expect(isRectElement(ellipse)).toBe(false))
    it('returns false for line elements', () => expect(isRectElement(line)).toBe(false))
  })

  describe('isEllipseElement', () => {
    it('returns true for ellipse elements', () => expect(isEllipseElement(ellipse)).toBe(true))
    it('returns false for rect elements', () => expect(isEllipseElement(rect)).toBe(false))
    it('returns false for line elements', () => expect(isEllipseElement(line)).toBe(false))
  })

  describe('isLineElement', () => {
    it('returns true for line elements', () => expect(isLineElement(line)).toBe(true))
    it('returns false for rect elements', () => expect(isLineElement(rect)).toBe(false))
    it('returns false for ellipse elements', () => expect(isLineElement(ellipse)).toBe(false))
  })

  describe('isArrowElement', () => {
    const arrow = createArrowElement(0, 0, 100, 0)
    it('returns true for arrow elements', () => expect(isArrowElement(arrow)).toBe(true))
    it('returns false for rect elements', () => expect(isArrowElement(rect)).toBe(false))
    it('returns false for line elements', () => expect(isArrowElement(line)).toBe(false))
  })
})

// ---------------------------------------------------------------------------
// createArrowElement
// ---------------------------------------------------------------------------

describe('createArrowElement', () => {
  it('creates an arrow element with correct type', () => {
    const el = createArrowElement(10, 20, 150, 80)
    expect(el.type).toBe('arrow')
  })

  it('stores the given points as [x1, y1, x2, y2]', () => {
    const el = createArrowElement(10, 20, 150, 80)
    expect(el.points).toEqual([10, 20, 150, 80])
  })

  it('sets x/y to 0 (arrows use absolute canvas coords)', () => {
    const el = createArrowElement(10, 20, 150, 80)
    expect(el.x).toBe(0)
    expect(el.y).toBe(0)
  })

  it('defaults pointerAtEnd to true, pointerAtStart to false', () => {
    const el = createArrowElement(0, 0, 100, 0)
    expect(el.pointerAtEnd).toBe(true)
    expect(el.pointerAtStart).toBe(false)
  })

  it('defaults from and to to null', () => {
    const el = createArrowElement(0, 0, 100, 0)
    expect(el.from).toBeNull()
    expect(el.to).toBeNull()
  })

  it('applies overrides', () => {
    const from = { shapeId: 'r1', anchor: 'right' as const }
    const el = createArrowElement(0, 0, 100, 0, { from })
    expect(el.from).toEqual(from)
  })
})

// ---------------------------------------------------------------------------
// getAnchorPoint
// ---------------------------------------------------------------------------

describe('getAnchorPoint', () => {
  const rect = createRectElement({ id: 'r1', x: 100, y: 50, width: 200, height: 100 })

  it('returns top-center anchor', () => {
    const pt = getAnchorPoint(rect, 'top')
    expect(pt).toEqual({ x: 200, y: 50 })
  })

  it('returns right-center anchor', () => {
    const pt = getAnchorPoint(rect, 'right')
    expect(pt).toEqual({ x: 300, y: 100 })
  })

  it('returns bottom-center anchor', () => {
    const pt = getAnchorPoint(rect, 'bottom')
    expect(pt).toEqual({ x: 200, y: 150 })
  })

  it('returns left-center anchor', () => {
    const pt = getAnchorPoint(rect, 'left')
    expect(pt).toEqual({ x: 100, y: 100 })
  })

  it('returns correct anchors for ellipse (center-based)', () => {
    const ellipse = createEllipseElement({ id: 'e1', x: 100, y: 80, radiusX: 50, radiusY: 30 })
    expect(getAnchorPoint(ellipse, 'top')).toEqual({ x: 100, y: 50 })
    expect(getAnchorPoint(ellipse, 'right')).toEqual({ x: 150, y: 80 })
    expect(getAnchorPoint(ellipse, 'bottom')).toEqual({ x: 100, y: 110 })
    expect(getAnchorPoint(ellipse, 'left')).toEqual({ x: 50, y: 80 })
  })
})

// ---------------------------------------------------------------------------
// computeArrowPoints
// ---------------------------------------------------------------------------

describe('computeArrowPoints', () => {
  const rect1 = createRectElement({ id: 'r1', x: 0, y: 0, width: 100, height: 60 })
  const rect2 = createRectElement({ id: 'r2', x: 200, y: 50, width: 100, height: 60 })

  it('returns unchanged points when both endpoints are free', () => {
    const arrow = createArrowElement(10, 20, 150, 80)
    const pts = computeArrowPoints(arrow, [rect1, rect2])
    expect(pts).toEqual([10, 20, 150, 80])
  })

  it('resolves the from connection to the anchor world position', () => {
    const arrow = createArrowElement(0, 0, 150, 80, {
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })
    const pts = computeArrowPoints(arrow, [rect1, rect2])
    // right anchor of r1 = (100, 30)
    expect(pts[0]).toBe(100)
    expect(pts[1]).toBe(30)
    // end stays at 150, 80
    expect(pts[2]).toBe(150)
    expect(pts[3]).toBe(80)
  })

  it('resolves the to connection to the anchor world position', () => {
    const arrow = createArrowElement(10, 20, 150, 80, {
      from: null,
      to: { shapeId: 'r2', anchor: 'left' },
    })
    const pts = computeArrowPoints(arrow, [rect1, rect2])
    // left anchor of r2 = (200, 80)
    expect(pts[2]).toBe(200)
    expect(pts[3]).toBe(80)
  })

  it('resolves both endpoints when both are connected', () => {
    const arrow = createArrowElement(0, 0, 0, 0, {
      from: { shapeId: 'r1', anchor: 'right' },
      to: { shapeId: 'r2', anchor: 'left' },
    })
    const pts = computeArrowPoints(arrow, [rect1, rect2])
    expect(pts).toEqual([100, 30, 200, 80])
  })
})

// ---------------------------------------------------------------------------
// getConnectedArrows
// ---------------------------------------------------------------------------

describe('getConnectedArrows', () => {
  it('returns arrows connected via from', () => {
    const rect = createRectElement({ id: 'r1' })
    const arrow = createArrowElement(0, 0, 100, 0, {
      id: 'a1',
      from: { shapeId: 'r1', anchor: 'right' },
      to: null,
    })
    const result = getConnectedArrows([rect, arrow], 'r1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('returns arrows connected via to', () => {
    const rect = createRectElement({ id: 'r1' })
    const arrow = createArrowElement(0, 0, 100, 0, {
      id: 'a1',
      from: null,
      to: { shapeId: 'r1', anchor: 'left' },
    })
    const result = getConnectedArrows([rect, arrow], 'r1')
    expect(result).toHaveLength(1)
  })

  it('returns empty array when no arrows are connected', () => {
    const rect = createRectElement({ id: 'r1' })
    const unrelated = createArrowElement(0, 0, 100, 0, { id: 'a1', from: null, to: null })
    const result = getConnectedArrows([rect, unrelated], 'r1')
    expect(result).toHaveLength(0)
  })
})
