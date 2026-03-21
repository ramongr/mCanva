import { describe, it, expect } from 'vitest'
import { TOOLS, getToolConfig } from './toolConfig'

describe('TOOLS', () => {
  it('contains all four shape types including arrow', () => {
    const types = TOOLS.map((t) => t.type)
    expect(types).toContain('rect')
    expect(types).toContain('ellipse')
    expect(types).toContain('line')
    expect(types).toContain('arrow')
  })

  it('every tool has a non-empty label, description, and shortcut', () => {
    for (const tool of TOOLS) {
      expect(tool.label.length).toBeGreaterThan(0)
      expect(tool.description.length).toBeGreaterThan(0)
      expect(tool.shortcut.length).toBeGreaterThan(0)
    }
  })

  it('all shortcuts are unique', () => {
    const shortcuts = TOOLS.map((t) => t.shortcut.toUpperCase())
    expect(new Set(shortcuts).size).toBe(shortcuts.length)
  })
})

describe('getToolConfig', () => {
  it('returns the correct config for rect', () => {
    const config = getToolConfig('rect')
    expect(config).toBeDefined()
    expect(config!.type).toBe('rect')
    expect(config!.label).toBe('Rectangle')
  })

  it('returns the correct config for ellipse', () => {
    const config = getToolConfig('ellipse')
    expect(config!.type).toBe('ellipse')
  })

  it('returns the correct config for line', () => {
    const config = getToolConfig('line')
    expect(config!.type).toBe('line')
  })

  it('returns the correct config for arrow', () => {
    const config = getToolConfig('arrow')
    expect(config).toBeDefined()
    expect(config!.type).toBe('arrow')
    expect(config!.label).toBe('Arrow')
    expect(config!.shortcut).toBe('A')
  })
})
