/**
 * useKeyboardShortcuts — global keyboard shortcut handler.
 *
 * Reads state and actions directly from the canvas store so it can be placed
 * high in the component tree (e.g. App.tsx) without prop-drilling.
 *
 * Registered shortcuts:
 * - R / E / L / A   — activate / toggle the matching shape tool
 * - Delete / Backspace — remove all selected elements then clear selection
 * - Escape           — deactivate the active tool; optionally cancel arrow drawing
 * - Ctrl+D / Cmd+D  — duplicate selected elements at (+20, +20) offset
 */
import { useEffect } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { TOOLS } from '@/lib/toolConfig'

export interface UseKeyboardShortcutsOptions {
  /** Called on Escape when an arrow draw is in progress */
  onCancelArrow?: () => void
}

export function useKeyboardShortcuts({ onCancelArrow }: UseKeyboardShortcutsOptions = {}) {
  const activeTool = useCanvasStore((s) => s.activeTool)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)
  const removeElement = useCanvasStore((s) => s.removeElement)
  const selectElements = useCanvasStore((s) => s.selectElements)
  const addElement = useCanvasStore((s) => s.addElement)
  const getElementById = useCanvasStore((s) => s.getElementById)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focus is inside an editable element
      const target = document.activeElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      const key = e.key

      // Escape — deactivate active tool, cancel arrow if in progress
      if (key === 'Escape') {
        setActiveTool(null)
        onCancelArrow?.()
        return
      }

      // Delete / Backspace — remove all selected elements
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault()
        for (const id of selectedIds) {
          removeElement(id)
        }
        selectElements(new Set())
        return
      }

      // Ctrl+D / Cmd+D — duplicate selected elements
      if (key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (selectedIds.size === 0) return

        const newIds = new Set<string>()
        for (const id of selectedIds) {
          const el = getElementById(id)
          if (!el) continue

          const newId = crypto.randomUUID()
          // Build a copy with a new id and offset position
          if (el.type === 'arrow') {
            // Arrow positions are stored as points (absolute canvas coords)
            addElement({
              ...el,
              id: newId,
              points: el.points.map((v, i) => v + (i % 2 === 0 ? 20 : 20)),
            })
          } else {
            addElement({
              ...el,
              id: newId,
              x: (el as { x: number }).x + 20,
              y: (el as { y: number }).y + 20,
            })
          }
          newIds.add(newId)
        }
        selectElements(newIds)
        return
      }

      // Tool shortcut — no modifier keys allowed
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const matchedTool = TOOLS.find(
        (t) => t.shortcut.toLowerCase() === key.toLowerCase(),
      )
      if (matchedTool) {
        // Toggle: pressing the same key again deactivates the tool
        setActiveTool(activeTool === matchedTool.type ? null : matchedTool.type)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, selectedIds, setActiveTool, removeElement, selectElements, addElement, getElementById, onCancelArrow])
}
