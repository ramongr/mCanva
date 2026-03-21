/**
 * Wraps children in a Konva Stage + Layer.
 * Required because Konva nodes must be descendants of a Stage to render
 * and fire events correctly in tests.
 */
import { Stage, Layer } from 'react-konva'
import type { ReactNode } from 'react'

interface KonvaTestWrapperProps {
  children: ReactNode
  width?: number
  height?: number
}

export function KonvaTestWrapper({
  children,
  width = 800,
  height = 600,
}: KonvaTestWrapperProps) {
  return (
    <Stage width={width} height={height}>
      <Layer>{children}</Layer>
    </Stage>
  )
}
