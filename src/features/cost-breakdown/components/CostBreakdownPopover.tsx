import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { useTransientInteraction } from '../../../shared/ui/transient-interactions'

interface CostBreakdownPopoverProps {
  label: string
  trigger: React.ReactNode
  panelClassName: string
  showChevron?: boolean
  triggerClassName?: string
  children: (close: () => void) => React.ReactNode
}

let activeCBDPopoverDismiss: { owner: symbol; dismiss: () => void } | null = null

export const CostBreakdownPopover: React.FC<CostBreakdownPopoverProps> = ({ label, trigger, panelClassName, showChevron = true, triggerClassName: triggerClassNameOverride, children }) => {
  const boundaryRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const owner = useRef(Symbol('cbd-popover'))
  const pinnedRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const popoverId = React.useId()
  const defaultTriggerClassName = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium leading-none text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }, [])

  const dismissWithoutFocus = useCallback(() => {
    clearHoverTimer()
    pinnedRef.current = false
    setOpen(false)
    if (activeCBDPopoverDismiss?.owner === owner.current) activeCBDPopoverDismiss = null
  }, [clearHoverTimer])

  const close = useCallback(() => {
    dismissWithoutFocus()
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [dismissWithoutFocus])

  const preview = useCallback(() => {
    clearHoverTimer()
    if (open) return
    activeCBDPopoverDismiss?.dismiss()
    activeCBDPopoverDismiss = { owner: owner.current, dismiss: dismissWithoutFocus }
    setOpen(true)
  }, [clearHoverTimer, dismissWithoutFocus, open])

  const scheduleOpen = () => {
    clearHoverTimer()
    if (open || pinnedRef.current) return
    // Match Master Data's toolbar hover-menu delay.
    hoverTimerRef.current = setTimeout(preview, 120)
  }

  // Match Master Data's toolbar menu leave grace while allowing portal travel.
  const scheduleDismiss = () => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      if (pinnedRef.current) return
      const focused = document.activeElement
      if (boundaryRef.current?.contains(focused) || panelRef.current?.contains(focused)) return
      if (boundaryRef.current?.matches(':hover') || panelRef.current?.matches(':hover')) return
      dismissWithoutFocus()
    }, 150)
  }

  const toggleOpen = () => {
    clearHoverTimer()
    if (pinnedRef.current) dismissWithoutFocus()
    else {
      preview()
      pinnedRef.current = true
    }
  }

  useTransientInteraction(open, reason => {
    if (reason === 'escape') close()
    else dismissWithoutFocus()
  })

  const positionPanel = useCallback(() => {
    const triggerElement = triggerRef.current
    const panelElement = panelRef.current
    if (!triggerElement || !panelElement) return
    const triggerBounds = triggerElement.getBoundingClientRect()
    const panelBounds = panelElement.getBoundingClientRect()
    const panelWidth = panelBounds.width || 224
    const panelHeight = panelBounds.height || 160
    const centeredLeft = triggerBounds.left + (triggerBounds.width - panelWidth) / 2
    const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - panelWidth - 8))
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
      if (boundaryRef.current?.contains(target) || panelRef.current?.contains(target)) return
      dismissWithoutFocus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [dismissWithoutFocus, open, positionPanel])

  useEffect(() => () => {
    clearHoverTimer()
    if (activeCBDPopoverDismiss?.owner === owner.current) activeCBDPopoverDismiss = null
  }, [clearHoverTimer])

  const focusFirstOption = () => panelRef.current?.querySelector<HTMLElement>('button, input')?.focus()

  return (
    <div ref={boundaryRef} className="inline-flex shrink-0" onPointerEnter={scheduleOpen} onPointerLeave={scheduleDismiss} onFocusCapture={clearHoverTimer} onBlurCapture={scheduleDismiss}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          title={label}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-haspopup="dialog"
          onClick={toggleOpen}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || ((event.altKey && event.key === 'ArrowDown') || (event.shiftKey && event.key === 'F10'))) {
              event.preventDefault()
              preview()
              requestAnimationFrame(focusFirstOption)
            } else if (event.key === 'Tab' && !event.shiftKey && open) {
              event.preventDefault()
              requestAnimationFrame(focusFirstOption)
            }
          }}
          className={triggerClassNameOverride ?? defaultTriggerClassName}
        >
          {trigger}
          {showChevron && <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 self-center text-slate-600" />}
        </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          id={popoverId}
          role="dialog"
          aria-label={`${label} options`}
          data-cbd-popover="true"
          onPointerEnter={clearHoverTimer}
          onPointerLeave={scheduleDismiss}
          onFocusCapture={clearHoverTimer}
          onBlurCapture={scheduleDismiss}
          onKeyDown={event => {
            if (event.key !== 'Tab') return
            const options = [...(panelRef.current?.querySelectorAll<HTMLElement>('button, input') ?? [])]
            if (event.shiftKey && event.target === options[0]) {
              event.preventDefault()
              triggerRef.current?.focus()
            } else if (!event.shiftKey && event.target === options[options.length - 1]) {
              event.preventDefault()
              const controls = [...document.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
                .filter(control => !panelRef.current?.contains(control))
              const triggerIndex = triggerRef.current ? controls.indexOf(triggerRef.current) : -1
              controls[triggerIndex + 1]?.focus()
              dismissWithoutFocus()
            }
          }}
          style={position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: '-10000px', top: '0px' }}
          className={`fixed z-[1000] max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto border border-slate-300 bg-white p-1 shadow-lg ${panelClassName}`}
        >
          {children(close)}
        </div>,
        document.body
      )}
    </div>
  )
}
