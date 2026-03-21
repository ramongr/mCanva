import { Rect, Group, Text } from 'react-konva'
import type { RectElement } from '@/types/shapes'
import type { KonvaPointerEvent, KonvaDragEvent } from '@/types/konva'

export interface RectShapeProps {
  element: RectElement
  isSelected: boolean
  onSelect: (id: string, addToSelection: boolean) => void
  onChange: (update: Partial<Omit<RectElement, 'id' | 'type'>>) => void
  onEditLabel?: (id: string) => void
  onDragMove?: (id: string, x: number, y: number) => void
}

const SELECTION_COLOR = '#0099ff'
const SELECTION_PADDING = 3

export function RectShape({ element, isSelected, onSelect, onChange, onEditLabel, onDragMove }: RectShapeProps) {
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
      name="rect"
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
        <Rect
          x={-SELECTION_PADDING}
          y={-SELECTION_PADDING}
          width={element.width + SELECTION_PADDING * 2}
          height={element.height + SELECTION_PADDING * 2}
          cornerRadius={element.cornerRadius}
          fill="transparent"
          stroke={SELECTION_COLOR}
          strokeWidth={2}
          listening={false}
        />
      )}
      <Rect
        name="shape-body"
        x={0}
        y={0}
        width={element.width}
        height={element.height}
        cornerRadius={element.cornerRadius}
        fill={element.fill}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
      />
      {element.label && (
        <Text
          name="shape-label"
          text={element.label}
          x={0}
          y={0}
          width={element.width}
          height={element.height}
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
