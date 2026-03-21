import { Line, Group } from 'react-konva'
import type { LineElement } from '@/types/shapes'
import type { KonvaPointerEvent, KonvaDragEvent } from '@/types/konva'

export interface LineShapeProps {
  element: LineElement
  isSelected: boolean
  onSelect: (id: string) => void
  onChange: (update: Partial<Omit<LineElement, 'id' | 'type'>>) => void
}

const SELECTION_COLOR = '#0099ff'
const SELECTION_EXTRA_WIDTH = 4

export function LineShape({ element, isSelected, onSelect, onChange }: LineShapeProps) {
  const handleClick = (e: KonvaPointerEvent) => {
    e.cancelBubble = true
    onSelect(element.id)
  }

  const handleDragEnd = (e: KonvaDragEvent) => {
    onChange({ x: e.target.x(), y: e.target.y() })
  }

  return (
    <Group
      id={element.id}
      name="line"
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      visible={element.visible}
      draggable={!element.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
    >
      {isSelected && (
        <Line
          points={element.points}
          stroke={SELECTION_COLOR}
          strokeWidth={element.strokeWidth + SELECTION_EXTRA_WIDTH}
          lineCap="round"
          lineJoin="round"
          listening={false}
          opacity={0.4}
        />
      )}
      <Line
        name="shape-body"
        x={0}
        y={0}
        points={element.points}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  )
}
