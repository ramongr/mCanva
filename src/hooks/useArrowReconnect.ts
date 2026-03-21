/**
 * useArrowReconnect — state machine for editing an existing arrow's endpoints.
 *
 * State machine:
 *   idle        → startReconnect(arrowId, endpoint)  → reconnecting
 *   reconnecting → commitAnchor(connection)           → idle  (snap to anchor)
 *   reconnecting → commitFreePoint(x, y)             → idle  (disconnect & place free)
 *   reconnecting → cancel()                          → idle
 *
 * While in "reconnecting" phase the anchor overlay is shown and the cursor
 * follows the mouse to preview where the endpoint will land.
 */
import { useState, useCallback, useRef } from 'react'
import type { ArrowConnection } from '@/types/shapes'

export type ReconnectPhase = 'idle' | 'reconnecting'

export interface ReconnectSession {
  arrowId: string
  /** Which endpoint is being moved: 'from' (tail) or 'to' (head) */
  endpoint: 'from' | 'to'
  /** Live cursor position in canvas coords for the preview line */
  previewPoint: { x: number; y: number } | null
}

export interface UseArrowReconnectOptions {
  /**
   * Called when the user picks a new anchor or disconnects an endpoint.
   * Pass connection=null to disconnect.
   */
  onReconnect: (
    arrowId: string,
    endpoint: 'from' | 'to',
    connection: ArrowConnection | null,
    freePoint?: { x: number; y: number },
  ) => void
}

export interface UseArrowReconnectResult {
  phase: ReconnectPhase
  session: ReconnectSession | null
  hoveredAnchor: ArrowConnection | null
  /** Begin editing an endpoint of an existing arrow */
  startReconnect: (arrowId: string, endpoint: 'from' | 'to') => void
  /** User clicked an anchor — snap and commit */
  commitAnchor: (connection: ArrowConnection, anchorPoint: { x: number; y: number }) => void
  /** User clicked empty canvas — disconnect the endpoint and place it free */
  commitFreePoint: (x: number, y: number) => void
  /** Update the live preview cursor position */
  updatePreview: (x: number, y: number, hovered?: ArrowConnection) => void
  /** Cancel without changing anything */
  cancel: () => void
  setHoveredAnchor: (anchor: ArrowConnection | null) => void
}

export function useArrowReconnect({ onReconnect }: UseArrowReconnectOptions): UseArrowReconnectResult {
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  const [phase, setPhase] = useState<ReconnectPhase>('idle')
  const [session, setSession] = useState<ReconnectSession | null>(null)
  const [hoveredAnchor, setHoveredAnchor] = useState<ArrowConnection | null>(null)

  // Keep session in a ref so commitAnchor/commitFreePoint never go stale
  const sessionRef = useRef(session)
  sessionRef.current = session

  // Keep phase in a ref so updatePreview never goes stale
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const cancel = useCallback(() => {
    setPhase('idle')
    setSession(null)
    setHoveredAnchor(null)
  }, [])

  const startReconnect = useCallback((arrowId: string, endpoint: 'from' | 'to') => {
    setPhase('reconnecting')
    setSession({ arrowId, endpoint, previewPoint: null })
    setHoveredAnchor(null)
  }, [])

  const commitAnchor = useCallback(
    (connection: ArrowConnection, anchorPoint: { x: number; y: number }) => {
      const s = sessionRef.current
      if (!s) return
      onReconnectRef.current(s.arrowId, s.endpoint, connection, anchorPoint)
      cancel()
    },
    [cancel],
  )

  const commitFreePoint = useCallback(
    (x: number, y: number) => {
      const s = sessionRef.current
      if (!s) return
      onReconnectRef.current(s.arrowId, s.endpoint, null, { x, y })
      cancel()
    },
    [cancel],
  )

  const updatePreview = useCallback(
    (x: number, y: number, hovered?: ArrowConnection) => {
      if (phaseRef.current !== 'reconnecting') return
      setSession((s) => s ? { ...s, previewPoint: { x, y } } : s)
      setHoveredAnchor(hovered ?? null)
    },
    [],
  )

  return {
    phase,
    session,
    hoveredAnchor,
    startReconnect,
    commitAnchor,
    commitFreePoint,
    updatePreview,
    cancel,
    setHoveredAnchor,
  }
}
