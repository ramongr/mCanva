import { describe, it, expect } from 'vitest'
import {
  addElement,
  updateElement,
  removeElement,
  bringToFront,
  sendToBack,
  findElement,
} from './elementUtils'
import { createRectElement, createEllipseElement, createLineElement } from './shapes'
import type { WireframeElement } from '@/types/shapes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeList(): WireframeElement[] {
  return [
    createRectElement({ id: 'a' }),
    createEllipseElement({ id: 'b' }),
    createLineElement({ id: 'c' }),
  ]
}

// ---------------------------------------------------------------------------
// addElement
// ---------------------------------------------------------------------------

describe('addElement', () => {
  it('appends the element to the end of the list', () => {
    const list = makeList()
    const newEl = createRectElement({ id: 'd' })
    const result = addElement(list, newEl)
    expect(result).toHaveLength(4)
    expect(result[3].id).toBe('d')
  })

  it('does not mutate the original array', () => {
    const list = makeList()
    const newEl = createRectElement({ id: 'd' })
    addElement(list, newEl)
    expect(list).toHaveLength(3)
  })

  it('works on an empty list', () => {
    const newEl = createRectElement({ id: 'a' })
    const result = addElement([], newEl)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// updateElement
// ---------------------------------------------------------------------------

describe('updateElement', () => {
  it('updates the matching element', () => {
    const list = makeList()
    const result = updateElement(list, { id: 'a', x: 99, y: 42 })
    const updated = result.find((el) => el.id === 'a')!
    expect(updated.x).toBe(99)
    expect(updated.y).toBe(42)
  })

  it('does not affect other elements', () => {
    const list = makeList()
    const result = updateElement(list, { id: 'a', x: 99 })
    const b = result.find((el) => el.id === 'b')!
    expect(b.x).toBe(0) // original default
  })

  it('does not mutate the original array', () => {
    const list = makeList()
    updateElement(list, { id: 'a', x: 99 })
    expect(list.find((el) => el.id === 'a')!.x).toBe(0)
  })

  it('is a no-op when id is not found', () => {
    const list = makeList()
    const result = updateElement(list, { id: 'unknown', x: 99 })
    expect(result).toEqual(list)
  })

  it('preserves the type discriminant after update', () => {
    const list = makeList()
    const result = updateElement(list, { id: 'a', x: 10 })
    expect(result.find((el) => el.id === 'a')!.type).toBe('rect')
  })
})

// ---------------------------------------------------------------------------
// removeElement
// ---------------------------------------------------------------------------

describe('removeElement', () => {
  it('removes the element with the given id', () => {
    const list = makeList()
    const result = removeElement(list, 'b')
    expect(result).toHaveLength(2)
    expect(result.find((el) => el.id === 'b')).toBeUndefined()
  })

  it('does not mutate the original array', () => {
    const list = makeList()
    removeElement(list, 'b')
    expect(list).toHaveLength(3)
  })

  it('is a no-op when id is not found', () => {
    const list = makeList()
    const result = removeElement(list, 'unknown')
    expect(result).toHaveLength(3)
  })

  it('returns an empty array when the last element is removed', () => {
    const el = createRectElement({ id: 'only' })
    const result = removeElement([el], 'only')
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// bringToFront
// ---------------------------------------------------------------------------

describe('bringToFront', () => {
  it('moves the element to the last position', () => {
    const list = makeList()
    const result = bringToFront(list, 'a')
    expect(result[result.length - 1].id).toBe('a')
  })

  it('preserves order of other elements', () => {
    const list = makeList()
    const result = bringToFront(list, 'a')
    expect(result[0].id).toBe('b')
    expect(result[1].id).toBe('c')
  })

  it('is a no-op when element is already at the top', () => {
    const list = makeList()
    const result = bringToFront(list, 'c')
    expect(result).toBe(list) // same reference — no change
  })

  it('is a no-op when id is not found', () => {
    const list = makeList()
    const result = bringToFront(list, 'unknown')
    expect(result).toBe(list)
  })

  it('does not mutate the original array', () => {
    const list = makeList()
    bringToFront(list, 'a')
    expect(list[0].id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// sendToBack
// ---------------------------------------------------------------------------

describe('sendToBack', () => {
  it('moves the element to the first position', () => {
    const list = makeList()
    const result = sendToBack(list, 'c')
    expect(result[0].id).toBe('c')
  })

  it('preserves order of other elements', () => {
    const list = makeList()
    const result = sendToBack(list, 'c')
    expect(result[1].id).toBe('a')
    expect(result[2].id).toBe('b')
  })

  it('is a no-op when element is already at the bottom', () => {
    const list = makeList()
    const result = sendToBack(list, 'a')
    expect(result).toBe(list)
  })

  it('is a no-op when id is not found', () => {
    const list = makeList()
    const result = sendToBack(list, 'unknown')
    expect(result).toBe(list)
  })

  it('does not mutate the original array', () => {
    const list = makeList()
    sendToBack(list, 'c')
    expect(list[2].id).toBe('c')
  })
})

// ---------------------------------------------------------------------------
// findElement
// ---------------------------------------------------------------------------

describe('findElement', () => {
  it('returns the element with the matching id', () => {
    const list = makeList()
    const el = findElement(list, 'b')
    expect(el).toBeDefined()
    expect(el!.id).toBe('b')
    expect(el!.type).toBe('ellipse')
  })

  it('returns undefined when id is not found', () => {
    const list = makeList()
    expect(findElement(list, 'unknown')).toBeUndefined()
  })

  it('returns undefined for an empty list', () => {
    expect(findElement([], 'a')).toBeUndefined()
  })
})
