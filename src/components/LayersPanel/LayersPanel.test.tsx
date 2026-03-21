import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayersPanel } from './LayersPanel'
import {
  createRectElement,
  createEllipseElement,
  createArrowElement,
} from '@/lib/shapes'
import type { WireframeElement } from '@/types/shapes'

function makeElements(): WireframeElement[] {
  return [
    createRectElement({ id: 'r1', label: 'Box' }),
    createEllipseElement({ id: 'e1', label: '' }),
    createArrowElement(0, 0, 100, 100, { id: 'a1', label: 'Flow' }),
  ]
}

const defaultProps = {
  selectedIds: new Set<string>(),
  onSelect: vi.fn(),
  onUpdate: vi.fn(),
  onMoveElementTo: vi.fn(),
  onBringToFront: vi.fn(),
  onSendToBack: vi.fn(),
}

function setup(
  overrides: Partial<typeof defaultProps> & {
    elements?: WireframeElement[]
  } = {},
) {
  const elements = overrides.elements ?? makeElements()
  const props = { ...defaultProps, ...overrides, elements }
  render(<LayersPanel {...props} />)
  return { ...props, elements }
}

describe('LayersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the panel', () => {
      setup()
      expect(screen.getByTestId('layers-panel')).toBeInTheDocument()
    })

    it('shows the element count badge', () => {
      setup()
      expect(screen.getByTestId('layers-count')).toHaveTextContent('3')
    })

    it('renders a row for each element', () => {
      const elements = makeElements()
      setup({ elements })
      for (const el of elements) {
        expect(screen.getByTestId(`layer-row-${el.id}`)).toBeInTheDocument()
      }
    })

    it('shows "No layers yet" when elements list is empty', () => {
      setup({ elements: [] })
      expect(screen.getByText('No layers yet')).toBeInTheDocument()
    })

    it('renders elements in reverse z-order (last element first)', () => {
      const elements = makeElements()
      setup({ elements })
      const rows = screen.getAllByTestId(/^layer-row-/)
      // Last element in array (a1) should appear first in the list
      expect(rows[0]).toHaveAttribute('data-testid', 'layer-row-a1')
      expect(rows[1]).toHaveAttribute('data-testid', 'layer-row-e1')
      expect(rows[2]).toHaveAttribute('data-testid', 'layer-row-r1')
    })

    it('displays element label when set', () => {
      setup()
      expect(screen.getByTestId('layer-label-r1')).toHaveTextContent('Box')
    })

    it('falls back to type name when label is empty', () => {
      setup()
      // e1 has no label, should show type 'ellipse'
      expect(screen.getByTestId('layer-label-e1')).toHaveTextContent('ellipse')
    })

    it('shows type badge for each element', () => {
      setup()
      // All three type badges should appear
      expect(screen.getAllByText('rect').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ellipse').length).toBeGreaterThan(0)
      expect(screen.getAllByText('arrow').length).toBeGreaterThan(0)
    })

    it('highlights selected rows', () => {
      setup({ selectedIds: new Set(['r1']) })
      const row = screen.getByTestId('layer-row-r1')
      expect(row.className).toContain('bg-blue-50')
    })

    it('does not highlight unselected rows with selection color', () => {
      setup({ selectedIds: new Set(['r1']) })
      const row = screen.getByTestId('layer-row-e1')
      expect(row.className).not.toContain('bg-blue-50')
    })
  })

  describe('visibility toggle', () => {
    it('renders visible button for each element', () => {
      setup()
      expect(screen.getByTestId('layer-visible-r1')).toBeInTheDocument()
    })

    it('calls onUpdate with visible toggled when eye button clicked', () => {
      const onUpdate = vi.fn()
      const elements = makeElements()
      // r1 is visible by default
      setup({ elements, onUpdate })
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', visible: false })
    })

    it('calls onUpdate with visible=true for hidden element', () => {
      const onUpdate = vi.fn()
      const elements = [createRectElement({ id: 'r1', visible: false })]
      setup({ elements, onUpdate })
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', visible: true })
    })

    it('does not call onSelect when eye button is clicked', () => {
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('lock toggle', () => {
    it('renders lock button for each element', () => {
      setup()
      expect(screen.getByTestId('layer-lock-r1')).toBeInTheDocument()
    })

    it('calls onUpdate with locked toggled when lock button clicked', () => {
      const onUpdate = vi.fn()
      const elements = makeElements()
      setup({ elements, onUpdate })
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', locked: true })
    })

    it('calls onUpdate with locked=false for locked element', () => {
      const onUpdate = vi.fn()
      const elements = [createRectElement({ id: 'r1', locked: true })]
      setup({ elements, onUpdate })
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', locked: false })
    })

    it('does not call onSelect when lock button is clicked', () => {
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('row selection', () => {
    it('calls onSelect with element id and shiftKey=false on plain click', () => {
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByTestId('layer-row-r1'))
      expect(onSelect).toHaveBeenCalledWith('r1', false)
    })

    it('calls onSelect with shiftKey=true on shift+click', () => {
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByTestId('layer-row-r1'), { shiftKey: true })
      expect(onSelect).toHaveBeenCalledWith('r1', true)
    })
  })

  describe('bring to front / send to back', () => {
    it('renders bring-to-front button for each element', () => {
      setup()
      expect(screen.getByTestId('layer-bring-front-r1')).toBeInTheDocument()
    })

    it('calls onBringToFront when bring-to-front is clicked', () => {
      const onBringToFront = vi.fn()
      setup({ onBringToFront })
      fireEvent.click(screen.getByTestId('layer-bring-front-r1'))
      expect(onBringToFront).toHaveBeenCalledWith('r1')
    })

    it('calls onSendToBack when send-to-back is clicked', () => {
      const onSendToBack = vi.fn()
      setup({ onSendToBack })
      fireEvent.click(screen.getByTestId('layer-send-back-r1'))
      expect(onSendToBack).toHaveBeenCalledWith('r1')
    })

    it('does not call onSelect when bring-to-front is clicked', () => {
      const onSelect = vi.fn()
      setup({ onSelect })
      fireEvent.click(screen.getByTestId('layer-bring-front-r1'))
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('inline label editing', () => {
    it('shows label text before editing starts', () => {
      setup()
      expect(screen.getByTestId('layer-label-r1')).toBeInTheDocument()
      expect(screen.queryByTestId('layer-label-input-r1')).not.toBeInTheDocument()
    })

    it('switches to input when label text is clicked', () => {
      setup()
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      expect(screen.getByTestId('layer-label-input-r1')).toBeInTheDocument()
    })

    it('calls onUpdate with new label on blur', () => {
      const onUpdate = vi.fn()
      setup({ onUpdate })
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Updated Label' } })
      fireEvent.blur(input)
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', label: 'Updated Label' })
    })

    it('calls onUpdate with new label when Enter is pressed', () => {
      const onUpdate = vi.fn()
      setup({ onUpdate })
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Enter Label' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', label: 'Enter Label' })
    })

    it('cancels editing on Escape without calling onUpdate', () => {
      const onUpdate = vi.fn()
      setup({ onUpdate })
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Changed' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.queryByTestId('layer-label-input-r1')).not.toBeInTheDocument()
    })
  })
})
