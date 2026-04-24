import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLabelEditing } from './useLabelEditing'
import type { WireframeElement } from '@/types/shapes'

// Mock getBoundingBox
vi.mock('@/lib/shapes', () => ({
  getBoundingBox: (el: WireframeElement) => ({
    x: el.x,
    y: el.y,
    width: (el as { width?: number }).width ?? 100,
    height: (el as { height?: number }).height ?? 50,
  }),
}))

const createMockElement = (id: string, label: string = ''): WireframeElement => ({
  id,
  type: 'rect',
  x: 100,
  y: 100,
  width: 150,
  height: 80,
  cornerRadius: 0,
  fill: '#fff',
  stroke: '#000',
  strokeWidth: 2,
  rotation: 0,
  locked: false,
  visible: true,
  label,
})

describe('useLabelEditing', () => {
  const mockUpdateElement = vi.fn<(update: { id: string; label: string }) => void>()
  const mockOnEscapeNotEditing = vi.fn<() => void>()

  const defaultOptions = {
    elements: [createMockElement('el-1', 'Test Label')],
    updateElement: mockUpdateElement,
    onEscapeNotEditing: mockOnEscapeNotEditing,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null editingLabelId initially', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))
    expect(result.current.editingLabelId).toBeNull()
    expect(result.current.editingElement).toBeNull()
    expect(result.current.textareaStyle).toBeNull()
  })

  it('starts editing when startEditing is called', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    expect(result.current.editingLabelId).toBe('el-1')
    expect(result.current.editingElement).toEqual(defaultOptions.elements[0])
    expect(result.current.textareaStyle).not.toBeNull()
  })

  it('returns null editingElement when element not found', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('non-existent')
    })

    expect(result.current.editingLabelId).toBe('non-existent')
    expect(result.current.editingElement).toBeNull()
    expect(result.current.textareaStyle).toBeNull()
  })

  it('computes correct textareaStyle', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    expect(result.current.textareaStyle).toMatchObject({
      position: 'absolute',
      left: 100,
      top: 100,
      width: 150, // Max of bb.width and 80
      height: 80, // Max of bb.height and 32
    })
  })

  it('commits label on blur', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    const mockBlurEvent = {
      target: { value: 'New Label' },
    } as unknown as React.FocusEvent<HTMLTextAreaElement>

    act(() => {
      result.current.handleBlur(mockBlurEvent)
    })

    expect(mockUpdateElement).toHaveBeenCalledWith({ id: 'el-1', label: 'New Label' })
    expect(result.current.editingLabelId).toBeNull()
  })

  it('commits label on Enter key', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    const mockKeyEvent = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: vi.fn(),
      target: { value: 'Enter Label' },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

    act(() => {
      result.current.handleKeyDown(mockKeyEvent)
    })

    expect(mockKeyEvent.preventDefault).toHaveBeenCalled()
    expect(mockUpdateElement).toHaveBeenCalledWith({ id: 'el-1', label: 'Enter Label' })
    expect(result.current.editingLabelId).toBeNull()
  })

  it('does not commit on Shift+Enter (allows newline)', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    const mockKeyEvent = {
      key: 'Enter',
      shiftKey: true,
      preventDefault: vi.fn(),
      target: { value: 'Multiline\nLabel' },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

    act(() => {
      result.current.handleKeyDown(mockKeyEvent)
    })

    expect(mockKeyEvent.preventDefault).not.toHaveBeenCalled()
    expect(mockUpdateElement).not.toHaveBeenCalled()
    expect(result.current.editingLabelId).toBe('el-1')
  })

  it('cancels editing on Escape key while editing', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    const mockKeyEvent = {
      key: 'Escape',
      target: { value: 'Unsaved' },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

    act(() => {
      result.current.handleKeyDown(mockKeyEvent)
    })

    expect(mockUpdateElement).not.toHaveBeenCalled() // No commit on escape
    expect(result.current.editingLabelId).toBeNull()
    expect(mockOnEscapeNotEditing).not.toHaveBeenCalled()
  })

  it('calls onEscapeNotEditing when Escape pressed while not editing', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    const mockKeyEvent = {
      key: 'Escape',
      target: { value: '' },
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

    act(() => {
      result.current.handleKeyDown(mockKeyEvent)
    })

    expect(mockOnEscapeNotEditing).toHaveBeenCalled()
  })

  it('cancelEditing clears editingLabelId', () => {
    const { result } = renderHook(() => useLabelEditing(defaultOptions))

    act(() => {
      result.current.startEditing('el-1')
    })

    expect(result.current.editingLabelId).toBe('el-1')

    act(() => {
      result.current.cancelEditing()
    })

    expect(result.current.editingLabelId).toBeNull()
  })
})
