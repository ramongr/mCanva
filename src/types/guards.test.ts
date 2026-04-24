import { describe, expect, it } from 'vitest'
import {
  isRectElement,
  isEllipseElement,
  isLineElement,
  isArrowElement,
  hasPosition,
  hasCornerRadius,
  hasPoints,
} from './guards'
import type {
  RectElement,
  EllipseElement,
  LineElement,
  ArrowElement,
  WireframeElement,
} from './shapes'

// Test fixtures
const rectElement: RectElement = {
  id: 'rect-1',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  cornerRadius: 5,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
}

const ellipseElement: EllipseElement = {
  id: 'ellipse-1',
  type: 'ellipse',
  x: 100,
  y: 100,
  radiusX: 50,
  radiusY: 30,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
}

const lineElement: LineElement = {
  id: 'line-1',
  type: 'line',
  x: 0,
  y: 0,
  points: [0, 0, 100, 100],
  fill: 'transparent',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
}

const arrowElement: ArrowElement = {
  id: 'arrow-1',
  type: 'arrow',
  x: 0,
  y: 0,
  points: [0, 0, 100, 0],
  from: null,
  to: null,
  pointerAtStart: false,
  pointerAtEnd: true,
  fill: 'transparent',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
}

const allElements: WireframeElement[] = [rectElement, ellipseElement, lineElement, arrowElement]

describe('types/guards', () => {
  describe('isRectElement', () => {
    it('returns true for rect elements', () => {
      expect(isRectElement(rectElement)).toBe(true)
    })

    it('returns false for non-rect elements', () => {
      expect(isRectElement(ellipseElement)).toBe(false)
      expect(isRectElement(lineElement)).toBe(false)
      expect(isRectElement(arrowElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      const el: WireframeElement = rectElement
      if (isRectElement(el)) {
        // TypeScript should know these exist
        expect(el.width).toBe(100)
        expect(el.height).toBe(50)
        expect(el.cornerRadius).toBe(5)
      }
    })
  })

  describe('isEllipseElement', () => {
    it('returns true for ellipse elements', () => {
      expect(isEllipseElement(ellipseElement)).toBe(true)
    })

    it('returns false for non-ellipse elements', () => {
      expect(isEllipseElement(rectElement)).toBe(false)
      expect(isEllipseElement(lineElement)).toBe(false)
      expect(isEllipseElement(arrowElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      const el: WireframeElement = ellipseElement
      if (isEllipseElement(el)) {
        expect(el.radiusX).toBe(50)
        expect(el.radiusY).toBe(30)
      }
    })
  })

  describe('isLineElement', () => {
    it('returns true for line elements', () => {
      expect(isLineElement(lineElement)).toBe(true)
    })

    it('returns false for non-line elements', () => {
      expect(isLineElement(rectElement)).toBe(false)
      expect(isLineElement(ellipseElement)).toBe(false)
      expect(isLineElement(arrowElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      const el: WireframeElement = lineElement
      if (isLineElement(el)) {
        expect(el.points).toEqual([0, 0, 100, 100])
      }
    })
  })

  describe('isArrowElement', () => {
    it('returns true for arrow elements', () => {
      expect(isArrowElement(arrowElement)).toBe(true)
    })

    it('returns false for non-arrow elements', () => {
      expect(isArrowElement(rectElement)).toBe(false)
      expect(isArrowElement(ellipseElement)).toBe(false)
      expect(isArrowElement(lineElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      const el: WireframeElement = arrowElement
      if (isArrowElement(el)) {
        expect(el.from).toBeNull()
        expect(el.to).toBeNull()
        expect(el.pointerAtEnd).toBe(true)
      }
    })
  })

  describe('hasPosition', () => {
    it('returns true for rect and ellipse elements', () => {
      expect(hasPosition(rectElement)).toBe(true)
      expect(hasPosition(ellipseElement)).toBe(true)
    })

    it('returns false for line and arrow elements', () => {
      expect(hasPosition(lineElement)).toBe(false)
      expect(hasPosition(arrowElement)).toBe(false)
    })

    it('narrows type correctly for positioned elements', () => {
      allElements.forEach((el) => {
        if (hasPosition(el)) {
          // TypeScript should know x and y exist and are meaningful positions
          expect(typeof el.x).toBe('number')
          expect(typeof el.y).toBe('number')
        }
      })
    })
  })

  describe('hasCornerRadius', () => {
    it('returns true only for rect elements', () => {
      expect(hasCornerRadius(rectElement)).toBe(true)
    })

    it('returns false for non-rect elements', () => {
      expect(hasCornerRadius(ellipseElement)).toBe(false)
      expect(hasCornerRadius(lineElement)).toBe(false)
      expect(hasCornerRadius(arrowElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      allElements.forEach((el) => {
        if (hasCornerRadius(el)) {
          expect(typeof el.cornerRadius).toBe('number')
        }
      })
    })
  })

  describe('hasPoints', () => {
    it('returns true for line and arrow elements', () => {
      expect(hasPoints(lineElement)).toBe(true)
      expect(hasPoints(arrowElement)).toBe(true)
    })

    it('returns false for rect and ellipse elements', () => {
      expect(hasPoints(rectElement)).toBe(false)
      expect(hasPoints(ellipseElement)).toBe(false)
    })

    it('narrows type correctly', () => {
      allElements.forEach((el) => {
        if (hasPoints(el)) {
          expect(Array.isArray(el.points)).toBe(true)
          expect(el.points.length).toBeGreaterThanOrEqual(4)
        }
      })
    })
  })
})
