import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMarqueeSelection } from './useMarqueeSelection'
import type { WireframeElement } from '@/types/shapes'
import type { KonvaEventObject } from 'konva/lib/Node'

// Mock intersectsBoundingBox
vi.mock('@/lib/shapes', () => ({
  intersectsBoundingBox: (el: WireframeElement, rect: { x: number; y: number; width: number; height: number }) => {
    // Simple mock: check if element's x/y falls within the rect
    const minX = Math.min(rect.x, rect.x + rect.width)
    const maxX = Math.max(rect.x, rect.x + rect.width)
    const minY = Math.min(rect.y, rect.y + rect.height)
    const maxY = Math.max(rect.y, rect.y + rect.height)
    return el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY
  },
}))

const createMockElement = (id: string, x: number, y: number): WireframeElement => ({
  id,
  type: 'rect',
  x,
  y,
  width: 50,
  height: 50,
  cornerRadius: 0,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label: '',
})

describe('useMarqueeSelection', () => {
  const mockGetPointerPosition = vi.fn<() => { x: number; y: number } | null>()
  const mockStageRef = {
    current: {
      getPointerPosition: mockGetPointerPosition,
    },
  } as unknown as React.RefObject<import('konva').default.Stage | null>

  const mockSelectElements = vi.fn<(ids: Set<string>) => void>()
  const mockClearSelection = vi.fn<() => void>()
  const mockOnMouseMoveFallback = vi.fn<(e: KonvaEventObject<MouseEvent>) => void>()

  const defaultOptions = {
    stageRef: mockStageRef,
    elements: [] as WireframeElement[],
    isArrowTool: false,
    isReconnecting: false,
    activeTool: null,
    selectElements: mockSelectElements,
    clearSelection: mockClearSelection,
    onMouseMoveFallback: mockOnMouseMoveFallback,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null marquee initially', () => {
    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))
    expect(result.current.marquee).toBeNull()
  })

  it('starts marquee on mousedown when clicking empty stage', () => {
    mockGetPointerPosition.mockReturnValue({ x: 100, y: 100 })

    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))

    const mockEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(result.current.marquee).toEqual({
      startX: 100,
      startY: 100,
      currentX: 100,
      currentY: 100,
    })
  })

  it('does not start marquee when activeTool is set', () => {
    mockGetPointerPosition.mockReturnValue({ x: 100, y: 100 })

    const { result } = renderHook(() =>
      useMarqueeSelection({ ...defaultOptions, activeTool: 'rect' }),
    )

    const mockEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(result.current.marquee).toBeNull()
  })

  it('does not start marquee when isArrowTool is true', () => {
    mockGetPointerPosition.mockReturnValue({ x: 100, y: 100 })

    const { result } = renderHook(() =>
      useMarqueeSelection({ ...defaultOptions, isArrowTool: true }),
    )

    const mockEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(result.current.marquee).toBeNull()
  })

  it('does not start marquee when isReconnecting is true', () => {
    mockGetPointerPosition.mockReturnValue({ x: 100, y: 100 })

    const { result } = renderHook(() =>
      useMarqueeSelection({ ...defaultOptions, isReconnecting: true }),
    )

    const mockEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(result.current.marquee).toBeNull()
  })

  it('does not start marquee when clicking on a shape (not stage)', () => {
    mockGetPointerPosition.mockReturnValue({ x: 100, y: 100 })

    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))

    const mockEvent = {
      target: { id: 'some-shape' }, // Different from stageRef.current
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(result.current.marquee).toBeNull()
  })

  it('updates marquee on mousemove when active', () => {
    mockGetPointerPosition
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 150 })

    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))

    const mockDownEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    const mockMoveEvent = {} as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockDownEvent)
    })

    act(() => {
      result.current.handleMouseMove(mockMoveEvent)
    })

    expect(result.current.marquee).toEqual({
      startX: 100,
      startY: 100,
      currentX: 200,
      currentY: 150,
    })
  })

  it('calls fallback handler on mousemove when marquee is not active', () => {
    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))

    const mockMoveEvent = {} as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseMove(mockMoveEvent)
    })

    expect(mockOnMouseMoveFallback).toHaveBeenCalledWith(mockMoveEvent)
  })

  it('selects elements on mouseup when marquee covers them', () => {
    const elements = [
      createMockElement('el-1', 120, 120),
      createMockElement('el-2', 300, 300),
    ]

    mockGetPointerPosition
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 })

    const { result } = renderHook(() =>
      useMarqueeSelection({ ...defaultOptions, elements }),
    )

    const mockDownEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockDownEvent)
    })

    act(() => {
      result.current.handleMouseMove({} as KonvaEventObject<MouseEvent>)
    })

    act(() => {
      result.current.handleMouseUp({} as KonvaEventObject<MouseEvent>)
    })

    expect(mockSelectElements).toHaveBeenCalledWith(new Set(['el-1']))
    expect(result.current.marquee).toBeNull()
  })

  it('clears selection on mouseup when marquee covers no elements', () => {
    const elements = [createMockElement('el-1', 500, 500)]

    mockGetPointerPosition
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 200, y: 200 })

    const { result } = renderHook(() =>
      useMarqueeSelection({ ...defaultOptions, elements }),
    )

    const mockDownEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockDownEvent)
    })

    act(() => {
      result.current.handleMouseMove({} as KonvaEventObject<MouseEvent>)
    })

    act(() => {
      result.current.handleMouseUp({} as KonvaEventObject<MouseEvent>)
    })

    expect(mockClearSelection).toHaveBeenCalled()
    expect(mockSelectElements).not.toHaveBeenCalled()
  })

  it('does not select on tiny drag (less than MIN_MARQUEE_DRAG)', () => {
    mockGetPointerPosition
      .mockReturnValueOnce({ x: 100, y: 100 })
      .mockReturnValueOnce({ x: 102, y: 102 }) // Only 2px drag

    const { result } = renderHook(() => useMarqueeSelection(defaultOptions))

    const mockDownEvent = {
      target: mockStageRef.current,
    } as unknown as KonvaEventObject<MouseEvent>

    act(() => {
      result.current.handleMouseDown(mockDownEvent)
    })

    act(() => {
      result.current.handleMouseMove({} as KonvaEventObject<MouseEvent>)
    })

    act(() => {
      result.current.handleMouseUp({} as KonvaEventObject<MouseEvent>)
    })

    expect(mockSelectElements).not.toHaveBeenCalled()
    expect(mockClearSelection).not.toHaveBeenCalled()
    expect(result.current.marquee).toBeNull()
  })
})
