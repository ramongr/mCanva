import { describe, it, expect } from 'vitest'
import { GRID_SIZE, snapToGrid, generateGridLines } from './gridUtils'

describe('GRID_SIZE', () => {
  it('is 10', () => {
    expect(GRID_SIZE).toBe(10)
  })
})

describe('snapToGrid', () => {
  it('snaps a value exactly on a grid point to itself', () => {
    expect(snapToGrid(0)).toBe(0)
    expect(snapToGrid(10)).toBe(10)
    expect(snapToGrid(100)).toBe(100)
  })

  it('rounds down when below the midpoint', () => {
    expect(snapToGrid(1)).toBe(0)
    expect(snapToGrid(4)).toBe(0)
    expect(snapToGrid(14)).toBe(10)
  })

  it('rounds up at the midpoint and above', () => {
    expect(snapToGrid(5)).toBe(10)
    expect(snapToGrid(6)).toBe(10)
    expect(snapToGrid(15)).toBe(20)
  })

  it('handles negative values', () => {
    expect(snapToGrid(-1)).toBe(0)
    expect(snapToGrid(-5)).toBe(0)
    expect(snapToGrid(-6)).toBe(-10)
    expect(snapToGrid(-10)).toBe(-10)
  })

  it('handles large values', () => {
    expect(snapToGrid(1234)).toBe(1230)
    expect(snapToGrid(1235)).toBe(1240)
  })
})

describe('generateGridLines', () => {
  it('generates the correct number of vertical lines for a 100-wide canvas', () => {
    const { verticals } = generateGridLines(100, 50)
    // x = 0, 10, 20, ..., 100 → 11 lines
    expect(verticals).toHaveLength(11)
  })

  it('generates the correct number of horizontal lines for a 50-tall canvas', () => {
    const { horizontals } = generateGridLines(100, 50)
    // y = 0, 10, 20, 30, 40, 50 → 6 lines
    expect(horizontals).toHaveLength(6)
  })

  it('starts at 0 for both axes', () => {
    const { verticals, horizontals } = generateGridLines(100, 100)
    expect(verticals[0]).toBe(0)
    expect(horizontals[0]).toBe(0)
  })

  it('ends at the canvas boundary', () => {
    const { verticals, horizontals } = generateGridLines(100, 50)
    expect(verticals[verticals.length - 1]).toBe(100)
    expect(horizontals[horizontals.length - 1]).toBe(50)
  })

  it('respects a custom gridSize parameter', () => {
    const { verticals, horizontals } = generateGridLines(100, 100, 20)
    // x = 0, 20, 40, 60, 80, 100 → 6 lines
    expect(verticals).toHaveLength(6)
    expect(horizontals).toHaveLength(6)
    expect(verticals[1]).toBe(20)
  })

  it('returns empty arrays for a zero-dimension canvas', () => {
    const { verticals, horizontals } = generateGridLines(0, 0)
    expect(verticals).toHaveLength(1) // just 0
    expect(horizontals).toHaveLength(1) // just 0
  })
})
