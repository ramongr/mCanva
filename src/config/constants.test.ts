import { describe, expect, it } from 'vitest'
import {
  GRID_SIZE,
  ANCHOR_SNAP_RADIUS,
  TOOLBAR_OFFSET_Y,
  MIN_MARQUEE_DRAG,
  DEFAULT_RECT_WIDTH,
  DEFAULT_RECT_HEIGHT,
  DEFAULT_ELLIPSE_RADIUS_X,
  DEFAULT_ELLIPSE_RADIUS_Y,
  DEFAULT_LINE_LENGTH,
  DEFAULT_ARROW_LENGTH,
  DEFAULT_FILL,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_CORNER_RADIUS,
} from './constants'

describe('config/constants', () => {
  describe('grid configuration', () => {
    it('GRID_SIZE is a positive number', () => {
      expect(GRID_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(GRID_SIZE)).toBe(true)
    })
  })

  describe('canvas interaction', () => {
    it('ANCHOR_SNAP_RADIUS is a positive number', () => {
      expect(ANCHOR_SNAP_RADIUS).toBeGreaterThan(0)
    })

    it('TOOLBAR_OFFSET_Y is a positive number', () => {
      expect(TOOLBAR_OFFSET_Y).toBeGreaterThan(0)
    })

    it('MIN_MARQUEE_DRAG is a positive number', () => {
      expect(MIN_MARQUEE_DRAG).toBeGreaterThan(0)
    })
  })

  describe('default shape dimensions', () => {
    it('DEFAULT_RECT_WIDTH is a positive number', () => {
      expect(DEFAULT_RECT_WIDTH).toBeGreaterThan(0)
    })

    it('DEFAULT_RECT_HEIGHT is a positive number', () => {
      expect(DEFAULT_RECT_HEIGHT).toBeGreaterThan(0)
    })

    it('DEFAULT_ELLIPSE_RADIUS_X is a positive number', () => {
      expect(DEFAULT_ELLIPSE_RADIUS_X).toBeGreaterThan(0)
    })

    it('DEFAULT_ELLIPSE_RADIUS_Y is a positive number', () => {
      expect(DEFAULT_ELLIPSE_RADIUS_Y).toBeGreaterThan(0)
    })

    it('DEFAULT_LINE_LENGTH is a positive number', () => {
      expect(DEFAULT_LINE_LENGTH).toBeGreaterThan(0)
    })

    it('DEFAULT_ARROW_LENGTH is a positive number', () => {
      expect(DEFAULT_ARROW_LENGTH).toBeGreaterThan(0)
    })
  })

  describe('default styling', () => {
    it('DEFAULT_FILL is a valid CSS color string', () => {
      expect(typeof DEFAULT_FILL).toBe('string')
      expect(DEFAULT_FILL.length).toBeGreaterThan(0)
    })

    it('DEFAULT_STROKE is a valid CSS color string', () => {
      expect(typeof DEFAULT_STROKE).toBe('string')
      expect(DEFAULT_STROKE).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('DEFAULT_STROKE_WIDTH is a positive number', () => {
      expect(DEFAULT_STROKE_WIDTH).toBeGreaterThan(0)
    })

    it('DEFAULT_CORNER_RADIUS is a non-negative number', () => {
      expect(DEFAULT_CORNER_RADIUS).toBeGreaterThanOrEqual(0)
    })
  })
})
