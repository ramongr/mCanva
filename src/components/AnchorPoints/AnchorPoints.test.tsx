import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Konva from 'konva'
import { AnchorPoints } from './AnchorPoints'
import { KonvaTestWrapper } from '@/test-utils/KonvaTestWrapper'
import { createRectElement, createEllipseElement, createArrowElement } from '@/lib/shapes'
import type { ArrowConnection } from '@/types/shapes'

describe('AnchorPoints', () => {
  it('renders 4 anchor circles per non-arrow shape', () => {
    const rect = createRectElement({ id: 'r1', x: 50, y: 50, width: 100, height: 60 })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const circles = stage.find('Circle') as Konva.Circle[]
    expect(circles).toHaveLength(4)
  })

  it('renders 4 anchors per shape when multiple shapes are present', () => {
    const rect = createRectElement({ id: 'r1' })
    const ellipse = createEllipseElement({ id: 'e1' })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect, ellipse]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const circles = stage.find('Circle') as Konva.Circle[]
    expect(circles).toHaveLength(8)
  })

  it('does not render anchors for arrow elements', () => {
    const arrow = createArrowElement(0, 0, 100, 0)
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[arrow]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const circles = stage.find('Circle') as Konva.Circle[]
    expect(circles).toHaveLength(0)
  })

  it('fills the hovered anchor in blue', () => {
    const rect = createRectElement({ id: 'r1', x: 50, y: 50, width: 100, height: 60 })
    const hoveredAnchor: ArrowConnection = { shapeId: 'r1', anchor: 'top' }
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={hoveredAnchor}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const circles = stage.find('Circle') as Konva.Circle[]
    const hoveredCircle = circles.find((c) => c.name() === 'anchor-r1-top')
    expect(hoveredCircle).toBeDefined()
    expect(hoveredCircle!.fill()).toBe('#0099ff')
  })

  it('calls onAnchorClick when an anchor circle is clicked', () => {
    const rect = createRectElement({ id: 'r1', x: 50, y: 50, width: 100, height: 60 })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const topAnchor = stage.findOne('.anchor-r1-top') as Konva.Circle
    topAnchor.fire('click')
    expect(onAnchorClick).toHaveBeenCalledWith({ shapeId: 'r1', anchor: 'top' })
  })

  it('calls onAnchorHover with connection on mouseenter', () => {
    const rect = createRectElement({ id: 'r1' })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const rightAnchor = stage.findOne('.anchor-r1-right') as Konva.Circle
    rightAnchor.fire('mouseenter')
    expect(onAnchorHover).toHaveBeenCalledWith({ shapeId: 'r1', anchor: 'right' })
  })

  it('calls onAnchorHover with null on mouseleave', () => {
    const rect = createRectElement({ id: 'r1' })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const bottomAnchor = stage.findOne('.anchor-r1-bottom') as Konva.Circle
    bottomAnchor.fire('mouseleave')
    expect(onAnchorHover).toHaveBeenCalledWith(null)
  })

  // Regression: anchor click must cancel bubble so the event does NOT reach
  // the Stage and trigger a second commit (which was disconnecting the endpoint
  // that was just connected).
  it('cancels event bubble on anchor click so it does not propagate to the stage', () => {
    const rect = createRectElement({ id: 'r1' })
    const onAnchorClick = vi.fn()
    const onAnchorHover = vi.fn()

    render(
      <KonvaTestWrapper>
        <AnchorPoints
          elements={[rect]}
          hoveredAnchor={null}
          onAnchorClick={onAnchorClick}
          onAnchorHover={onAnchorHover}
        />
      </KonvaTestWrapper>,
    )

    const stage = Konva.stages[Konva.stages.length - 1]
    const stageClickSpy = vi.fn()
    stage.on('click', stageClickSpy)

    const topAnchor = stage.findOne('.anchor-r1-top') as Konva.Circle
    topAnchor.fire('click', { cancelBubble: false })

    // onAnchorClick must have fired
    expect(onAnchorClick).toHaveBeenCalledOnce()
    // But the event must NOT have reached the stage
    expect(stageClickSpy).not.toHaveBeenCalled()

    stage.off('click', stageClickSpy)
  })
})
