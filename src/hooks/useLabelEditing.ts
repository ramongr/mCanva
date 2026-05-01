/**
 * useLabelEditing — encapsulates inline label editing logic.
 *
 * Manages the state and handlers for editing text labels on canvas elements.
 * Supports commit on Enter, cancel on Escape, and blur behavior.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type { WireframeElement, BoundingBox } from '@/types/shapes'
import { getBoundingBox } from '@/lib/shapes'

export interface UseLabelEditingOptions {
  /** All elements on the canvas (used to find editing element) */
  elements: WireframeElement[]
  /** Called to update an element's label */
  updateElement: (update: { id: string; label: string }) => void
  /** Optional callback when Escape is pressed while not editing (e.g., cancel arrow tool) */
  onEscapeNotEditing?: () => void
}

export interface UseLabelEditingResult {
  /** ID of the element currently being edited, or null */
  editingLabelId: string | null
  /** The element currently being edited, or null */
  editingElement: WireframeElement | null
  /** Style object for positioning the textarea over the element */
  textareaStyle: React.CSSProperties | null
  /** Ref for the textarea element (auto-focused when editing starts) */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Start editing a specific element's label */
  startEditing: (id: string) => void
  /** Cancel editing without saving */
  cancelEditing: () => void
  /** Handler for textarea blur event */
  handleBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  /** Handler for textarea keydown event */
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

/**
 * Hook for managing inline label editing on canvas elements.
 *
 * Usage:
 * ```tsx
 * const {
 *   editingLabelId,
 *   textareaStyle,
 *   textareaRef,
 *   startEditing,
 *   handleBlur,
 *   handleKeyDown,
 * } = useLabelEditing({ elements, updateElement })
 *
 * // In ShapeRenderer:
 * <Shape onDoubleClick={() => startEditing(element.id)} />
 *
 * // Textarea overlay:
 * {editingLabelId && textareaStyle && (
 *   <textarea
 *     ref={textareaRef}
 *     style={textareaStyle}
 *     defaultValue={editingElement?.label}
 *     onBlur={handleBlur}
 *     onKeyDown={handleKeyDown}
 *   />
 * )}
 * ```
 */
export function useLabelEditing({
  elements,
  updateElement,
  onEscapeNotEditing,
}: UseLabelEditingOptions): UseLabelEditingResult {
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Find the element being edited
  const editingElement = editingLabelId
    ? elements.find((el) => el.id === editingLabelId) ?? null
    : null

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (editingLabelId && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editingLabelId])

  // Compute textarea position over the element
  let textareaStyle: React.CSSProperties | null = null
  if (editingElement) {
    const bb: BoundingBox = getBoundingBox(editingElement)
    textareaStyle = {
      position: 'absolute',
      left: bb.x,
      top: bb.y,
      width: Math.max(bb.width, 80),
      height: Math.max(bb.height, 32),
      resize: 'none',
      border: '2px solid #0078ff',
      outline: 'none',
      background: 'white',
      padding: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      fontSize: '14px',
      zIndex: 1000,
    }
  }

  const startEditing = useCallback((id: string) => {
    setEditingLabelId(id)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingLabelId(null)
  }, [])

  const commitLabel = useCallback(
    (value: string) => {
      if (editingLabelId) {
        updateElement({ id: editingLabelId, label: value })
        setEditingLabelId(null)
      }
    },
    [editingLabelId, updateElement],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      commitLabel(e.target.value)
    },
    [commitLabel],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        commitLabel((e.target as HTMLTextAreaElement).value)
      }
      if (e.key === 'Escape') {
        if (editingLabelId) {
          setEditingLabelId(null)
        } else {
          onEscapeNotEditing?.()
        }
      }
    },
    [editingLabelId, commitLabel, onEscapeNotEditing],
  )

  return {
    editingLabelId,
    editingElement,
    textareaStyle,
    textareaRef,
    startEditing,
    cancelEditing,
    handleBlur,
    handleKeyDown,
  }
}
