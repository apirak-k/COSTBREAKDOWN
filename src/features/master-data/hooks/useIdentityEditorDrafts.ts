import { useCallback, useEffect, useState } from 'react'
import { preferIdentityEditorDraft } from '../table-validation'

interface IdentityRow {
  id: string
}

export function useIdentityEditorDrafts<T extends IdentityRow>(
  rows: readonly T[],
  scope: string,
  getStoredValue: (row: T) => string
) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    const storedValues = new Map(rows.map(row => [row.id, getStoredValue(row)]))
    setDrafts(current => {
      let next: Record<string, string> | null = null
      Object.entries(current).forEach(([id, value]) => {
        if (!storedValues.has(id) || storedValues.get(id) === value) {
          next ??= { ...current }
          delete next[id]
        }
      })
      return next ?? current
    })
  }, [getStoredValue, rows])

  useEffect(() => {
    setDrafts({})
  }, [scope])

  const getValue = useCallback((row: T) => preferIdentityEditorDraft(
    Object.prototype.hasOwnProperty.call(drafts, row.id) ? drafts[row.id] : undefined,
    getStoredValue(row)
  ), [drafts, getStoredValue])

  const setValue = useCallback((id: string, value: string) => {
    setDrafts(current => ({ ...current, [id]: value }))
  }, [])

  const clearValue = useCallback((id: string) => {
    setDrafts(current => {
      if (!Object.prototype.hasOwnProperty.call(current, id)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const clearValues = useCallback((ids?: readonly string[]) => {
    if (!ids) {
      setDrafts(current => Object.keys(current).length === 0 ? current : {})
      return
    }
    setDrafts(current => {
      let next: Record<string, string> | null = null
      ids.forEach(id => {
        if (Object.prototype.hasOwnProperty.call(current, id)) {
          next ??= { ...current }
          delete next[id]
        }
      })
      return next ?? current
    })
  }, [])

  return { getValue, setValue, clearValue, clearValues }
}
