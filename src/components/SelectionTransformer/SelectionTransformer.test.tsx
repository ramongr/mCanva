import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { Stage, Layer, Rect, Ellipse, Group, Arrow } from 'react-konva'
import { SelectionTransformer } from './SelectionTransformer'

// ---------------------------------------------------------------------------
// Test wrapper — mounts a Stage with known nodes + the transformer.
// Nodes are wrapped in Groups (name="rect"/"ellipse") with shape-body children,
// mirroring the real RectShape / EllipseShape structure.
// ---------------------------------------------------------------------------

interface WrapperProps {
  selectedIds: Set<string>
  onTransformEnd?: (id: string, attrs: unknown) => void
}

function renderWithStage({ selectedIds, onTransformEnd = vi.fn() }: WrapperProps) {
  render(
    <Stage width={800} height={600}>
      <Layer>
        {/* Rect group — mirrors RectShape */}
        <Group id="rect-1" name="rect" x={10} y={10}>
          <Rect name="shape-body" x={0} y={0} width={100} height={60} />
        </Group>
        {/* Ellipse group — mirrors EllipseShape */}
        <Group id="ellipse-1" name="ellipse" x={200} y={150}>
          <Ellipse name="shape-body" x={0} y={0} radiusX={50} radiusY={30} />
        </Group>
        {/* Arrow group — mirrors ArrowShape; should NOT get a transformer */}
        <Group id="arrow-1" name="arrow" x={0} y={0}>
          <Arrow name="shape-body" points={[10, 10, 200, 200]} stroke="#000" fill="#000" />
        </Group>
        <SelectionTransformer selectedIds={selectedIds} onTransformEnd={onTransformEnd} />
      </Layer>
    </Stage>,
  )
  const stage = Konva.stages[Konva.stages.length - 1]
  const transformer = stage.findOne('Transformer') as Konva.Transformer
  return { stage, transformer, onTransformEnd }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SelectionTransformer', () => {
  it('renders a Konva Transformer node', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set() })
    expect(transformer).toBeDefined()
    expect(transformer.className).toBe('Transformer')
  })

  it('attaches to no nodes when selectedId is null', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set() })
    expect(transformer.nodes()).toHaveLength(0)
  })

  it('attaches to the group matching selectedId', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set(['rect-1']) })
    expect(transformer.nodes()).toHaveLength(1)
    expect(transformer.nodes()[0].id()).toBe('rect-1')
  })

  it('attaches to an ellipse group when selected', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set(['ellipse-1']) })
    expect(transformer.nodes()).toHaveLength(1)
    expect(transformer.nodes()[0].id()).toBe('ellipse-1')
  })

  it('attaches to no nodes when selectedId does not match any node', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set(['does-not-exist']) })
    expect(transformer.nodes()).toHaveLength(0)
  })

  it('does NOT attach to an arrow group — arrows use endpoint handles instead', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set(['arrow-1']) })
    expect(transformer.nodes()).toHaveLength(0)
  })

  it('calls onTransformEnd with id and attrs after transform on a rect group', () => {
    const onTransformEnd = vi.fn()
    const { stage, transformer } = renderWithStage({
      selectedIds: new Set(['rect-1']),
      onTransformEnd,
    })

    // Simulate scaling the group before firing transformend
    const group = stage.findOne('#rect-1') as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Rect
    body.width(100)
    body.height(60)
    group.scaleX(1.5)
    group.scaleY(2)
    transformer.fire('transformend')

    expect(onTransformEnd).toHaveBeenCalledOnce()
    const [id, attrs] = onTransformEnd.mock.calls[0] as [string, Record<string, unknown>]
    expect(id).toBe('rect-1')
    expect(attrs.width).toBe(150)
    expect(attrs.height).toBe(120)
    expect(attrs.scaleX).toBe(1)
    expect(attrs.scaleY).toBe(1)
  })

  it('calls onTransformEnd with id and attrs after transform on an ellipse group', () => {
    const onTransformEnd = vi.fn()
    const { stage, transformer } = renderWithStage({
      selectedIds: new Set(['ellipse-1']),
      onTransformEnd,
    })

    const group = stage.findOne('#ellipse-1') as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Ellipse
    body.radiusX(50)
    body.radiusY(30)
    group.scaleX(2)
    group.scaleY(3)
    transformer.fire('transformend')

    expect(onTransformEnd).toHaveBeenCalledOnce()
    const [id, attrs] = onTransformEnd.mock.calls[0] as [string, Record<string, unknown>]
    expect(id).toBe('ellipse-1')
    expect(attrs.radiusX).toBe(100)
    expect(attrs.radiusY).toBe(90)
    expect(attrs.scaleX).toBe(1)
    expect(attrs.scaleY).toBe(1)
  })

  it('does not call onTransformEnd when no node is attached', () => {
    const onTransformEnd = vi.fn()
    const { transformer } = renderWithStage({ selectedIds: new Set(), onTransformEnd })
    transformer.fire('transformend')
    expect(onTransformEnd).not.toHaveBeenCalled()
  })

  it('enforces a minimum bounding box of 5x5', () => {
    const { transformer } = renderWithStage({ selectedIds: new Set(['rect-1']) })
    const boundBoxFunc = transformer.boundBoxFunc()!
    const oldBox = { x: 0, y: 0, width: 100, height: 60, rotation: 0 }

    // Below minimum — should return oldBox
    expect(boundBoxFunc(oldBox, { ...oldBox, width: 3, height: 3 })).toEqual(oldBox)
    expect(boundBoxFunc(oldBox, { ...oldBox, width: 3, height: 60 })).toEqual(oldBox)
    expect(boundBoxFunc(oldBox, { ...oldBox, width: 100, height: 3 })).toEqual(oldBox)

    // Above minimum — should return newBox
    const newBox = { ...oldBox, width: 50, height: 30 }
    expect(boundBoxFunc(oldBox, newBox)).toEqual(newBox)
  })
})
