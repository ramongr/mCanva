import type { ShapeType } from '@/types/shapes'
import { TOOLS } from '@/lib/toolConfig'
import { useCanvasStore } from '@/store/canvasStore'

export function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)

  const handleClick = (type: ShapeType) => {
    // Clicking the active tool again deactivates it (back to select mode)
    setActiveTool(activeTool === type ? null : type)
  }

  return (
    <aside
      aria-label="Drawing tools"
      className="flex flex-col gap-2 p-3 bg-white border-r border-gray-200 shadow-sm"
    >
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.type
        return (
          <button
            key={tool.type}
            aria-label={tool.description}
            aria-pressed={isActive}
            title={`${tool.label} (${tool.shortcut})`}
            onClick={() => handleClick(tool.type)}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100',
            ].join(' ')}
          >
            <span className="w-4 text-center text-xs font-mono opacity-60">{tool.shortcut}</span>
            {tool.label}
          </button>
        )
      })}
    </aside>
  )
}
