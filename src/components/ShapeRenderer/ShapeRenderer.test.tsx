import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { ShapeRenderer } from './ShapeRenderer'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createRectElement, createEllipseElement, createLineElement } from '@/lib/shapes'

function setup(element: Parameters<typeof ShapeRenderer>[0]['element'], isSelected = false) {
  const onSelect = vi.fn()
  const onChange = vi.fn()
  render(
    <KonvaTestWrapper>
      <ShapeRenderer
        element={element}
        isSelected={isSelected}
        onSelect={onSelect}
        onChange={onChange}
      />
    </KonvaTestWrapper>,
  )
  const stage = Konva.stages[Konva.stages.length - 1]
  return { stage, onSelect, onChange }
}

describe('ShapeRenderer', () => {
  describe('rect', () => {
    it('renders a Group node for a rect element', () => {
      const el = createRectElement({ id: 'r1' })
      const { stage } = setup(el)
      const group = stage.findOne('#r1') as Konva.Group
      expect(group).toBeDefined()
      expect(group.nodeType).toBe('Group')
      expect(group.name()).toBe('rect')
    })

    it('forwards isSelected=false to RectShape (shape body keeps element stroke)', () => {
      const el = createRectElement({ id: 'r2', stroke: '#123456' })
      const { stage } = setup(el, false)
      const group = stage.findOne('#r2') as Konva.Group
      const body = group.findOne('.shape-body') as Konva.Rect
      expect(body.stroke()).toBe('#123456')
    })

    it('forwards isSelected=true to RectShape (selection ring shown, body stroke preserved)', () => {
      const el = createRectElement({ id: 'r3', stroke: '#123456' })
      const { stage } = setup(el, true)
      const group = stage.findOne('#r3') as Konva.Group
      // Body still has element stroke
      const body = group.findOne('.shape-body') as Konva.Rect
      expect(body.stroke()).toBe('#123456')
      // Selection overlay with blue stroke is present
      const rects = group.find('Rect') as Konva.Rect[]
      const overlay = rects.find(r => r.stroke() === '#0099ff')
      expect(overlay).toBeDefined()
    })

    it('calls onChange with element id and update on dragend', () => {
      const el = createRectElement({ id: 'r4' })
      const { stage, onChange } = setup(el)
      const group = stage.findOne('#r4') as Konva.Group
      group.position({ x: 50, y: 60 })
      group.fire('dragend')
      expect(onChange).toHaveBeenCalledWith('r4', { x: 50, y: 60 })
    })

    it('calls onSelect with element id on click', () => {
      const el = createRectElement({ id: 'r5' })
      const { stage, onSelect } = setup(el)
      const group = stage.findOne('#r5') as Konva.Group
      group.fire('click', { cancelBubble: false })
      expect(onSelect).toHaveBeenCalledWith('r5', false)
    })
  })

  describe('ellipse', () => {
    it('renders a Group node for an ellipse element', () => {
      const el = createEllipseElement({ id: 'e1' })
      const { stage } = setup(el)
      const group = stage.findOne('#e1') as Konva.Group
      expect(group).toBeDefined()
      expect(group.nodeType).toBe('Group')
      expect(group.name()).toBe('ellipse')
    })

    it('forwards isSelected=true to EllipseShape (selection ring shown)', () => {
      const el = createEllipseElement({ id: 'e2' })
      const { stage } = setup(el, true)
      const group = stage.findOne('#e2') as Konva.Group
      const ellipses = group.find('Ellipse') as Konva.Ellipse[]
      const overlay = ellipses.find(e => e.stroke() === '#0099ff')
      expect(overlay).toBeDefined()
    })

    it('calls onChange with element id on dragend', () => {
      const el = createEllipseElement({ id: 'e3' })
      const { stage, onChange } = setup(el)
      const group = stage.findOne('#e3') as Konva.Group
      group.position({ x: 10, y: 20 })
      group.fire('dragend')
      expect(onChange).toHaveBeenCalledWith('e3', { x: 10, y: 20 })
    })
  })

  describe('line', () => {
    it('renders a Group node for a line element', () => {
      const el = createLineElement({ id: 'l1' })
      const { stage } = setup(el)
      const group = stage.findOne('#l1') as Konva.Group
      expect(group).toBeDefined()
      expect(group.nodeType).toBe('Group')
      expect(group.name()).toBe('line')
    })

    it('forwards isSelected=true to LineShape (selection overlay shown)', () => {
      const el = createLineElement({ id: 'l2' })
      const { stage } = setup(el, true)
      const group = stage.findOne('#l2') as Konva.Group
      const lines = group.find('Line') as Konva.Line[]
      const overlay = lines.find(l => l.stroke() === '#0099ff')
      expect(overlay).toBeDefined()
    })

    it('calls onChange with element id on dragend', () => {
      const el = createLineElement({ id: 'l3' })
      const { stage, onChange } = setup(el)
      const group = stage.findOne('#l3') as Konva.Group
      group.position({ x: 5, y: 15 })
      group.fire('dragend')
      expect(onChange).toHaveBeenCalledWith('l3', { x: 5, y: 15 })
    })
  })
})
