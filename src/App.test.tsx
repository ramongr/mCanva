import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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

  it('renders the canvas main area', () => {
    render(<App />)
    expect(screen.getByRole('main', { name: 'Canvas' })).toBeInTheDocument()
  })

  it('renders the layers panel', () => {
    render(<App />)
    expect(screen.getByTestId('layers-panel')).toBeInTheDocument()
  })
})
