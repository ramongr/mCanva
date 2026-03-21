import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FloatingToolbar } from './FloatingToolbar'
import { createRectElement, createEllipseElement, createLineElement } from '@/lib/shapes'

const POSITION = { x: 100, y: 50 }

function setup(
  elementOverrides: Parameters<typeof createRectElement>[0] = {},
  onUpdate = vi.fn(),
) {
  const element = createRectElement({ id: 'r1', ...elementOverrides })
  render(
    <FloatingToolbar element={element} position={POSITION} onUpdate={onUpdate} />,
  )
  return { onUpdate, element }
}

describe('FloatingToolbar', () => {
  describe('rendering', () => {
    it('renders the toolbar container', () => {
      setup()
      expect(screen.getByTestId('floating-toolbar')).toBeInTheDocument()
    })

    it('positions the toolbar at the given coordinates', () => {
      setup()
      const toolbar = screen.getByTestId('floating-toolbar')
      expect(toolbar).toHaveStyle({ left: '100px', top: '50px' })
    })

    it('renders stroke color input', () => {
      setup()
      expect(screen.getByTestId('stroke-color-input')).toBeInTheDocument()
    })

    it('renders stroke width input', () => {
      setup()
      expect(screen.getByTestId('stroke-width-input')).toBeInTheDocument()
    })

    it('renders fill transparent toggle', () => {
      setup()
      expect(screen.getByTestId('fill-transparent-toggle')).toBeInTheDocument()
    })

    it('renders corner radius input for rect elements', () => {
      setup()
      expect(screen.getByTestId('corner-radius-input')).toBeInTheDocument()
    })

    it('does not render corner radius input for ellipse elements', () => {
      const element = createEllipseElement({ id: 'e1' })
      render(<FloatingToolbar element={element} position={POSITION} onUpdate={vi.fn()} />)
      expect(screen.queryByTestId('corner-radius-input')).not.toBeInTheDocument()
    })

    it('does not render corner radius input for line elements', () => {
      const element = createLineElement({ id: 'l1' })
      render(<FloatingToolbar element={element} position={POSITION} onUpdate={vi.fn()} />)
      expect(screen.queryByTestId('corner-radius-input')).not.toBeInTheDocument()
    })

    it('does not render fill color input when fill is transparent', () => {
      setup({ fill: 'transparent' })
      expect(screen.queryByTestId('fill-color-input')).not.toBeInTheDocument()
    })

    it('renders fill color input when fill is not transparent', () => {
      setup({ fill: '#ff0000' })
      expect(screen.getByTestId('fill-color-input')).toBeInTheDocument()
    })

    it('shows transparent toggle as pressed when fill is transparent', () => {
      setup({ fill: 'transparent' })
      const toggle = screen.getByTestId('fill-transparent-toggle')
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows transparent toggle as not pressed when fill has a color', () => {
      setup({ fill: '#ff0000' })
      const toggle = screen.getByTestId('fill-transparent-toggle')
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('interactions', () => {
    it('calls onUpdate with new fill color when fill input changes', () => {
      const onUpdate = vi.fn()
      const element = createRectElement({ id: 'r1', fill: '#ff0000' })
      render(<FloatingToolbar element={element} position={POSITION} onUpdate={onUpdate} />)
      fireEvent.change(screen.getByTestId('fill-color-input'), {
        target: { value: '#00ff00' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', fill: '#00ff00' })
    })

    it('calls onUpdate with transparent fill when toggle is clicked while fill is a color', () => {
      const onUpdate = vi.fn()
      const element = createRectElement({ id: 'r1', fill: '#ff0000' })
      render(<FloatingToolbar element={element} position={POSITION} onUpdate={onUpdate} />)
      fireEvent.click(screen.getByTestId('fill-transparent-toggle'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', fill: 'transparent' })
    })

    it('calls onUpdate with white fill when toggle is clicked while fill is transparent', () => {
      const onUpdate = vi.fn()
      setup({ fill: 'transparent' }, onUpdate)
      fireEvent.click(screen.getByTestId('fill-transparent-toggle'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', fill: '#ffffff' })
    })

    it('calls onUpdate with new stroke color when stroke input changes', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('stroke-color-input'), {
        target: { value: '#123456' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', stroke: '#123456' })
    })

    it('calls onUpdate with new stroke width when width input changes', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('stroke-width-input'), {
        target: { value: '5' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', strokeWidth: 5 })
    })

    it('clamps stroke width to minimum 1', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('stroke-width-input'), {
        target: { value: '0' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', strokeWidth: 1 })
    })

    it('clamps stroke width to maximum 20', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('stroke-width-input'), {
        target: { value: '99' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', strokeWidth: 20 })
    })

    it('calls onUpdate with new corner radius when radius input changes', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('corner-radius-input'), {
        target: { value: '12' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', cornerRadius: 12 })
    })

    it('clamps corner radius to minimum 0', () => {
      const onUpdate = vi.fn()
      setup({}, onUpdate)
      fireEvent.change(screen.getByTestId('corner-radius-input'), {
        target: { value: '-5' },
      })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', cornerRadius: 0 })
    })

    it('reflects current strokeWidth value in the input', () => {
      setup({ strokeWidth: 7 })
      const input = screen.getByTestId('stroke-width-input') as HTMLInputElement
      expect(input.value).toBe('7')
    })

    it('reflects current cornerRadius value in the input', () => {
      setup({ cornerRadius: 15 })
      const input = screen.getByTestId('corner-radius-input') as HTMLInputElement
      expect(input.value).toBe('15')
    })
  })
})
