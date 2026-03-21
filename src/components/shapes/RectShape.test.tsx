import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { RectShape } from './RectShape'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createRectElement } from '@/lib/shapes'

function makeEl(overrides = {}) {
  return createRectElement({ id: 'rect-1', x: 10, y: 20, width: 100, height: 60, ...overrides })
}

function setup(props: Partial<Parameters<typeof RectShape>[0]> = {}) {
  const onSelect = vi.fn()
  const onChange = vi.fn()
  const element = makeEl()
  render(
    <KonvaTestWrapper>
      <RectShape
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
  // The shape body is the Rect with name 'shape-body'
  const body = group?.findOne('.shape-body') as Konva.Rect
  return { group, body, onSelect, onChange, element }
}

describe('RectShape', () => {
  it('renders a Konva Group node with id and name', () => {
    const { group } = setup()
    expect(group).toBeDefined()
    expect(group.nodeType).toBe('Group')
    expect(group.name()).toBe('rect')
  })

  it('renders a shape-body Rect inside the group', () => {
    const { body } = setup()
    expect(body).toBeDefined()
    expect(body.className).toBe('Rect')
  })

  it('applies position to the group from element props', () => {
    const { group } = setup()
    expect(group.x()).toBe(10)
    expect(group.y()).toBe(20)
  })

  it('applies dimensions to the shape body from element props', () => {
    const { body } = setup()
    expect(body.width()).toBe(100)
    expect(body.height()).toBe(60)
  })

  it('uses element stroke on the shape body when not selected', () => {
    const el = makeEl({ stroke: '#aabbcc' })
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Rect
    expect(body.stroke()).toBe('#aabbcc')
  })

  it('preserves element stroke on shape body when isSelected is true', () => {
    const el = makeEl({ stroke: '#000000' })
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Rect
    // Shape body keeps its own stroke — selection ring is a separate overlay
    expect(body.stroke()).toBe('#000000')
  })

  it('renders a selection ring overlay when isSelected is true', () => {
    const el = makeEl({ stroke: '#000000' })
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const rects = group.find('Rect') as Konva.Rect[]
    const overlay = rects.find(r => r.stroke() === '#0099ff')
    expect(overlay).toBeDefined()
    expect(overlay!.listening()).toBe(false)
  })

  it('does not render a selection ring overlay when isSelected is false', () => {
    const el = makeEl({ stroke: '#000000' })
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const rects = group.find('Rect') as Konva.Rect[]
    const overlay = rects.find(r => r.stroke() === '#0099ff')
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
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
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
    group.position({ x: 55, y: 77 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({ x: 55, y: 77 })
  })

  it('calls onDragMove with element id and current position on dragmove', () => {
    const onDragMove = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onDragMove={onDragMove} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.position({ x: 30, y: 40 })
    group.fire('dragmove')
    expect(onDragMove).toHaveBeenCalledWith(el.id, 30, 40)
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
    const el = makeEl({ label: 'Hello' })
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const label = group.findOne('.shape-label') as Konva.Text
    expect(label).toBeDefined()
    expect(label.text()).toBe('Hello')
  })

  it('calls onEditLabel with element id on double click', () => {
    const onEditLabel = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <RectShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onEditLabel={onEditLabel} />
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
