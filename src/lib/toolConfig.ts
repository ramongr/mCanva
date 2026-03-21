/**
 * Tool configuration — metadata for each available wireframing tool.
 * Kept in a library file so Toolbar, keyboard shortcuts, and other
 * consumers can all share the same source of truth.
 */
import type { ShapeType } from '@/types/shapes'

export interface ToolConfig {
  /** Discriminant — matches ShapeType */
  type: ShapeType
  /** Human-readable label shown in the toolbar */
  label: string
  /** Accessible description for aria-label */
  description: string
  /** Keyboard shortcut character (pressed alone to activate the tool) */
  shortcut: string
}

export const TOOLS: ToolConfig[] = [
  {
    type: 'rect',
    label: 'Rectangle',
    description: 'Draw a rectangle',
    shortcut: 'R',
  },
  {
    type: 'ellipse',
    label: 'Ellipse',
    description: 'Draw an ellipse',
    shortcut: 'E',
  },
  {
    type: 'line',
    label: 'Line',
    description: 'Draw a line',
    shortcut: 'L',
  },
  {
    type: 'arrow',
    label: 'Arrow',
    description: 'Draw a connector arrow',
    shortcut: 'A',
  },
]

/** Returns the ToolConfig for the given ShapeType, or undefined */
export function getToolConfig(type: ShapeType): ToolConfig | undefined {
  return TOOLS.find((t) => t.type === type)
}
