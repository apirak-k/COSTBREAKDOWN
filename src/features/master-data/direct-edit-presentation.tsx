import { createContext, useContext } from 'react'

export const MasterDataDirectEditsContext = createContext<Record<string, { before: string; after: string }>>({})

export function useMasterDataDirectEdit() {
  const edits = useContext(MasterDataDirectEditsContext)
  return (section: string, recordId: string, field: string) => Boolean(edits[JSON.stringify([section, recordId, field])])
}

export function useMasterDataSelectionPending(selectionId: string) {
  const pending = useMasterDataDirectEdit()
  const [, , , section, recordId, field] = selectionId.split(':').map(decodeURIComponent)
  return pending(section === 'work-centers' ? 'rates' : section === 'metadata' || section === 'sizing-metadata' ? 'product' : section, recordId, field)
}
