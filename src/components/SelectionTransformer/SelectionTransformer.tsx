/**
 * SelectionTransformer — wraps Konva.Transformer and attaches it to the
 * currently selected node by looking it up on the Stage by id.
 *
 * Purely prop-driven — no store access.
 */
import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import type Konva from 'konva'

export interface SelectionTransformerProps {
  /** Ids of the selected elements (empty set = nothing selected) */
  selectedIds: Set<string>
  /** Callback fired after the user finishes a transform (resize/rotate) */
  onTransformEnd: (id: string, attrs: TransformAttrs) => void
}

export interface TransformAttrs {
  x: number
  y: number
  width?: number
  height?: number
  radiusX?: number
  radiusY?: number
  rotation: number
  scaleX: number
  scaleY: number
}

export function SelectionTransformer({ selectedIds, onTransformEnd }: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (selectedIds.size === 0) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const stage = transformer.getStage()
    if (!stage) return

    // Attach to all selected non-arrow nodes
    const nodes: Konva.Node[] = []
    for (const id of selectedIds) {
      const node = stage.findOne(`#${id}`) as Konva.Node | undefined
      // Arrows use their own endpoint handles for editing — no resize transformer
      if (node && node.name() !== 'arrow') {
        nodes.push(node)
      }
    }
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds])

  const handleTransformEnd = () => {
    const transformer = transformerRef.current
    if (!transformer || selectedIds.size === 0) return

    const node = transformer.nodes()[0] as Konva.Node | undefined
    if (!node) return

    const attrs: TransformAttrs = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    }

    const shapeType = node.name()

    // For rects: absorb scale into width/height and reset scale to 1
    if (shapeType === 'rect') {
      const group = node as Konva.Group
      const body = group.findOne('.shape-body') as Konva.Rect | undefined
      if (body) {
        attrs.width = Math.max(1, body.width() * group.scaleX())
        attrs.height = Math.max(1, body.height() * group.scaleY())
      }
      attrs.scaleX = 1
      attrs.scaleY = 1
      node.scaleX(1)
      node.scaleY(1)
    }

    // For ellipses: absorb scale into radii and reset scale to 1
    if (shapeType === 'ellipse') {
      const group = node as Konva.Group
      const body = group.findOne('.shape-body') as Konva.Ellipse | undefined
      if (body) {
        attrs.radiusX = Math.max(1, body.radiusX() * group.scaleX())
        attrs.radiusY = Math.max(1, body.radiusY() * group.scaleY())
      }
      attrs.scaleX = 1
      attrs.scaleY = 1
      node.scaleX(1)
      node.scaleY(1)
    }

    onTransformEnd(node.id(), attrs)
  }

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Prevent resizing below 5x5
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox
        return newBox
      }}
      onTransformEnd={handleTransformEnd}
    />
  )
}
