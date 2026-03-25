import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { TOOLS } from '@/lib/toolConfig'
import { useCanvasStore } from '@/store/canvasStore'

beforeEach(() => {
  useCanvasStore.setState({ activeTool: null })
})

afterEach(() => {
  cleanup()
})

describe('Toolbar', () => {
  it('renders a button for every tool', () => {
    render(<Toolbar />)
    for (const tool of TOOLS) {
      expect(screen.getByRole('button', { name: tool.description })).toBeInTheDocument()
    }
  })

  it('renders the toolbar landmark with accessible label', () => {
    render(<Toolbar />)
    expect(screen.getByRole('complementary', { name: 'Drawing tools' })).toBeInTheDocument()
  })

  it('sets aria-pressed=false for all tools when activeTool is null', () => {
    render(<Toolbar />)
    for (const tool of TOOLS) {
      const btn = screen.getByRole('button', { name: tool.description })
      expect(btn).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('sets aria-pressed=true for the active tool', () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    render(<Toolbar />)
    const rectBtn = screen.getByRole('button', { name: 'Draw a rectangle' })
    expect(rectBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets activeTool in the store when a tool button is clicked', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(useCanvasStore.getState().activeTool).toBe('rect')
  })

  it('sets activeTool to ellipse when ellipse is clicked', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw an ellipse' }))
    expect(useCanvasStore.getState().activeTool).toBe('ellipse')
  })

  it('sets activeTool to line when line is clicked', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a line' }))
    expect(useCanvasStore.getState().activeTool).toBe('line')
  })

  it('sets activeTool to arrow when arrow is clicked', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a connector arrow' }))
    expect(useCanvasStore.getState().activeTool).toBe('arrow')
  })

  it('sets activeTool to null when the active tool is clicked again (deactivate)', async () => {
    useCanvasStore.setState({ activeTool: 'rect' })
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('shows the keyboard shortcut in the button title', () => {
    render(<Toolbar />)
    expect(screen.getByTitle('Rectangle (R)')).toBeInTheDocument()
    expect(screen.getByTitle('Ellipse (E)')).toBeInTheDocument()
    expect(screen.getByTitle('Line (L)')).toBeInTheDocument()
  })
})
