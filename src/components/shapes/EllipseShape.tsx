import { Ellipse, Group, Text } from 'react-konva'
import type { EllipseElement } from '@/types/shapes'
import type { KonvaPointerEvent, KonvaDragEvent } from '@/types/konva'

export interface EllipseShapeProps {
  element: EllipseElement
  isSelected: boolean
  onSelect: (id: string, addToSelection: boolean) => void
  onChange: (update: Partial<Omit<EllipseElement, 'id' | 'type'>>) => void
  onEditLabel?: (id: string) => void
  onDragMove?: (id: string, x: number, y: number) => void
}

const SELECTION_COLOR = '#0099ff'
const SELECTION_PADDING = 3

export function EllipseShape({ element, isSelected, onSelect, onChange, onEditLabel, onDragMove }: EllipseShapeProps) {
  const handleClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onSelect(element.id, e.evt?.shiftKey ?? false)
  }

  const handleDblClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onEditLabel?.(element.id)
  }

  const handleDragMove = (e: KonvaDragEvent) => {
    onDragMove?.(element.id, e.target.x(), e.target.y())
  }

  const handleDragEnd = (e: KonvaDragEvent) => {
    onChange({ x: e.target.x(), y: e.target.y() })
  }

  return (
    <Group
      id={element.id}
      name="ellipse"
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      visible={element.visible}
      draggable={!element.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {isSelected && (
        <Ellipse
          x={0}
          y={0}
          radiusX={element.radiusX + SELECTION_PADDING}
          radiusY={element.radiusY + SELECTION_PADDING}
          fill="transparent"
          stroke={SELECTION_COLOR}
          strokeWidth={2}
          listening={false}
        />
      )}
      <Ellipse
        name="shape-body"
        x={0}
        y={0}
        radiusX={element.radiusX}
        radiusY={element.radiusY}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
      />
      {element.label && (
        <Text
          name="shape-label"
          text={element.label}
          x={-element.radiusX}
          y={-element.radiusY}
          width={element.radiusX * 2}
          height={element.radiusY * 2}
          align="center"
          verticalAlign="middle"
          fontSize={14}
          fill="#1a1a1a"
          listening={false}
          wrap="word"
        />
      )}
    </Group>
  )
}
