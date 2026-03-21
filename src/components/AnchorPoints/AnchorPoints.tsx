/**
 * AnchorPoints — renders Konva Circle anchor indicators at the four edge
 * midpoints of each shape. Only rendered when the arrow tool is active.
 *
 * Purely prop-driven — no store access.
 */
import { Circle } from 'react-konva'
import type { WireframeElement, AnchorPosition, ArrowConnection } from '@/types/shapes'
import { getAnchorPoint } from '@/lib/shapes'
import type { KonvaPointerEvent } from '@/types/konva'

export interface AnchorPointsProps {
  /** All non-arrow elements to display anchors for */
  elements: WireframeElement[]
  /** The currently hovered anchor (highlighted in blue), or null */
  hoveredAnchor: ArrowConnection | null
  /** Called when the user clicks on an anchor */
  onAnchorClick: (connection: ArrowConnection) => void
  /** Called when the user hovers over an anchor (pass null on mouse-leave) */
  onAnchorHover: (connection: ArrowConnection | null) => void
}

const ANCHOR_POSITIONS: AnchorPosition[] = ['top', 'right', 'bottom', 'left']
const ANCHOR_RADIUS = 7
const ANCHOR_DEFAULT_FILL = '#ffffff'
const ANCHOR_HOVER_FILL = '#0099ff'
const ANCHOR_STROKE = '#0099ff'

export function AnchorPoints({
  elements,
  hoveredAnchor,
  onAnchorClick,
  onAnchorHover,
}: AnchorPointsProps) {
  return (
    <>
      {elements
        .filter((el) => el.type !== 'arrow')
        .flatMap((el) =>
          ANCHOR_POSITIONS.map((anchor) => {
            const pt = getAnchorPoint(el, anchor)
            const isHovered =
              hoveredAnchor?.shapeId === el.id && hoveredAnchor?.anchor === anchor
            const connection: ArrowConnection = { shapeId: el.id, anchor }

            return (
              <Circle
                key={`${el.id}-${anchor}`}
                name={`anchor-${el.id}-${anchor}`}
                x={pt.x}
                y={pt.y}
                radius={ANCHOR_RADIUS}
                fill={isHovered ? ANCHOR_HOVER_FILL : ANCHOR_DEFAULT_FILL}
                stroke={ANCHOR_STROKE}
                strokeWidth={2}
                shadowColor={isHovered ? ANCHOR_HOVER_FILL : 'transparent'}
                shadowBlur={isHovered ? 6 : 0}
                scaleX={isHovered ? 1.3 : 1}
                scaleY={isHovered ? 1.3 : 1}
                hitStrokeWidth={16}
                onClick={(e: KonvaPointerEvent) => { e.cancelBubble = true; onAnchorClick(connection) }}
                onTap={(e: KonvaPointerEvent) => { e.cancelBubble = true; onAnchorClick(connection) }}
                onMouseEnter={() => onAnchorHover(connection)}
                onMouseLeave={() => onAnchorHover(null)}
              />
            )
          }),
        )}
    </>
  )
}
