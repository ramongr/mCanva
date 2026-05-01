import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFloatingToolbar } from './useFloatingToolbar'
import type { WireframeElement, RectElement, EllipseElement } from '@/types/shapes'

// Mock dependencies
vi.mock('@/lib/shapes', () => ({
  getBoundingBox: (el: WireframeElement) => ({
    x: el.x,
    y: el.y,
    width: (el as RectElement).width ?? 100,
    height: (el as RectElement).height ?? 50,
  }),
}))

const createRectElement = (overrides: Partial<RectElement> = {}): RectElement => ({
  id: 'rect-1',
  type: 'rect',
  x: 100,
  y: 100,
  width: 150,
  height: 80,
  cornerRadius: 5,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
  ...overrides,
})

const createEllipseElement = (overrides: Partial<EllipseElement> = {}): EllipseElement => ({
  id: 'ellipse-1',
  type: 'ellipse',
  x: 200,
  y: 200,
  radiusX: 50,
  radiusY: 30,
  fill: '#ff0000',
  stroke: '#0000ff',
  strokeWidth: 3,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
  ...overrides,
})

describe('useFloatingToolbar', () => {
  it('returns null when no selection', () => {
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [createRectElement()],
        selectedIds: new Set(),
      }),
    )

    expect(result.current.toolbarPosition).toBeNull()
    expect(result.current.toolbarElement).toBeNull()
    expect(result.current.selectedElement).toBeNull()
  })

  it('returns toolbar state when element is selected', () => {
    const element = createRectElement()
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [element],
        selectedIds: new Set(['rect-1']),
      }),
    )

    expect(result.current.toolbarPosition).toEqual({
      x: 100,
      y: 56, // 100 - 44 (TOOLBAR_OFFSET_Y)
    })
    expect(result.current.toolbarElement).toEqual({
      id: 'rect-1',
      type: 'rect',
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
      cornerRadius: 5,
    })
    expect(result.current.selectedElement).toEqual(element)
  })

  it('clamps toolbar position to y >= 0', () => {
    const element = createRectElement({ y: 20 })
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [element],
        selectedIds: new Set(['rect-1']),
      }),
    )

    expect(result.current.toolbarPosition).toEqual({
      x: 100,
      y: 0, // Clamped from 20 - 44 = -24
    })
  })

  it('returns cornerRadius as undefined for non-rect elements', () => {
    const element = createEllipseElement()
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [element],
        selectedIds: new Set(['ellipse-1']),
      }),
    )

    expect(result.current.toolbarElement).toEqual({
      id: 'ellipse-1',
      type: 'ellipse',
      fill: '#ff0000',
      stroke: '#0000ff',
      strokeWidth: 3,
      cornerRadius: undefined,
    })
  })

  it('uses first selected element when multiple are selected', () => {
    const rect = createRectElement()
    const ellipse = createEllipseElement()
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [rect, ellipse],
        selectedIds: new Set(['rect-1', 'ellipse-1']),
      }),
    )

    // Should use the first element from the Set (order is insertion order)
    expect(result.current.toolbarElement?.id).toBe('rect-1')
  })

  it('memoizes toolbarElement to prevent unnecessary re-renders', () => {
    const element = createRectElement()
    const { result, rerender } = renderHook(
      ({ elements, selectedIds }) =>
        useFloatingToolbar({ elements, selectedIds }),
      {
        initialProps: {
          elements: [element],
          selectedIds: new Set(['rect-1']),
        },
      },
    )

    const firstToolbarElement = result.current.toolbarElement

    // Rerender with same element (different array reference, same values)
    rerender({
      elements: [{ ...element }],
      selectedIds: new Set(['rect-1']),
    })

    // toolbarElement should be the same reference (memoized)
    expect(result.current.toolbarElement).toEqual(firstToolbarElement)
  })

  it('updates toolbarElement when style properties change', () => {
    const element = createRectElement()
    const { result, rerender } = renderHook(
      ({ elements, selectedIds }) =>
        useFloatingToolbar({ elements, selectedIds }),
      {
        initialProps: {
          elements: [element],
          selectedIds: new Set(['rect-1']),
        },
      },
    )

    expect(result.current.toolbarElement?.fill).toBe('#ffffff')

    // Rerender with changed fill color
    rerender({
      elements: [{ ...element, fill: '#ff0000' }],
      selectedIds: new Set(['rect-1']),
    })

    expect(result.current.toolbarElement?.fill).toBe('#ff0000')
  })

  it('returns null selectedElement when element not found', () => {
    const { result } = renderHook(() =>
      useFloatingToolbar({
        elements: [createRectElement()],
        selectedIds: new Set(['non-existent']),
      }),
    )

    expect(result.current.selectedElement).toBeNull()
    expect(result.current.toolbarPosition).toBeNull()
    expect(result.current.toolbarElement).toBeNull()
  })
})
