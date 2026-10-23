import type { HTMLAttributes, Ref } from 'react'

interface NumericColumnSlotProps extends HTMLAttributes<HTMLSpanElement> {
  elementRef?: Ref<HTMLSpanElement>
  percentage?: boolean
  showSuffix?: boolean
  suffixAriaHidden?: boolean
}

/** Allocate the numeric region once; a suffix is a sibling, never a nested fit deduction. */
export function NumericColumnSlot({ children, elementRef, percentage = false, showSuffix = true, suffixAriaHidden = false, className = '', ...props }: NumericColumnSlotProps) {
  return <span {...props} ref={elementRef} data-numeric-slot="true" className={`relative grid w-full min-w-0 items-center ${percentage ? 'grid-cols-[minmax(0,1fr)_0.6rem] gap-1' : 'grid-cols-1'} ${className}`}>
    {children}
    {percentage && <span data-numeric-suffix={showSuffix ? 'true' : undefined} aria-hidden={suffixAriaHidden || !showSuffix ? true : undefined} className={`pointer-events-none text-center font-mono tabular-nums ${showSuffix ? '' : 'invisible'}`}>%</span>}
  </span>
}
