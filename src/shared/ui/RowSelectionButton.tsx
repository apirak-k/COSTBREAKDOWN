import { forwardRef } from 'react'
import type { RowSelectionState } from '../selection/row-drag-selection'

interface RowSelectionButtonProps {
  state: RowSelectionState
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'dark' | 'light'
}

export const RowSelectionButton = forwardRef<HTMLButtonElement, RowSelectionButtonProps>(function RowSelectionButton({
  state,
  label,
  onClick,
  disabled = false,
  variant = 'dark'
}, ref) {
  const stateClass = variant === 'light'
    ? state === 'all'
      ? 'border border-slate-800 bg-slate-700 text-white'
      : state === 'mixed'
        ? 'border border-slate-400 bg-slate-300 text-slate-900 ring-1 ring-inset ring-slate-400'
        : 'text-slate-700 hover:bg-slate-200'
    : state === 'all'
      ? 'border border-white bg-slate-600 text-white ring-1 ring-inset ring-white'
      : state === 'mixed'
        ? 'border border-slate-500/70 bg-slate-700 text-white ring-1 ring-inset ring-slate-500/70'
        : 'border border-transparent bg-transparent text-white hover:bg-slate-700'

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={state === 'mixed' ? 'mixed' : state === 'all'}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-sm p-0 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${variant === 'light' ? 'focus-visible:outline-blue-700' : 'focus-visible:outline-white'} ${stateClass} disabled:cursor-default disabled:opacity-40`}
    >#</button>
  )
})
