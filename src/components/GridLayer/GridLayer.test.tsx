import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import Konva from 'konva'
import { Stage } from 'react-konva'
import { GridLayer } from './GridLayer'

function renderGridLayer(width = 100, height = 50) {
  const countBefore = Konva.stages.length
  const result = render(
    <Stage width={width} height={height}>
      <GridLayer width={width} height={height} />
    </Stage>,
  )
  const newStages = Konva.stages.slice(countBefore)
  const stage = newStages[0]
  return { ...result, stage }
}

describe('GridLayer', () => {
  afterEach(() => {
    ;[...Konva.stages].forEach((s) => {
      try { s.destroy() } catch { /* ignore */ }
    })
    cleanup()
  })

  it('renders without errors', () => {
    expect(() => renderGridLayer()).not.toThrow()
  })

  it('renders vertical grid lines for each x position', () => {
    // 100px wide, grid size 10 → x = 0, 10, 20, ..., 100 → 11 vertical lines
    const { stage } = renderGridLayer(100, 50)
    const lines = stage.find('Line') as Konva.Line[]
    const verticals = lines.filter((l) => {
      const pts = l.points()
      return pts[0] === pts[2] // x1 === x2 means vertical
    })
    expect(verticals).toHaveLength(11)
  })

  it('renders horizontal grid lines for each y position', () => {
    // 50px tall, grid size 10 → y = 0, 10, 20, 30, 40, 50 → 6 horizontal lines
    const { stage } = renderGridLayer(100, 50)
    const lines = stage.find('Line') as Konva.Line[]
    const horizontals = lines.filter((l) => {
      const pts = l.points()
      return pts[1] === pts[3] // y1 === y2 means horizontal
    })
    expect(horizontals).toHaveLength(6)
  })

  it('all lines have listening=false', () => {
    const { stage } = renderGridLayer(100, 50)
    const lines = stage.find('Line') as Konva.Line[]
    expect(lines.length).toBeGreaterThan(0)
    lines.forEach((l) => {
      expect(l.listening()).toBe(false)
    })
  })

  it('all lines use the expected stroke color', () => {
    const { stage } = renderGridLayer(100, 50)
    const lines = stage.find('Line') as Konva.Line[]
    lines.forEach((l) => {
      // Konva stores colors in various formats; test the raw config
      expect(l.stroke()).toBe('#e2e8f0')
    })
  })

  it('renders more lines for a larger canvas', () => {
    const { stage: small } = renderGridLayer(100, 100)
    const smallCount = small.find('Line').length

    // A separate render for a larger canvas
    ;[...Konva.stages].forEach((s) => { try { s.destroy() } catch { } })
    cleanup()

    const { stage: large } = renderGridLayer(200, 200)
    const largeCount = large.find('Line').length

    expect(largeCount).toBeGreaterThan(smallCount)
  })
})
