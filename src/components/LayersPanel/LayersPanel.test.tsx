import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LayersPanel } from './LayersPanel'
import { useCanvasStore } from '@/store/canvasStore'
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

function resetStore(elements: WireframeElement[] = makeElements()) {
  useCanvasStore.setState({ elements, selectedIds: new Set() })
}

beforeEach(() => resetStore())
afterEach(() => cleanup())

describe('LayersPanel', () => {
  describe('rendering', () => {
    it('renders the panel', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layers-panel')).toBeInTheDocument()
    })

    it('shows the element count badge', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layers-count')).toHaveTextContent('3')
    })

    it('renders a row for each element', () => {
      render(<LayersPanel />)
      for (const el of makeElements()) {
        expect(screen.getByTestId(`layer-row-${el.id}`)).toBeInTheDocument()
      }
    })

    it('shows "No layers yet" when elements list is empty', () => {
      resetStore([])
      render(<LayersPanel />)
      expect(screen.getByText('No layers yet')).toBeInTheDocument()
    })

    it('renders elements in reverse z-order (last element first)', () => {
      render(<LayersPanel />)
      const rows = screen.getAllByTestId(/^layer-row-/)
      // Last element in array (a1) should appear first in the list
      expect(rows[0]).toHaveAttribute('data-testid', 'layer-row-a1')
      expect(rows[1]).toHaveAttribute('data-testid', 'layer-row-e1')
      expect(rows[2]).toHaveAttribute('data-testid', 'layer-row-r1')
    })

    it('displays element label when set', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-label-r1')).toHaveTextContent('Box')
    })

    it('falls back to type name when label is empty', () => {
      render(<LayersPanel />)
      // e1 has no label, should show type 'ellipse'
      expect(screen.getByTestId('layer-label-e1')).toHaveTextContent('ellipse')
    })

    it('shows type badge for each element', () => {
      render(<LayersPanel />)
      expect(screen.getAllByText('rect').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ellipse').length).toBeGreaterThan(0)
      expect(screen.getAllByText('arrow').length).toBeGreaterThan(0)
    })

    it('highlights selected rows', () => {
      useCanvasStore.setState({ selectedIds: new Set(['r1']) })
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-row-r1').className).toContain('bg-blue-50')
    })

    it('does not highlight unselected rows with selection color', () => {
      useCanvasStore.setState({ selectedIds: new Set(['r1']) })
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-row-e1').className).not.toContain('bg-blue-50')
    })
  })

  describe('visibility toggle', () => {
    it('renders visible button for each element', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-visible-r1')).toBeInTheDocument()
    })

    it('sets visible=false in the store when eye button clicked on visible element', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.visible).toBe(false)
    })

    it('sets visible=true in the store when eye button clicked on hidden element', () => {
      resetStore([createRectElement({ id: 'r1', visible: false })])
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.visible).toBe(true)
    })

    it('does not change selection when eye button is clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-visible-r1'))
      expect(useCanvasStore.getState().selectedIds.size).toBe(0)
    })
  })

  describe('lock toggle', () => {
    it('renders lock button for each element', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-lock-r1')).toBeInTheDocument()
    })

    it('sets locked=true in the store when lock button clicked on unlocked element', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.locked).toBe(true)
    })

    it('sets locked=false in the store when lock button clicked on locked element', () => {
      resetStore([createRectElement({ id: 'r1', locked: true })])
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.locked).toBe(false)
    })

    it('does not change selection when lock button is clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-lock-r1'))
      expect(useCanvasStore.getState().selectedIds.size).toBe(0)
    })
  })

  describe('row selection', () => {
    it('selects the element in the store on plain click', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-row-r1'))
      expect(useCanvasStore.getState().selectedIds).toEqual(new Set(['r1']))
    })

    it('adds to selection on shift+click', () => {
      useCanvasStore.setState({ selectedIds: new Set(['e1']) })
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-row-r1'), { shiftKey: true })
      expect(useCanvasStore.getState().selectedIds).toEqual(new Set(['e1', 'r1']))
    })

    it('replaces selection on plain click when another is selected', () => {
      useCanvasStore.setState({ selectedIds: new Set(['e1']) })
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-row-r1'))
      expect(useCanvasStore.getState().selectedIds).toEqual(new Set(['r1']))
    })
  })

  describe('bring to front / send to back', () => {
    it('renders bring-to-front button for each element', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-bring-front-r1')).toBeInTheDocument()
    })

    it('moves element to top of the store elements array when bring-to-front clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-bring-front-r1'))
      const elements = useCanvasStore.getState().elements
      expect(elements[elements.length - 1].id).toBe('r1')
    })

    it('moves element to bottom of the store elements array when send-to-back clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-send-back-a1'))
      const elements = useCanvasStore.getState().elements
      expect(elements[0].id).toBe('a1')
    })

    it('does not change selection when bring-to-front is clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-bring-front-r1'))
      expect(useCanvasStore.getState().selectedIds.size).toBe(0)
    })
  })

  describe('inline label editing', () => {
    it('shows label text before editing starts', () => {
      render(<LayersPanel />)
      expect(screen.getByTestId('layer-label-r1')).toBeInTheDocument()
      expect(screen.queryByTestId('layer-label-input-r1')).not.toBeInTheDocument()
    })

    it('switches to input when label text is clicked', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      expect(screen.getByTestId('layer-label-input-r1')).toBeInTheDocument()
    })

    it('updates label in the store on blur', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Updated Label' } })
      fireEvent.blur(input)
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.label).toBe('Updated Label')
    })

    it('updates label in the store when Enter is pressed', () => {
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Enter Label' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.label).toBe('Enter Label')
    })

    it('cancels editing on Escape without updating the store', () => {
      const originalLabel = useCanvasStore.getState().elements.find((e) => e.id === 'r1')?.label
      render(<LayersPanel />)
      fireEvent.click(screen.getByTestId('layer-label-r1'))
      const input = screen.getByTestId('layer-label-input-r1')
      fireEvent.change(input, { target: { value: 'Changed' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      const el = useCanvasStore.getState().elements.find((e) => e.id === 'r1')
      expect(el?.label).toBe(originalLabel)
      expect(screen.queryByTestId('layer-label-input-r1')).not.toBeInTheDocument()
    })
  })
})
