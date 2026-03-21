/**
 * FloatingToolbar — a small HTML overlay panel that appears above the selected
 * shape and provides controls for fill color, stroke color, stroke width, and
 * (for rects) corner radius.
 *
 * Purely prop-driven — no store access.
 */
import type { WireframeElement, ElementUpdate, RectElement } from '@/types/shapes'

export interface FloatingToolbarProps {
  element: WireframeElement
  /** Canvas-space position of the top-left corner of the toolbar (pixels from stage top-left) */
  position: { x: number; y: number }
  onUpdate: (update: ElementUpdate) => void
}

export function FloatingToolbar({ element, position, onUpdate }: FloatingToolbarProps) {
  const isFillTransparent = element.fill === 'transparent' || element.fill === ''

  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ id: element.id, fill: e.target.value })
  }

  const handleFillTransparentToggle = () => {
    onUpdate({ id: element.id, fill: isFillTransparent ? '#ffffff' : 'transparent' })
  }

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ id: element.id, stroke: e.target.value })
  }

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(20, Math.max(1, Number(e.target.value)))
    onUpdate({ id: element.id, strokeWidth: value })
  }

  const handleCornerRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Number(e.target.value))
    onUpdate({ id: element.id, cornerRadius: value } as ElementUpdate<RectElement>)
  }

  return (
    <div
      role="toolbar"
      data-testid="floating-toolbar"
      style={{ left: position.x, top: position.y }}
      className="absolute z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
      // Prevent clicks inside the toolbar from bubbling to the canvas Stage
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Fill color */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500">Fill</span>
        <button
          data-testid="fill-transparent-toggle"
          title={isFillTransparent ? 'Set fill color' : 'Make fill transparent'}
          aria-pressed={isFillTransparent}
          onClick={handleFillTransparentToggle}
          className={`flex h-6 w-6 items-center justify-center rounded border text-xs ${
            isFillTransparent
              ? 'border-blue-400 bg-blue-50 text-blue-600'
              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          ∅
        </button>
        {!isFillTransparent && (
          <input
            data-testid="fill-color-input"
            type="color"
            value={element.fill}
            onChange={handleFillColorChange}
            className="h-6 w-6 cursor-pointer rounded border border-gray-300 p-0"
            title="Fill color"
          />
        )}
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Stroke color */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="stroke-color-input" className="text-xs font-medium text-gray-500">Border</label>
        <input
          id="stroke-color-input"
          data-testid="stroke-color-input"
          type="color"
          value={element.stroke}
          onChange={handleStrokeColorChange}
          className="h-6 w-6 cursor-pointer rounded border border-gray-300 p-0"
          title="Border color"
        />
      </div>

      {/* Stroke width */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="stroke-width-input" className="text-xs font-medium text-gray-500">Width</label>
        <input
          id="stroke-width-input"
          data-testid="stroke-width-input"
          type="number"
          min={1}
          max={20}
          value={element.strokeWidth}
          onChange={handleStrokeWidthChange}
          className="h-6 w-12 rounded border border-gray-300 px-1 text-xs"
          title="Border width"
        />
      </div>

      {/* Corner radius — rects only */}
      {element.type === 'rect' && (
        <>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <label htmlFor="corner-radius-input" className="text-xs font-medium text-gray-500">Radius</label>
            <input
              id="corner-radius-input"
              data-testid="corner-radius-input"
              type="number"
              min={0}
              value={(element as RectElement).cornerRadius}
              onChange={handleCornerRadiusChange}
              className="h-6 w-12 rounded border border-gray-300 px-1 text-xs"
              title="Corner radius"
            />
          </div>
        </>
      )}
    </div>
  )
}
