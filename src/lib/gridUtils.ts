/**
 * Grid utilities for snap-to-grid and grid line generation.
 */

/** Grid cell size in pixels */
export const GRID_SIZE = 10

/**
 * Snaps a value to the nearest grid point.
 *
 * @example
 * snapToGrid(14) // 10
 * snapToGrid(15) // 20
 * snapToGrid(-7) // -10
 */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE || 0
}

export interface GridLines {
  /** X positions of vertical grid lines */
  verticals: number[]
  /** Y positions of horizontal grid lines */
  horizontals: number[]
}

/**
 * Generates grid line positions for a canvas of the given dimensions.
 *
 * @param width  - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param gridSize - Grid cell size (defaults to GRID_SIZE)
 */
export function generateGridLines(
  width: number,
  height: number,
  gridSize: number = GRID_SIZE,
): GridLines {
  const verticals: number[] = []
  const horizontals: number[] = []

  for (let x = 0; x <= width; x += gridSize) {
    verticals.push(x)
  }
  for (let y = 0; y <= height; y += gridSize) {
    horizontals.push(y)
  }

  return { verticals, horizontals }
}
