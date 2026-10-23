import type { CSSProperties } from 'react'

// Both summaries use the same grid sizing; native table layout must not redistribute row heights.
export const CBD_SUMMARY_PANEL_CLASS = 'min-w-0 overflow-x-auto border border-slate-300 bg-white lg:min-h-44 lg:overflow-y-hidden'
export const CBD_SUMMARY_TABLE_CLASS = 'grid min-w-[652px] grid-rows-[28px_114px_32px] text-left text-xs leading-4'
export const CBD_SUMMARY_ROW_CLASS = 'grid grid-cols-[var(--cbd-summary-columns)] items-center'
export const CBD_SUMMARY_HEADER_GROUP_CLASS = 'overflow-hidden border-b border-slate-700 bg-slate-800'
export const CBD_SUMMARY_HEADER_ROW_CLASS = 'h-full bg-slate-800 font-semibold text-white'
export const CBD_SUMMARY_HEADER_CELL_CLASS = 'min-w-0 px-2 py-1.5 font-sans text-[11px] leading-4 tracking-normal'
export const CBD_SUMMARY_HEADER_LABEL_CLASS = 'text-left'
export const CBD_SUMMARY_HEADER_VALUE_CLASS = 'text-right'
export const CBD_SUMMARY_HEADER_CELL_STYLE: CSSProperties = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: '16px',
  letterSpacing: '0',
  textTransform: 'none'
}

export const CBD_SUMMARY_BODY_GROUP_CLASS = 'min-h-0 divide-y divide-slate-100 font-mono tabular-nums text-xs leading-4'
export const CBD_SUMMARY_BODY_ROW_CLASS = 'h-[38px] font-mono tabular-nums text-xs leading-4'
export const CBD_SUMMARY_BODY_LABEL_CLASS = 'min-w-0 px-2 py-1.5 text-left font-sans text-xs leading-4 font-medium text-slate-800'
export const CBD_SUMMARY_BODY_VALUE_CLASS = 'min-w-0 px-2 py-1.5 text-right text-xs leading-4'
export const CBD_WC_BODY_SCROLL_REGION = 'min-h-0 overflow-x-hidden overflow-y-auto'

export const CBD_SUMMARY_FOOTER_GROUP_CLASS = 'overflow-hidden border-t-2 border-slate-300 bg-slate-100'
export const CBD_SUMMARY_FOOTER_ROW_CLASS = 'h-full bg-slate-100 font-semibold font-mono tabular-nums text-xs leading-4'
export const CBD_SUMMARY_FOOTER_LABEL_CLASS = 'min-w-0 px-2 py-1.5 align-middle text-left font-sans font-semibold'
export const CBD_SUMMARY_FOOTER_VALUE_CLASS = 'min-w-0 px-2 py-1.5 align-middle text-right'

// Reserve the footer annotation beside, never inside, the unchanged numeric region.
export const CBD_SUMMARY_PERCENTAGE_CLASS = 'relative pl-9'
