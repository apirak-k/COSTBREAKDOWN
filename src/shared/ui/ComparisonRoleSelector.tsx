import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import type { MasterDataRole } from '../../core/types'
import { Tooltip } from './Tooltip'
import { closeExclusivePopover, openExclusivePopover, useTransientInteraction } from './transient-interactions'

export const COMPARISON_ROLES: readonly MasterDataRole[] = ['reference', 'current', 'custom']
export const COMPARISON_ROLE_LABELS: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

export function availableComparisonRoles(role: MasterDataRole): MasterDataRole[] {
  return COMPARISON_ROLES.filter(option => option !== role)
}

interface ComparisonRoleSelectorProps {
  side: 'Before' | 'After'
  role: MasterDataRole
  onChange: (role: MasterDataRole) => void
}

const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const ComparisonRoleSelector: React.FC<ComparisonRoleSelectorProps> = ({ side, role, onChange }) => {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const boundaryRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const owner = useRef(Symbol('comparison-role-selector'))
  const pinnedRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuId = useId()
  const availableRoles = availableComparisonRoles(role)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = null
  }, [])

  const dismissWithoutFocus = useCallback(() => {
    clearHoverTimer()
    pinnedRef.current = false
    setOpen(false)
    closeExclusivePopover(owner.current)
  }, [clearHoverTimer])

  const close = useCallback((restoreFocus = false) => {
    dismissWithoutFocus()
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [dismissWithoutFocus])

  const preview = useCallback(() => {
    clearHoverTimer()
    if (open) return
    openExclusivePopover(owner.current, dismissWithoutFocus)
    setOpen(true)
  }, [clearHoverTimer, dismissWithoutFocus, open])

  const scheduleOpen = () => {
    clearHoverTimer()
    if (open || pinnedRef.current) return
    hoverTimerRef.current = setTimeout(preview, 120)
  }

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
    if (pinnedRef.current) close()
    else {
      preview()
      pinnedRef.current = true
    }
  }

  useTransientInteraction(open, reason => close(reason === 'escape'))
  useEffect(() => () => clearHoverTimer(), [clearHoverTimer])

  useSafeLayoutEffect(() => {
    if (!open) return
    const positionPanel = () => {
      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger || !panel) return
      const triggerBounds = trigger.getBoundingClientRect()
      panel.style.minWidth = `${triggerBounds.width}px`
      const panelBounds = panel.getBoundingClientRect()
      const centeredLeft = triggerBounds.left + (triggerBounds.width - panelBounds.width) / 2
      const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - panelBounds.width - 8))
      const below = triggerBounds.bottom + 4
      const above = triggerBounds.top - panelBounds.height - 4
      const top = below + panelBounds.height <= window.innerHeight - 8 || above < 8
        ? Math.min(below, window.innerHeight - panelBounds.height - 8)
        : above
      setPosition({ left, top })
    }
    positionPanel()
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', positionPanel, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (boundaryRef.current?.contains(target) || panelRef.current?.contains(target)) return
      dismissWithoutFocus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [dismissWithoutFocus, open])

  useEffect(() => () => closeExclusivePopover(owner.current), [])

  const focusOption = (index: number) => {
    requestAnimationFrame(() => menuItemRefs.current[index]?.focus())
  }

  return (
    <div
      ref={boundaryRef}
      data-comparison-role-selector="true"
      className="inline-flex shrink-0"
      onPointerEnter={scheduleOpen}
      onPointerLeave={scheduleDismiss}
      onFocusCapture={clearHoverTimer}
      onBlurCapture={event => {
        if (boundaryRef.current?.contains(event.relatedTarget as Node | null)
          || panelRef.current?.contains(event.relatedTarget as Node | null)) return
        scheduleDismiss()
      }}
    >
      <Tooltip label={side}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${side} dataset, ${COMPARISON_ROLE_LABELS[role]}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggleOpen}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp'
              || (event.altKey && event.key === 'ArrowDown')
              || (event.shiftKey && event.key === 'F10')) {
              event.preventDefault()
              preview()
              focusOption(event.key === 'ArrowUp' ? availableRoles.length - 1 : 0)
            }
          }}
          className="inline-flex h-8 w-[96px] shrink-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-sm border border-slate-300 bg-white px-2 text-xs font-medium leading-none text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <span className="whitespace-nowrap">{COMPARISON_ROLE_LABELS[role]}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        </button>
      </Tooltip>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={`${side} dataset choices`}
          data-comparison-role-menu="true"
          onPointerEnter={clearHoverTimer}
          onPointerLeave={scheduleDismiss}
          onFocusCapture={clearHoverTimer}
          onBlurCapture={scheduleDismiss}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault()
              close(true)
              return
            }
            const activeIndex = menuItemRefs.current.findIndex(item => item === document.activeElement)
            if (event.key === 'Tab') {
              if (event.shiftKey && activeIndex === 0) {
                event.preventDefault()
                close(true)
              } else if (!event.shiftKey && activeIndex === availableRoles.length - 1) {
                event.preventDefault()
                const controls = [...document.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
                  .filter(control => !panelRef.current?.contains(control))
                const triggerIndex = triggerRef.current ? controls.indexOf(triggerRef.current) : -1
                controls[triggerIndex + 1]?.focus()
                close()
              }
              return
            }
            const nextIndex = event.key === 'ArrowDown'
              ? (activeIndex + 1) % availableRoles.length
              : event.key === 'ArrowUp'
                ? (activeIndex - 1 + availableRoles.length) % availableRoles.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? availableRoles.length - 1 : null
            if (nextIndex !== null) {
              event.preventDefault()
              menuItemRefs.current[nextIndex]?.focus()
            }
          }}
          style={position ? { left: `${position.left}px`, top: `${position.top}px` } : { left: '-10000px', top: '0px' }}
          className="fixed z-[1000] max-h-[min(20rem,calc(100vh-1rem))] w-max max-w-[calc(100vw-1rem)] overflow-y-auto border border-slate-300 bg-white p-1 shadow-lg"
        >
          {availableRoles.map((optionRole, index) => (
            <button
              key={optionRole}
              ref={element => { menuItemRefs.current[index] = element }}
              type="button"
              role="menuitem"
              tabIndex={0}
              onClick={() => { onChange(optionRole); close(true) }}
              className="block min-h-8 w-full whitespace-nowrap rounded-sm px-2 text-left text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {COMPARISON_ROLE_LABELS[optionRole]}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
