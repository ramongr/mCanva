import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { TOOLS } from '@/lib/toolConfig'

function setup(activeTool: Parameters<typeof Toolbar>[0]['activeTool'] = null) {
  const onToolSelect = vi.fn()
  render(<Toolbar activeTool={activeTool} onToolSelect={onToolSelect} />)
  return { onToolSelect }
}

describe('Toolbar', () => {
  it('renders a button for every tool', () => {
    setup()
    for (const tool of TOOLS) {
      expect(screen.getByRole('button', { name: tool.description })).toBeInTheDocument()
    }
  })

  it('renders the toolbar landmark with accessible label', () => {
    setup()
    expect(screen.getByRole('complementary', { name: 'Drawing tools' })).toBeInTheDocument()
  })

  it('sets aria-pressed=false for inactive tools', () => {
    setup(null)
    for (const tool of TOOLS) {
      const btn = screen.getByRole('button', { name: tool.description })
      expect(btn).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('sets aria-pressed=true for the active tool', () => {
    setup('rect')
    const rectBtn = screen.getByRole('button', { name: 'Draw a rectangle' })
    expect(rectBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onToolSelect with the tool type when a tool button is clicked', async () => {
    const { onToolSelect } = setup(null)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(onToolSelect).toHaveBeenCalledWith('rect')
  })

  it('calls onToolSelect with ellipse when ellipse is clicked', async () => {
    const { onToolSelect } = setup(null)
    await userEvent.click(screen.getByRole('button', { name: 'Draw an ellipse' }))
    expect(onToolSelect).toHaveBeenCalledWith('ellipse')
  })

  it('calls onToolSelect with line when line is clicked', async () => {
    const { onToolSelect } = setup(null)
    await userEvent.click(screen.getByRole('button', { name: 'Draw a line' }))
    expect(onToolSelect).toHaveBeenCalledWith('line')
  })

  it('calls onToolSelect with null when the active tool is clicked again (deactivate)', async () => {
    const { onToolSelect } = setup('rect')
    await userEvent.click(screen.getByRole('button', { name: 'Draw a rectangle' }))
    expect(onToolSelect).toHaveBeenCalledWith(null)
  })

  it('shows the keyboard shortcut in the button title', () => {
    setup()
    expect(screen.getByTitle('Rectangle (R)')).toBeInTheDocument()
    expect(screen.getByTitle('Ellipse (E)')).toBeInTheDocument()
    expect(screen.getByTitle('Line (L)')).toBeInTheDocument()
  })
})
