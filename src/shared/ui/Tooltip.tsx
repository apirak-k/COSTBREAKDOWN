import React, { cloneElement, useCallback, useEffect, useRef, useState } from 'react'

interface TooltipProps {
  label: string
  children: React.ReactElement<{ 'aria-describedby'?: string }>
}

export const Tooltip: React.FC<TooltipProps> = ({ label, children }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const tooltipId = React.useId()

  const positionTooltip = useCallback(() => {
    const wrapper = wrapperRef.current
    const tooltip = wrapper?.querySelector<HTMLElement>('[role="tooltip"]')
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
    setPosition({ left, top: Math.max(8, bounds.top - tooltipBounds.height - 5) })
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

  const describedBy = [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onPointerEnter={() => { positionTooltip(); setVisible(true) }}
      onPointerLeave={() => setVisible(false)}
      onFocusCapture={() => { positionTooltip(); setVisible(true) }}
      onBlurCapture={event => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setVisible(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setVisible(false)
      }}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span
        id={tooltipId}
        role="tooltip"
        style={position === null ? undefined : { left: `${position.left}px`, top: `${position.top}px` }}
        className={`pointer-events-none fixed z-[80] ${visible ? 'block' : 'hidden'} max-w-[calc(100vw-1rem)] border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] leading-4 text-white shadow-md`}
      >
        {label}
      </span>
    </span>
  )
}
