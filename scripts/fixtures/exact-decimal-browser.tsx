import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider, useAppStore } from '../../src/state'
import { AppLayout } from '../../src/shared/layout/AppLayout'
import { MasterDataPage } from '../../src/features/master-data/MasterDataPage'
import '../../src/index.css'

const TEST_ITEM_CODE = 'EXACT-DECIMAL-VERIFIER'

function StoreControls() {
  const {
    activeProductId,
    createProductWithSizing,
    switchProduct,
    productSessions,
    masterDataUiState,
    masterDataRole,
    masterDataSnapshot,
    masterDataSnapshots,
    setMasterDataRole,
    updateMasterDataUiState,
    addMasterDataBOMItem,
    clearMasterDataDataset,
    undoMasterDataEdit,
    redoMasterDataEdit
  } = useAppStore()
  const originalProductId = useRef(activeProductId)
  const seeded = useRef(false)
  const rowId = useRef<string | null>(null)

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    setMasterDataRole('current')
    updateMasterDataUiState({ type: 'set-mode', mode: 'edit' })
    if (!masterDataSnapshots.current.bom.some(row => row.itemCode === TEST_ITEM_CODE)) {
      addMasterDataBOMItem({
        itemCode: TEST_ITEM_CODE,
        description: 'Exact decimal lifecycle',
        consumption: null,
        unit: 'PC',
        price: null,
        loss: null,
        sourceRef: 'Browser verifier'
      })
    }
  }, [addMasterDataBOMItem, masterDataSnapshots, setMasterDataRole, updateMasterDataUiState])

  const rowByCode = masterDataSnapshot.bom.find(row => row.itemCode === TEST_ITEM_CODE)
  if (rowByCode) rowId.current = rowByCode.id
  const row = masterDataSnapshot.bom.find(candidate => candidate.id === rowId.current)
  const state = {
    role: masterDataRole,
    mode: masterDataUiState.mode,
    productId: activeProductId,
    originalProductId: originalProductId.current,
    rowId: rowId.current,
    itemCode: row?.itemCode ?? null,
    exact: row?.exactDecimalInputs?.price ?? null,
    calculation: row?.price ?? null,
    rowCount: masterDataSnapshot.bom.length,
    productCount: productSessions.length
  }

  return (
    <div data-exact-decimal-test-controls="true" className="fixed right-1 top-1 z-[100] flex gap-1 bg-white p-1 text-[10px] shadow">
      <button type="button" data-testid="exact-role-current" onClick={() => setMasterDataRole('current')}>Current</button>
      <button type="button" data-testid="exact-role-reference" onClick={() => setMasterDataRole('reference')}>Reference</button>
      <button type="button" data-testid="exact-product-away" onClick={() => createProductWithSizing({
        productCode: 'EXACT-ROUNDTRIP-OTHER',
        productDescription: 'Exact decimal roundtrip context',
        uom: 'PC',
        customer: '',
        effectiveDate: '2026-10-24',
        wcCount: 1,
        bomCount: 1,
        routingCount: 1
      })}>Other product</button>
      <button type="button" data-testid="exact-product-return" onClick={() => switchProduct(originalProductId.current)}>Return product</button>
      <button type="button" data-testid="exact-clear-current" onClick={() => clearMasterDataDataset('current')}>Clear dataset</button>
      <button type="button" data-testid="exact-undo" onClick={undoMasterDataEdit}>Undo</button>
      <button type="button" data-testid="exact-redo" onClick={redoMasterDataEdit}>Redo</button>
      <output data-testid="exact-decimal-state">{JSON.stringify(state)}</output>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <StoreControls />
      <AppLayout><MasterDataPage /></AppLayout>
    </AppProvider>
  </React.StrictMode>
)
