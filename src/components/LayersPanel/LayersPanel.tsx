import React, { useState, useRef, useCallback } from 'react'
import type { ElementUpdate, WireframeElement } from '@/types/shapes'

interface LayersPanelProps {
  elements: WireframeElement[]
  selectedIds: Set<string>
  onSelect: (id: string, shiftKey: boolean) => void
  onUpdate: (update: ElementUpdate) => void
  onMoveElementTo: (id: string, targetIndex: number) => void
  onBringToFront: (id: string) => void
  onSendToBack: (id: string) => void
}

interface EditingState {
  id: string
  value: string
}

export function LayersPanel({
  elements,
  selectedIds,
  onSelect,
  onUpdate,
  onMoveElementTo: _onMoveElementTo,
  onBringToFront,
  onSendToBack,
}: LayersPanelProps) {
  const [editing, setEditing] = useState<EditingState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayLabel = useCallback(
    (el: WireframeElement) => el.label || el.type,
    [],
  )

  const startEditing = useCallback(
    (e: React.MouseEvent, el: WireframeElement) => {
      e.stopPropagation()
      setEditing({ id: el.id, value: el.label || '' })
      // Focus input on next tick after render
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    [],
  )

  const commitEditing = useCallback(() => {
    if (editing) {
      onUpdate({ id: editing.id, label: editing.value })
      setEditing(null)
    }
  }, [editing, onUpdate])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitEditing()
      } else if (e.key === 'Escape') {
        setEditing(null)
      }
    },
    [commitEditing],
  )

  // Render in reverse z-order: top-most element first
  const reversedElements = [...elements].reverse()

  return (
    <aside
      className="flex h-full w-56 flex-shrink-0 flex-col border-l border-gray-200 bg-white"
      data-testid="layers-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-sm font-semibold text-gray-700">Layers</span>
        <span
          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
          data-testid="layers-count"
        >
          {elements.length}
        </span>
      </div>

      {/* Layer rows */}
      <div className="flex-1 overflow-y-auto">
        {reversedElements.map((el) => {
          const isSelected = selectedIds.has(el.id)
          const isEditing = editing?.id === el.id

          return (
            <div
              key={el.id}
              data-testid={`layer-row-${el.id}`}
              className={`flex cursor-pointer items-center gap-1 px-2 py-1.5 text-sm ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={(e) => onSelect(el.id, e.shiftKey)}
            >
              {/* Eye (visible) toggle */}
              <button
                data-testid={`layer-visible-${el.id}`}
                className={`flex-shrink-0 rounded p-0.5 hover:bg-gray-200 ${
                  el.visible ? 'text-gray-600' : 'text-gray-300'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate({ id: el.id, visible: !el.visible })
                }}
                title={el.visible ? 'Hide' : 'Show'}
                aria-label={el.visible ? 'Hide element' : 'Show element'}
              >
                {el.visible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path
                      fillRule="evenodd"
                      d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
                      clipRule="evenodd"
                    />
                    <path d="m10.748 13.93 2.523 2.524a10.005 10.005 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                  </svg>
                )}
              </button>

              {/* Lock toggle */}
              <button
                data-testid={`layer-lock-${el.id}`}
                className={`flex-shrink-0 rounded p-0.5 hover:bg-gray-200 ${
                  el.locked ? 'text-amber-500' : 'text-gray-300'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate({ id: el.id, locked: !el.locked })
                }}
                title={el.locked ? 'Unlock' : 'Lock'}
                aria-label={el.locked ? 'Unlock element' : 'Lock element'}
              >
                {el.locked ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.5 1A4.5 4.5 0 0 0 10 5.5V9H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5V5.5a3 3 0 1 1 6 0v2.75a.75.75 0 0 0 1.5 0V5.5A4.5 4.5 0 0 0 14.5 1Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              {/* Type badge */}
              <span className="flex-shrink-0 rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-500">
                {el.type}
              </span>

              {/* Label — inline editing or display */}
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    data-testid={`layer-label-input-${el.id}`}
                    className="w-full rounded border border-blue-400 px-1 py-0 text-xs outline-none"
                    value={editing.value}
                    onChange={(e) =>
                      setEditing({ id: el.id, value: e.target.value })
                    }
                    onBlur={commitEditing}
                    onKeyDown={handleInputKeyDown}
                  />
                ) : (
                  <span
                    data-testid={`layer-label-${el.id}`}
                    className="block truncate text-xs text-gray-700"
                    onClick={(e) => startEditing(e, el)}
                    title={displayLabel(el)}
                  >
                    {displayLabel(el)}
                  </span>
                )}
              </div>

              {/* Bring to front / Send to back buttons */}
              <button
                data-testid={`layer-bring-front-${el.id}`}
                className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  onBringToFront(el.id)
                }}
                title="Bring to front"
                aria-label="Bring to front"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                data-testid={`layer-send-back-${el.id}`}
                className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  onSendToBack(el.id)
                }}
                title="Send to back"
                aria-label="Send to back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )
        })}

        {elements.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            No layers yet
          </div>
        )}
      </div>
    </aside>
  )
}
