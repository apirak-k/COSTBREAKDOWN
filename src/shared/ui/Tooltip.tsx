import React, { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  children: React.ReactElement<{ 'aria-describedby'?: string }>
  wrapperClassName?: string
  showOnFocus?: boolean
  dismissSignal?: number
}

export const Tooltip: React.FC<TooltipProps> = ({ label, children, wrapperClassName = 'relative inline-flex', showOnFocus = true, dismissSignal }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const tooltipId = React.useId()

  const positionTooltip = useCallback(() => {
    const wrapper = wrapperRef.current
    const tooltip = tooltipRef.current
    if (!wrapper || !tooltip) return
    const previousDisplay = tooltip.style.display
    const previousVisibility = tooltip.style.visibility
    tooltip.style.display = 'block'
    tooltip.style.visibility = 'hidden'
    const bounds = wrapper.getBoundingClientRect()
    const tooltipBounds = tooltip.getBoundingClientRect()
    tooltip.style.display = previousDisplay
    tooltip.style.visibility = previousVisibility
    const width = tooltipBounds.width || Math.min(240, window.innerWidth - 16)
    const left = Math.max(8, Math.min(bounds.left + (bounds.width - width) / 2, window.innerWidth - width - 8))
    const above = bounds.top - tooltipBounds.height - 5
    const below = bounds.bottom + 5
    const top = above >= 8 ? above : below + tooltipBounds.height <= window.innerHeight - 8
      ? below
      : Math.max(8, window.innerHeight - tooltipBounds.height - 8)
    setPosition({ left, top })
  }, [])

  useEffect(() => {
    if (!visible) return
    window.addEventListener('resize', positionTooltip)
    window.addEventListener('scroll', positionTooltip, true)
    return () => {
      window.removeEventListener('resize', positionTooltip)
      window.removeEventListener('scroll', positionTooltip, true)
    }
  }, [positionTooltip, visible])

  useLayoutEffect(() => {
    if (dismissSignal !== undefined) setVisible(false)
  }, [dismissSignal])

  const describedBy = [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  return (
    <span
      ref={wrapperRef}
      className={wrapperClassName}
      onPointerEnter={() => { positionTooltip(); setVisible(true) }}
      onPointerLeave={() => setVisible(false)}
      onFocusCapture={() => {
        if (!showOnFocus) return
        positionTooltip()
        setVisible(true)
      }}
      onBlurCapture={event => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setVisible(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setVisible(false)
      }}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      {typeof document !== 'undefined' && createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={position === null ? { left: '-10000px', top: '0px' } : { left: `${position.left}px`, top: `${position.top}px` }}
          className={`pointer-events-none fixed z-[1000] ${visible ? 'block' : 'hidden'} max-w-[calc(100vw-1rem)] whitespace-pre-line border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] leading-4 text-white shadow-md`}
        >
          {label}
        </span>,
        document.body
      )}
    </span>
  )
}
