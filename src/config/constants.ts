/**
 * Centralized configuration constants for mCanva.
 *
 * These values control canvas interaction behavior, grid snapping,
 * and UI positioning. Centralizing them makes tuning and testing easier.
 */

// ---------------------------------------------------------------------------
// Grid Configuration
// ---------------------------------------------------------------------------

/** Grid cell size in pixels — shapes snap to multiples of this value */
export const GRID_SIZE = 10

// ---------------------------------------------------------------------------
// Canvas Interaction
// ---------------------------------------------------------------------------

/** Minimum pixel distance to a shape anchor to trigger arrow snap connection */
export const ANCHOR_SNAP_RADIUS = 20

/** Vertical offset (in pixels) for the floating toolbar above a selected shape */
export const TOOLBAR_OFFSET_Y = 44

/** Minimum drag distance (in pixels) to register as a marquee selection vs. a click */
export const MIN_MARQUEE_DRAG = 4

// ---------------------------------------------------------------------------
// Default Shape Dimensions
// ---------------------------------------------------------------------------

export const DEFAULT_RECT_WIDTH = 160
export const DEFAULT_RECT_HEIGHT = 100
export const DEFAULT_ELLIPSE_RADIUS_X = 80
export const DEFAULT_ELLIPSE_RADIUS_Y = 50
export const DEFAULT_LINE_LENGTH = 160
export const DEFAULT_ARROW_LENGTH = 160

// ---------------------------------------------------------------------------
// Default Styling
// ---------------------------------------------------------------------------

export const DEFAULT_FILL = 'transparent'
export const DEFAULT_STROKE = '#1a1a1a'
export const DEFAULT_STROKE_WIDTH = 2
export const DEFAULT_CORNER_RADIUS = 0
