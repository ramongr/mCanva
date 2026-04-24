/**
 * Type guards for WireframeElement discriminated union.
 *
 * These guards enable type-safe narrowing without explicit type assertions,
 * improving code safety and maintainability.
 */

import type {
  WireframeElement,
  RectElement,
  EllipseElement,
  LineElement,
  ArrowElement,
} from './shapes'

/**
 * Type guard for RectElement.
 * @example
 * if (isRectElement(el)) {
 *   console.log(el.width, el.height, el.cornerRadius)
 * }
 */
export function isRectElement(el: WireframeElement): el is RectElement {
  return el.type === 'rect'
}

/**
 * Type guard for EllipseElement.
 * @example
 * if (isEllipseElement(el)) {
 *   console.log(el.radiusX, el.radiusY)
 * }
 */
export function isEllipseElement(el: WireframeElement): el is EllipseElement {
  return el.type === 'ellipse'
}

/**
 * Type guard for LineElement.
 * @example
 * if (isLineElement(el)) {
 *   console.log(el.points)
 * }
 */
export function isLineElement(el: WireframeElement): el is LineElement {
  return el.type === 'line'
}

/**
 * Type guard for ArrowElement.
 * @example
 * if (isArrowElement(el)) {
 *   console.log(el.from, el.to, el.pointerAtStart)
 * }
 */
export function isArrowElement(el: WireframeElement): el is ArrowElement {
  return el.type === 'arrow'
}

/**
 * Type guard for elements that have x/y position properties.
 * Rect and Ellipse elements have x/y as their position origin.
 * Line and Arrow use points array instead.
 *
 * @example
 * if (hasPosition(el)) {
 *   const { x, y } = el  // TypeScript knows x and y exist
 * }
 */
export function hasPosition(el: WireframeElement): el is RectElement | EllipseElement {
  return el.type === 'rect' || el.type === 'ellipse'
}

/**
 * Type guard for elements that have cornerRadius property.
 * Only RectElement has cornerRadius.
 *
 * @example
 * if (hasCornerRadius(el)) {
 *   console.log(el.cornerRadius)
 * }
 */
export function hasCornerRadius(el: WireframeElement): el is RectElement {
  return el.type === 'rect'
}

/**
 * Type guard for elements that use a points array for geometry.
 * Line and Arrow elements store their geometry as flat point arrays.
 *
 * @example
 * if (hasPoints(el)) {
 *   const [x1, y1, x2, y2] = el.points
 * }
 */
export function hasPoints(el: WireframeElement): el is LineElement | ArrowElement {
  return el.type === 'line' || el.type === 'arrow'
}
