import type { ComparisonRole } from '../../core'

export type MasterDataTableView = 'all' | 'bom' | 'wc' | 'routing'

export interface MasterDataUiState {
  role: ComparisonRole
  mode: 'view' | 'edit'
  tableView: MasterDataTableView
}

export type MasterDataUiAction =
  | { type: 'set-role'; role: ComparisonRole }
  | { type: 'set-mode'; mode: MasterDataUiState['mode'] }
  | { type: 'set-table-view'; tableView: MasterDataTableView }

export const INITIAL_MASTER_DATA_UI_STATE: MasterDataUiState = {
  role: 'current',
  mode: 'view',
  tableView: 'all'
}

export function reduceMasterDataUiState(
  state: MasterDataUiState,
  action: MasterDataUiAction
): MasterDataUiState {
  switch (action.type) {
    case 'set-role':
      return state.role === action.role ? state : { ...state, role: action.role }
    case 'set-mode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode }
    case 'set-table-view':
      return state.tableView === action.tableView ? state : { ...state, tableView: action.tableView }
  }
}
