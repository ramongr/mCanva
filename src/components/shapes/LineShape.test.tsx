import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { LineShape } from './LineShape'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createLineElement } from '@/lib/shapes'

function makeEl(overrides = {}) {
  return createLineElement({ id: 'line-1', x: 0, y: 0, points: [0, 0, 100, 0], ...overrides })
}

function setup(props: Partial<Parameters<typeof LineShape>[0]> = {}) {
  const onSelect = vi.fn()
  const onChange = vi.fn()
  const element = makeEl()
  render(
    <KonvaTestWrapper>
      <LineShape
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
  // The shape body is the Line with name 'shape-body'
  const body = group?.findOne('.shape-body') as Konva.Line
  return { group, body, onSelect, onChange, element }
}

describe('LineShape', () => {
  it('renders a Konva Group node with id and name', () => {
    const { group } = setup()
    expect(group).toBeDefined()
    expect(group.nodeType).toBe('Group')
    expect(group.name()).toBe('line')
  })

  it('renders a shape-body Line inside the group', () => {
    const { body } = setup()
    expect(body).toBeDefined()
    expect(body.className).toBe('Line')
  })

  it('applies position to the group from element props', () => {
    const { group } = setup()
    expect(group.x()).toBe(0)
    expect(group.y()).toBe(0)
  })

  it('applies points to the shape body from element props', () => {
    const { body } = setup()
    expect(body.points()).toEqual([0, 0, 100, 0])
  })

  it('uses element stroke on the shape body when not selected', () => {
    const el = makeEl({ stroke: '#00ff00' })
    render(
      <KonvaTestWrapper>
        <LineShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Line
    expect(body.stroke()).toBe('#00ff00')
  })

  it('preserves element stroke on shape body when isSelected is true', () => {
    const el = makeEl({ stroke: '#00ff00' })
    render(
      <KonvaTestWrapper>
        <LineShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const body = group.findOne('.shape-body') as Konva.Line
    // Shape body keeps its own stroke — selection highlight is a separate overlay
    expect(body.stroke()).toBe('#00ff00')
  })

  it('renders a selection overlay when isSelected is true', () => {
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <LineShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const lines = group.find('Line') as Konva.Line[]
    const overlay = lines.find(l => l.stroke() === '#0099ff')
    expect(overlay).toBeDefined()
    expect(overlay!.listening()).toBe(false)
  })

  it('does not render a selection overlay when isSelected is false', () => {
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <LineShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const lines = group.find('Line') as Konva.Line[]
    const overlay = lines.find(l => l.stroke() === '#0099ff')
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
        <LineShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    expect(group.draggable()).toBe(false)
  })

  it('calls onSelect with element id on click', () => {
    const { group, onSelect, element } = setup()
    group.fire('click', { cancelBubble: false })
    expect(onSelect).toHaveBeenCalledWith(element.id)
  })

  it('calls onChange with new position on dragend', () => {
    const { group, onChange } = setup()
    group.position({ x: 30, y: 45 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({ x: 30, y: 45 })
  })
})
