import React, { useCallback, useRef } from 'react'

interface StickyTableHeaderProps {
  ariaLabel: string
  tableClassName: string
  top?: string
  topClassName?: string
  backgroundClassName: string
  headerViewportRef: React.RefObject<HTMLDivElement>
  children: React.ReactNode
}

// Keep the sticky row outside each body's horizontal scroll container, then mirror its scroll offset.
export function useSynchronizedTableHeader() {
  const headerViewportRef = useRef<HTMLDivElement>(null)
  const syncHeaderScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (headerViewportRef.current) headerViewportRef.current.scrollLeft = event.currentTarget.scrollLeft
  }, [])

  return { headerViewportRef, syncHeaderScroll }
}

export const StickyTableHeader: React.FC<StickyTableHeaderProps> = ({
  ariaLabel,
  tableClassName,
  top,
  topClassName = '',
  backgroundClassName,
  headerViewportRef,
  children
}) => {
  return (
    <div data-sticky-table-header="true" className={`sticky z-20 w-full ${topClassName} ${backgroundClassName}`} style={top ? { top } : undefined}>
      <div ref={headerViewportRef} data-sticky-table-header-viewport="true" className="overflow-hidden">
        <table aria-label={ariaLabel} className={tableClassName}>{children}</table>
      </div>
    </div>
  )
}
