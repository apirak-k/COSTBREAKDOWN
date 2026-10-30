import type { HTMLAttributes } from 'react'

/** The caller supplies the same fixed region used by the numeric body cell. */
export function NumericColumnHeader({ children, className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} data-numeric-column-header="true" className={`block w-full min-w-0 text-center ${className}`}>{children}</span>
}
