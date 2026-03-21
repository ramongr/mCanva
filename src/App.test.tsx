import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Konva from 'konva'
import App from './App'
import { useCanvasStore } from '@/store/canvasStore'

function resetStore() {
  useCanvasStore.setState({ elements: [], selectedIds: new Set(), activeTool: null })
}

describe('App', () => {
  beforeEach(resetStore)
  afterEach(() => {
    ;[...Konva.stages].forEach((s) => { try { s.destroy() } catch { /* noop */ } })
    cleanup()
  })

  it('renders the toolbar', () => {
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Drawing tools' })).toBeInTheDocument()
  })

  it('renders all four tool buttons including arrow', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Draw a rectangle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draw an ellipse' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draw a line' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draw a connector arrow' })).toBeInTheDocument()
  })

  it('activates the arrow tool when the Arrow button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a connector arrow' }))
    expect(useCanvasStore.getState().activeTool).toBe('arrow')
  })

  it('renders the canvas main area', () => {
    render(<App />)
    expect(screen.getByRole('main', { name: 'Canvas' })).toBeInTheDocument()
  })

  it('activates the rect tool when the Rectangle button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(useCanvasStore.getState().activeTool).toBe('rect')
  })

  it('activates the ellipse tool when the Ellipse button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw an ellipse' }))
    expect(useCanvasStore.getState().activeTool).toBe('ellipse')
  })

  it('activates the line tool when the Line button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a line' }))
    expect(useCanvasStore.getState().activeTool).toBe('line')
  })

  it('deactivates the tool when the active tool button is clicked again', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(useCanvasStore.getState().activeTool).toBe('rect')
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(useCanvasStore.getState().activeTool).toBeNull()
  })

  it('reflects aria-pressed state on the active toolbar button', async () => {
    render(<App />)
    const rectBtn = screen.getByRole('button', { name: 'Draw a rectangle' })
    expect(rectBtn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(rectBtn)
    expect(rectBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
