import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@/components/Canvas/Canvas'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { useCanvasStore } from '@/store/canvasStore'

export default function App() {
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)
  const activeTool = useCanvasStore((s) => s.activeTool)

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
      <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} />
      <main
        ref={canvasContainerRef}
        className="flex-1 overflow-hidden"
        aria-label="Canvas"
      >
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Canvas width={canvasSize.width} height={canvasSize.height} />
        )}
      </main>
    </div>
  )
}
