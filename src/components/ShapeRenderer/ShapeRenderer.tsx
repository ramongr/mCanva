/**
 * ShapeRenderer — single dispatch point that maps a WireframeElement to
 * the correct shape component. Keeps Canvas.tsx free of switch/if logic.
 *
 * Purely prop-driven — no store access.
 */
import type { WireframeElement } from '@/types/shapes'
import type { ArrowElement, EllipseElement, LineElement, RectElement } from '@/types/shapes'
import { RectShape } from '@/components/shapes/RectShape'
import { EllipseShape } from '@/components/shapes/EllipseShape'
import { LineShape } from '@/components/shapes/LineShape'
import { ArrowShape } from '@/components/shapes/ArrowShape'
import type { ArrowDragEndPayload } from '@/components/shapes/ArrowShape'

export interface ShapeRendererProps {
  element: WireframeElement
  isSelected: boolean
  onSelect: (id: string) => void
  onChange: (id: string, update: Partial<Omit<WireframeElement, 'id' | 'type'>>) => void
  onEditLabel?: (id: string) => void
  onEndpointClick?: (arrowId: string, endpoint: 'from' | 'to') => void
  onDragMove?: (id: string, x: number, y: number) => void
  onArrowDragEnd?: (arrowId: string, payload: ArrowDragEndPayload) => void
  onEndpointDragEnd?: (arrowId: string, endpoint: 'from' | 'to', position: { x: number; y: number }) => void
}

export function ShapeRenderer({ element, isSelected, onSelect, onChange, onEditLabel, onEndpointClick, onDragMove, onArrowDragEnd, onEndpointDragEnd }: ShapeRendererProps) {
  const handleChange = (update: Partial<Omit<WireframeElement, 'id' | 'type'>>) =>
    onChange(element.id, update)

  switch (element.type) {
    case 'rect':
      return (
        <RectShape
          element={element as RectElement}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={handleChange}
          onEditLabel={onEditLabel}
          onDragMove={onDragMove}
        />
      )
    case 'ellipse':
      return (
        <EllipseShape
          element={element as EllipseElement}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={handleChange}
          onEditLabel={onEditLabel}
          onDragMove={onDragMove}
        />
      )
    case 'line':
      return (
        <LineShape
          element={element as LineElement}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={handleChange}
        />
      )
    case 'arrow':
      return (
        <ArrowShape
          element={element as ArrowElement}
          isSelected={isSelected}
          onSelect={onSelect}
          onChange={handleChange}
          onEndpointClick={onEndpointClick}
          onArrowDragEnd={onArrowDragEnd}
          onEndpointDragEnd={onEndpointDragEnd}
        />
      )
  }
}
