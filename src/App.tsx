import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@/components/Canvas/Canvas'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { LayersPanel } from '@/components/LayersPanel/LayersPanel'
import { useCanvasStore } from '@/store/canvasStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function App() {
  const elements = useCanvasStore((s) => s.elements)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const selectElements = useCanvasStore((s) => s.selectElements)
  const toggleElementSelection = useCanvasStore((s) => s.toggleElementSelection)
  const updateElement = useCanvasStore((s) => s.updateElement)
  const moveElementTo = useCanvasStore((s) => s.moveElementTo)
  const bringToFront = useCanvasStore((s) => s.bringToFront)
  const sendToBack = useCanvasStore((s) => s.sendToBack)

  const handleLayerSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) {
        toggleElementSelection(id)
      } else {
        selectElements(new Set([id]))
      }
    },
    [selectElements, toggleElementSelection],
  )

  // Global keyboard shortcuts — tool activation, delete, escape, ctrl+d duplicate
  useKeyboardShortcuts({})

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Measure the canvas container and keep dimensions in sync on resize
  useEffect(() => {
    const el = canvasContainerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setCanvasSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    })

    observer.observe(el)
    // Set initial size
    setCanvasSize({
      width: Math.floor(el.clientWidth),
      height: Math.floor(el.clientHeight),
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Toolbar />
      <main
        ref={canvasContainerRef}
        className="flex-1 overflow-hidden"
        aria-label="Canvas"
      >
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Canvas width={canvasSize.width} height={canvasSize.height} />
        )}
      </main>
      <LayersPanel
        elements={elements}
        selectedIds={selectedIds}
        onSelect={handleLayerSelect}
        onUpdate={updateElement}
        onMoveElementTo={moveElementTo}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
      />
    </div>
  )
}
