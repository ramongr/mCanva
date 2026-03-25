import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { ArrowShape } from './ArrowShape'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createArrowElement } from '@/lib/shapes'

function makeEl(overrides: Partial<Parameters<typeof createArrowElement>[4]> = {}) {
  return createArrowElement(10, 20, 150, 80, overrides)
}

function setup(
  overrides: Parameters<typeof makeEl>[0] = {},
  isSelected = false,
  onEndpointClick = vi.fn(),
) {
  const onSelect = vi.fn()
  const onChange = vi.fn()
  const element = makeEl(overrides)
  render(
    <KonvaTestWrapper>
      <ArrowShape
        element={element}
        isSelected={isSelected}
        onSelect={onSelect}
        onChange={onChange}
        onEndpointClick={onEndpointClick}
      />
    </KonvaTestWrapper>,
  )
  const stage = Konva.stages[Konva.stages.length - 1]
  const group = stage.findOne(`#${element.id}`) as Konva.Group
  const body = group?.findOne('.shape-body') as Konva.Shape
  return { group, body, onSelect, onChange, onEndpointClick, element }
}

describe('ArrowShape', () => {
  it('renders a Konva Group node with id and name arrow', () => {
    const { group } = setup()
    expect(group).toBeDefined()
    expect(group.nodeType).toBe('Group')
    expect(group.name()).toBe('arrow')
  })

  it('renders a shape-body Arrow inside the group', () => {
    const { body } = setup()
    expect(body).toBeDefined()
    expect(body.className).toBe('Arrow')
  })

  it('has hitStrokeWidth of 10 on the arrow body for easier clicking', () => {
    const { body } = setup()
    expect(body.getAttr('hitStrokeWidth')).toBe(10)
  })

  it('is draggable when both endpoints are free and not locked', () => {
    const { group } = setup({ from: null, to: null })
    expect(group.draggable()).toBe(true)
  })

  it('is not draggable when both endpoints are connected', () => {
    const { group } = setup({
      from: { shapeId: 'shape-1', anchor: 'right' },
      to: { shapeId: 'shape-2', anchor: 'left' },
    })
    expect(group.draggable()).toBe(false)
  })

  it('is not draggable when locked, even with free endpoints', () => {
    const { group } = setup({ locked: true, from: null, to: null })
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

  it('renders a selection overlay when isSelected is true', () => {
    const { group } = setup({}, true)
    const arrows = group.find('Arrow') as Konva.Shape[]
    const overlay = arrows.find((a) => (a as Konva.Arrow).stroke() === '#0099ff')
    expect(overlay).toBeDefined()
    expect(overlay!.listening()).toBe(false)
  })

  it('does not render a selection overlay when isSelected is false', () => {
    const { group } = setup({}, false)
    const arrows = group.find('Arrow') as Konva.Shape[]
    const overlay = arrows.find((a) => (a as Konva.Arrow).stroke() === '#0099ff')
    expect(overlay).toBeUndefined()
  })

  it('calls onChange with all points offset on dragend when both endpoints are free', () => {
    const { group, onChange, element } = setup({ from: null, to: null })
    group.position({ x: 10, y: 5 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      points: [
        element.points[0] + 10,
        element.points[1] + 5,
        element.points[2] + 10,
        element.points[3] + 5,
      ],
    })
  })

  it('only offsets the free (from) endpoint on dragend when "to" is connected', () => {
    const { group, onChange, element } = setup({ from: null, to: { shapeId: 'r1', anchor: 'left' } })
    const [x1, y1, x2, y2] = element.points
    group.position({ x: 20, y: 15 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      // from is free → offset; to is connected → stays fixed
      points: [x1 + 20, y1 + 15, x2, y2],
    })
  })

  it('only offsets the free (to) endpoint on dragend when "from" is connected', () => {
    const { group, onChange, element } = setup({ from: { shapeId: 'r1', anchor: 'right' }, to: null })
    const [x1, y1, x2, y2] = element.points
    group.position({ x: 30, y: 10 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      // from is connected → stays fixed; to is free → offset
      points: [x1, y1, x2 + 30, y2 + 10],
    })
  })

  it('does not throw on dragmove', () => {
    const { group } = setup({ from: null, to: null })
    expect(() => group.fire('dragmove')).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // onArrowDragEnd — snap payload
  // -------------------------------------------------------------------------

  it('calls onArrowDragEnd instead of onChange when provided, with correct payload for both-free drag', () => {
    const onArrowDragEnd = vi.fn()
    const el = makeEl({ from: null, to: null })
    render(
      <KonvaTestWrapper>
        <ArrowShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onArrowDragEnd={onArrowDragEnd} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.position({ x: 10, y: 5 })
    group.fire('dragend')

    expect(onArrowDragEnd).toHaveBeenCalledOnce()
    const [id, payload] = onArrowDragEnd.mock.calls[0]
    expect(id).toBe(el.id)
    expect(payload.movedEndpoint).toBe('both')
    expect(payload.freeFrom).toEqual({ x: el.points[0] + 10, y: el.points[1] + 5 })
    expect(payload.freeTo).toEqual({ x: el.points[2] + 10, y: el.points[3] + 5 })
    expect(payload.newPoints).toEqual([
      el.points[0] + 10, el.points[1] + 5,
      el.points[2] + 10, el.points[3] + 5,
    ])
  })

  it('onArrowDragEnd payload has movedEndpoint="from" and null freeTo when "to" is connected', () => {
    const onArrowDragEnd = vi.fn()
    const el = makeEl({ from: null, to: { shapeId: 'r1', anchor: 'left' } })
    render(
      <KonvaTestWrapper>
        <ArrowShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onArrowDragEnd={onArrowDragEnd} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.position({ x: 20, y: 15 })
    group.fire('dragend')

    const [, payload] = onArrowDragEnd.mock.calls[0]
    expect(payload.movedEndpoint).toBe('from')
    expect(payload.freeFrom).toEqual({ x: el.points[0] + 20, y: el.points[1] + 15 })
    expect(payload.freeTo).toBeNull()
  })

  it('onArrowDragEnd payload has movedEndpoint="to" and null freeFrom when "from" is connected', () => {
    const onArrowDragEnd = vi.fn()
    const el = makeEl({ from: { shapeId: 'r1', anchor: 'right' }, to: null })
    render(
      <KonvaTestWrapper>
        <ArrowShape element={el} isSelected={false} onSelect={vi.fn()} onChange={vi.fn()} onArrowDragEnd={onArrowDragEnd} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    group.position({ x: 30, y: 10 })
    group.fire('dragend')

    const [, payload] = onArrowDragEnd.mock.calls[0]
    expect(payload.movedEndpoint).toBe('to')
    expect(payload.freeFrom).toBeNull()
    expect(payload.freeTo).toEqual({ x: el.points[2] + 30, y: el.points[3] + 10 })
  })

  it('falls back to onChange when onArrowDragEnd is not provided', () => {
    const { group, onChange, element } = setup({ from: null, to: null })
    group.position({ x: 5, y: 5 })
    group.fire('dragend')
    expect(onChange).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      points: [
        element.points[0] + 5, element.points[1] + 5,
        element.points[2] + 5, element.points[3] + 5,
      ],
    })
  })

  // -------------------------------------------------------------------------
  // Endpoint handles
  // -------------------------------------------------------------------------

  it('does not render endpoint handles when not selected', () => {
    const { group } = setup({}, false)
    expect(group.findOne('.endpoint-from')).toBeUndefined()
    expect(group.findOne('.endpoint-to')).toBeUndefined()
  })

  it('renders endpoint handles when selected', () => {
    const { group } = setup({}, true)
    expect(group.findOne('.endpoint-from')).toBeDefined()
    expect(group.findOne('.endpoint-to')).toBeDefined()
  })

  it('renders connected "from" endpoint as filled blue', () => {
    const { group } = setup({ from: { shapeId: 'r1', anchor: 'right' }, to: null }, true)
    const handle = group.findOne('.endpoint-from') as Konva.Circle
    expect(handle.fill()).toBe('#0099ff')
  })

  it('renders free "from" endpoint as white', () => {
    const { group } = setup({ from: null, to: null }, true)
    const handle = group.findOne('.endpoint-from') as Konva.Circle
    expect(handle.fill()).toBe('#ffffff')
  })

  it('renders connected "to" endpoint as filled blue', () => {
    const { group } = setup({ from: null, to: { shapeId: 'r2', anchor: 'left' } }, true)
    const handle = group.findOne('.endpoint-to') as Konva.Circle
    expect(handle.fill()).toBe('#0099ff')
  })

  it('renders free "to" endpoint as white', () => {
    const { group } = setup({ from: null, to: null }, true)
    const handle = group.findOne('.endpoint-to') as Konva.Circle
    expect(handle.fill()).toBe('#ffffff')
  })

  it('calls onEndpointClick with arrowId and "from" when from handle is clicked', () => {
    const onEndpointClick = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <ArrowShape
          element={el}
          isSelected={true}
          onSelect={vi.fn()}
          onChange={vi.fn()}
          onEndpointClick={onEndpointClick}
        />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    fromHandle.fire('click', { cancelBubble: false })
    expect(onEndpointClick).toHaveBeenCalledWith(el.id, 'from')
  })

  it('calls onEndpointClick with arrowId and "to" when to handle is clicked', () => {
    const onEndpointClick = vi.fn()
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <ArrowShape
          element={el}
          isSelected={true}
          onSelect={vi.fn()}
          onChange={vi.fn()}
          onEndpointClick={onEndpointClick}
        />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    toHandle.fire('click', { cancelBubble: false })
    expect(onEndpointClick).toHaveBeenCalledWith(el.id, 'to')
  })

  it('does not throw when onEndpointClick is not provided and handle is clicked', () => {
    const el = makeEl()
    render(
      <KonvaTestWrapper>
        <ArrowShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    expect(() => fromHandle.fire('click', { cancelBubble: false })).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // Free endpoint handle dragging
  // -------------------------------------------------------------------------

  it('free "from" handle is draggable', () => {
    const { group } = setup({ from: null, to: null }, true)
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    expect(fromHandle.draggable()).toBe(true)
  })

  it('free "to" handle is draggable', () => {
    const { group } = setup({ from: null, to: null }, true)
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    expect(toHandle.draggable()).toBe(true)
  })

  it('connected "from" handle is NOT draggable', () => {
    const { group } = setup({ from: { shapeId: 'r1', anchor: 'right' }, to: null }, true)
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    expect(fromHandle.draggable()).toBe(false)
  })

  it('connected "to" handle is NOT draggable', () => {
    const { group } = setup({ from: null, to: { shapeId: 'r1', anchor: 'left' } }, true)
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    expect(toHandle.draggable()).toBe(false)
  })

  it('calls onEndpointDragEnd with id, "from", and drop position when from handle drag ends', () => {
    const onEndpointDragEnd = vi.fn()
    const el = makeEl({ from: null, to: null })
    render(
      <KonvaTestWrapper>
        <ArrowShape
          element={el}
          isSelected={true}
          onSelect={vi.fn()}
          onChange={vi.fn()}
          onEndpointDragEnd={onEndpointDragEnd}
        />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    fromHandle.position({ x: 80, y: 60 })
    fromHandle.fire('dragend')

    expect(onEndpointDragEnd).toHaveBeenCalledWith(el.id, 'from', { x: 80, y: 60 })
  })

  it('calls onEndpointDragEnd with id, "to", and drop position when to handle drag ends', () => {
    const onEndpointDragEnd = vi.fn()
    const el = makeEl({ from: null, to: null })
    render(
      <KonvaTestWrapper>
        <ArrowShape
          element={el}
          isSelected={true}
          onSelect={vi.fn()}
          onChange={vi.fn()}
          onEndpointDragEnd={onEndpointDragEnd}
        />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const toHandle = group.findOne('.endpoint-to') as Konva.Circle
    toHandle.position({ x: 250, y: 90 })
    toHandle.fire('dragend')

    expect(onEndpointDragEnd).toHaveBeenCalledWith(el.id, 'to', { x: 250, y: 90 })
  })

  it('does not throw when onEndpointDragEnd is not provided and handle drag ends', () => {
    const el = makeEl({ from: null, to: null })
    render(
      <KonvaTestWrapper>
        <ArrowShape element={el} isSelected={true} onSelect={vi.fn()} onChange={vi.fn()} />
      </KonvaTestWrapper>,
    )
    const stage = Konva.stages[Konva.stages.length - 1]
    const group = stage.findOne(`#${el.id}`) as Konva.Group
    const fromHandle = group.findOne('.endpoint-from') as Konva.Circle
    fromHandle.position({ x: 80, y: 60 })
    expect(() => fromHandle.fire('dragend')).not.toThrow()
  })
})
