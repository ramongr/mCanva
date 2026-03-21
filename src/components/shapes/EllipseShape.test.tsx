import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { EllipseShape } from './EllipseShape'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createEllipseElement } from '@/lib/shapes'

function makeEl(overrides = {}) {
  return createEllipseElement({ id: 'ellipse-1', x: 50, y: 50, radiusX: 40, radiusY: 25, ...overrides })
}

function setup(props: Partial<Parameters<typeof EllipseShape>[0]> = {}) {
  const onSelect = vi.fn()
  const onChange = vi.fn()
  const element = makeEl()
  render(
    <KonvaTestWrapper>
      <EllipseShape
        element={element}
        isSelected={false}
        onSelect={onSelect}
        onChange={onChange}
        {...props}
      />
    </KonvaTestWrapper>,
  )
  const stage = Konva.stages[Konva.stages.length - 1]
  // The id is on the Group; findOne returns the Group node
  const group = stage.findOne(`#${element.id}`) as Konva.Group
  // The shape body is the Ellipse with name 'shape-body'
  const body = group?.findOne('.shape-body') as Konva.Ellipse
  return { group, body, onSelect, onChange, element }
}

describe('EllipseShape', () => {
  it('renders a Konva Group node with id and name', () => {
    const { group } = setup()
    expect(group).toBeDefined()
    expect(group.nodeType).toBe('Group')
    expect(group.name()).toBe('ellipse')
  })

  it('renders a shape-body Ellipse inside the group', () => {
    const { body } = setup()
    expect(body).toBeDefined()
    expect(body.className).toBe('Ellipse')
  })

  it('applies position to the group from element props', () => {
    const { group } = setup()
    expect(group.x()).toBe(50)
    expect(group.y()).toBe(50)
  })

  it('applies radii to the shape body from element props', () => {
    const { body } = setup()
    expect(body.radiusX()).toBe(40)
    expect(body.radiusY()).toBe(25)
  })

  it('uses element stroke on the shape body when not selected', () => {
    const el = makeEl({ stroke: '#ff0000' })
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Ellipse
    expect(body.stroke()).toBe('#ff0000')
  })

  it('preserves element stroke on shape body when isSelected is true', () => {
    const el = makeEl({ stroke: '#ff0000' })
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Ellipse
    // Shape body keeps its own stroke — selection ring is a separate overlay
    expect(body.stroke()).toBe('#ff0000')
  })

  it('renders a selection ring overlay when isSelected is true', () => {
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const ellipses = group.find('Ellipse') as Konva.Ellipse[]
    const overlay = ellipses.find(e => e.stroke() === '#0099ff')
    expect(overlay).toBeDefined()
    expect(overlay!.listening()).toBe(false)
  })

  it('does not render a selection ring overlay when isSelected is false', () => {
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const ellipses = group.find('Ellipse') as Konva.Ellipse[]
    const overlay = ellipses.find(e => e.stroke() === '#0099ff')
    expect(overlay).toBeUndefined()
  })

  it('is draggable when not locked', () => {
    const { group } = setup()
    expect(group.draggable()).toBe(true)
  })

  it('is not draggable when locked', () => {
    const el = makeEl({ locked: true })
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    expect(group.draggable()).toBe(false)
  })

  it('calls onSelect with element id on click', () => {
    const { group, onSelect, element } = setup()
    group.fire('click', { cancelBubble: false })
    expect(onSelect).toHaveBeenCalledWith(element.id, false)
  })

  it('calls onSelect with addToSelection=true on shift+click', () => {
    const { group, onSelect, element } = setup()
    group.fire('click', { cancelBubble: false, evt: { shiftKey: true } })
    expect(onSelect).toHaveBeenCalledWith(element.id, true)
  })

  it('calls onChange with new position on dragend', () => {
    const { group, onChange } = setup()
    group.position({ x: 120, y: 80 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({ x: 120, y: 80 })
  })

  it('calls onDragMove with element id and current position on dragmove', () => {
    const onDragMove = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onDragMove={onDragMove} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.position({ x: 60, y: 90 })
    group.fire('dragmove')
    expect(onDragMove).toHaveBeenCalledWith(el.id, 60, 90)
  })

  it('does not throw when onDragMove is not provided and dragmove fires', () => {
    const { group } = setup()
    expect(() => group.fire('dragmove')).not.toThrow()
  })

  it('does not render a label text node when label is empty', () => {
    const { group } = setup()
    const label = group.findOne('.shape-label')
    expect(label).toBeUndefined()
  })

  it('renders a label text node when label is non-empty', () => {
    const el = makeEl({ label: 'World' })
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const label = group.findOne('.shape-label') as Konva.Text
    expect(label).toBeDefined()
    expect(label.text()).toBe('World')
  })

  it('calls onEditLabel with element id on double click', () => {
    const onEditLabel = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <EllipseShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onEditLabel={onEditLabel} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.fire('dblclick', { cancelBubble: false })
    expect(onEditLabel).toHaveBeenCalledWith(el.id)
  })

  it('does not throw when onEditLabel is not provided and double click fires', () => {
    const { group } = setup()
    expect(() => group.fire('dblclick', { cancelBubble: false })).not.toThrow()
  })
})
