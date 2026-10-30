import { useEffect, useRef } from 'react'
import type { ReactNode, PointerEvent, FocusEvent, KeyboardEvent, ClipboardEvent, WheelEvent, ChangeEvent } from 'react'

interface SimulationHistoryInputBoundaryProps {
  children: ReactNode
  onBegin: () => void
  onCommit: () => void
}

export function SimulationHistoryInputBoundary({ children, onBegin, onCommit }: SimulationHistoryInputBoundaryProps) {
  const pointerActive = useRef(false)
  const releaseListeners = useRef<(() => void) | null>(null)
  const callbacks = useRef({ onBegin, onCommit })
  callbacks.current = { onBegin, onCommit }

  useEffect(() => {
    return () => releaseListeners.current?.()
  }, [])

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
    callbacks.current.onCommit()
  }
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || pointerActive.current) return
    const pointerId = event.pointerId
    pointerActive.current = true
    const finishPointerEdit = (pointerEvent: globalThis.PointerEvent) => {
      if (!pointerActive.current || pointerEvent.pointerId !== pointerId) return
      pointerActive.current = false
      releaseListeners.current?.()
      releaseListeners.current = null
      callbacks.current.onCommit()
    }
    window.addEventListener('pointerup', finishPointerEdit, true)
    window.addEventListener('pointercancel', finishPointerEdit, true)
    releaseListeners.current = () => {
      window.removeEventListener('pointerup', finishPointerEdit, true)
      window.removeEventListener('pointercancel', finishPointerEdit, true)
    }
    callbacks.current.onBegin()
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') callbacks.current.onBegin()
  }
  const handleChange = (_event: ChangeEvent<HTMLDivElement>) => callbacks.current.onBegin()
  const handlePaste = (_event: ClipboardEvent<HTMLDivElement>) => callbacks.current.onBegin()
  const handleWheel = (_event: WheelEvent<HTMLDivElement>) => callbacks.current.onBegin()

  return (
    <div
      className="contents"
      onFocusCapture={() => callbacks.current.onBegin()}
      onBlurCapture={handleBlur}
      onPointerDownCapture={handlePointerDown}
      onKeyDownCapture={handleKeyDown}
      onChangeCapture={handleChange}
      onPasteCapture={handlePaste}
      onWheelCapture={handleWheel}
    >
      {children}
    </div>
  )
}
