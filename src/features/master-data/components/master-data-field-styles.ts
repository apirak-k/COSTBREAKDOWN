const masterDataFocusClass = 'focus:!border-transparent focus:!outline focus:!outline-2 focus:!outline-blue-700 focus:!outline-offset-[-2px]'

export const masterDataTextEditorClass = `h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-2 text-xs text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:bg-white ${masterDataFocusClass}`

export const masterDataNumericEditorClass = `h-8 w-full min-w-0 rounded-sm border border-transparent bg-transparent px-1.5 text-right font-mono text-xs tabular-nums text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:bg-white ${masterDataFocusClass}`

export const masterDataIssueEditorClass = '!border-amber-300 !bg-amber-50 hover:!border-amber-300'

export const masterDataIssuePlaceholderClass = 'placeholder:text-slate-500'

export const masterDataSpreadsheetSelectionClass = '!border-transparent hover:!border-transparent outline outline-1 outline-blue-500 outline-offset-[-1px]'

export const masterDataCellFocusClass = masterDataFocusClass

export const masterDataIssueDisplayClass = '!border-amber-300 bg-amber-50'

// Shared semantic columns use identical fixed tracks in every table.
export const masterDataIndexColumnClass = 'w-12'

export const masterDataActionsColumnClass = 'w-20'

export const masterDataIdentityColumnClass = 'w-56'

export const masterDataNoteColumnClass = 'w-64'

export const masterDataUnitColumnClass = 'w-24'

export const masterDataTableClass = 'w-full min-w-[77rem] table-fixed border-collapse text-left text-xs'

export const masterDataPercentageShellClass = 'ml-auto flex h-8 w-28 min-w-0 items-center gap-1'

export const masterDataDisplaySlotClass = `flex h-8 w-full min-w-0 items-center rounded-sm border border-transparent px-2 text-xs text-slate-900 ${masterDataCellFocusClass}`

export const masterDataNumericDisplaySlotClass = `relative flex h-8 w-full min-w-0 items-center justify-end rounded-sm border border-transparent text-right font-mono text-xs tabular-nums text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 ${masterDataCellFocusClass}`
