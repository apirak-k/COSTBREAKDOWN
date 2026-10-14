import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface CostBreakdownPopoverProps {
  label: string
  trigger: React.ReactNode
  panelClassName: string
  buttonClassName?: string
  children: (close: () => void) => React.ReactNode
}

interface PopoverPosition {
  left: number
  top: number
}

export const CostBreakdownPopover: React.FC<CostBreakdownPopoverProps> = ({ label, trigger, panelClassName, buttonClassName = '', children }) => {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const popoverId = React.useId()

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const positionPanel = useCallback(() => {
    const triggerElement = triggerRef.current
    const panelElement = panelRef.current
    if (!triggerElement || !panelElement) return

    const triggerBounds = triggerElement.getBoundingClientRect()
    const panelBounds = panelElement.getBoundingClientRect()
    const panelWidth = panelBounds.width || 224
    const panelHeight = panelBounds.height || 160
    const left = Math.max(8, Math.min(triggerBounds.right - panelWidth, window.innerWidth - panelWidth - 8))
    const below = triggerBounds.bottom + 4
    const above = triggerBounds.top - panelHeight - 4
    const top = below + panelHeight <= window.innerHeight - 8 || above < 8
      ? Math.min(below, window.innerHeight - panelHeight - 8)
      : above
    setPosition({ left, top })
  }, [])

  useEffect(() => {
    if (!open) return
    positionPanel()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [close, open, positionPanel])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        title={label}
        onClick={() => setOpen(current => !current)}
        className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${buttonClassName}`}
      >
        {trigger}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-600" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          id={popoverId}
          role="dialog"
          aria-label={`${label} options`}
          data-cbd-popover="true"
          style={position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: '-10000px', top: '0px' }}
          className={`fixed z-[1000] max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto border border-slate-300 bg-white p-2 shadow-lg ${panelClassName}`}
        >
          {children(close)}
        </div>,
        document.body
      )}
    </>
  )
}
