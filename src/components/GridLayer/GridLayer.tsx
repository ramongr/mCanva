/**
 * GridLayer — renders an always-visible dot/line grid behind the canvas shapes.
 *
 * Sits in its own Konva Layer so it is always rendered below the shapes layer
 * and never participates in hit-testing (listening={false} on all lines).
 */
import { Layer, Line } from 'react-konva'
import { generateGridLines, GRID_SIZE } from '@/lib/gridUtils'

export interface GridLayerProps {
  width: number
  height: number
}

export function GridLayer({ width, height }: GridLayerProps) {
  const { verticals, horizontals } = generateGridLines(width, height, GRID_SIZE)

  return (
    <Layer listening={false}>
      {verticals.map((x) => (
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="#e2e8f0"
          strokeWidth={0.5}
          listening={false}
        />
      ))}
      {horizontals.map((y) => (
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke="#e2e8f0"
          strokeWidth={0.5}
          listening={false}
        />
      ))}
    </Layer>
  )
}
