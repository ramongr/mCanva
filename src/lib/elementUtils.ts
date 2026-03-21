/**
 * Pure utility functions for mutating collections of WireframeElements.
 * No React, no Zustand — fully unit-testable in isolation.
 */

import type { ElementUpdate, WireframeElement } from '@/types/shapes'

/**
 * Adds an element to the list. Returns a new array (immutable).
 */
export function addElement(
  elements: WireframeElement[],
  element: WireframeElement,
): WireframeElement[] {
  return [...elements, element]
}

/**
 * Applies a partial update to the element matching `update.id`.
 * Returns a new array; unmatched elements are unchanged.
 */
export function updateElement(
  elements: WireframeElement[],
  update: ElementUpdate,
): WireframeElement[] {
  return elements.map((el) =>
    el.id === update.id ? ({ ...el, ...update } as WireframeElement) : el,
  )
}

/**
 * Removes the element with the given id. Returns a new array.
 */
export function removeElement(elements: WireframeElement[], id: string): WireframeElement[] {
  return elements.filter((el) => el.id !== id)
}

/**
 * Moves an element to the top of the z-order (last in array = rendered on top).
 */
export function bringToFront(elements: WireframeElement[], id: string): WireframeElement[] {
  const idx = elements.findIndex((el) => el.id === id)
  if (idx === -1 || idx === elements.length - 1) return elements
  const next = [...elements]
  next.push(next.splice(idx, 1)[0])
  return next
}

/**
 * Moves an element to the bottom of the z-order (first in array = rendered below all).
 */
export function sendToBack(elements: WireframeElement[], id: string): WireframeElement[] {
  const idx = elements.findIndex((el) => el.id === id)
  if (idx === -1 || idx === 0) return elements
  const next = [...elements]
  next.unshift(next.splice(idx, 1)[0])
  return next
}

/**
 * Returns the element with the given id, or undefined if not found.
 */
export function findElement(
  elements: WireframeElement[],
  id: string,
): WireframeElement | undefined {
  return elements.find((el) => el.id === id)
}
