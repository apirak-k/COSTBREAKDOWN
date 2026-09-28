import React, { useMemo, useState } from 'react'
import { Database, ChevronDown, ChevronRight } from 'lucide-react'
import { SnapshotPair } from '../../../core'
import { buildSourceGroups, SourceGroup } from './source-groups'

interface SourceGroupsCardProps {
  snapshotPair: SnapshotPair
}

const roleLabel = (role: SourceGroup['role']): string => role === 'reference' ? 'Reference' : 'Current'

export const SourceGroupsCard: React.FC<SourceGroupsCardProps> = ({ snapshotPair }) => {
  const groups = useMemo(() => buildSourceGroups(snapshotPair), [snapshotPair])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleGroup = (groupId: string) => {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const expandAll = () => setExpanded(new Set(groups.map(group => group.id)))
  const collapseAll = () => setExpanded(new Set())

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-labelledby="source-groups-title">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <Database className="w-4 h-4 mt-0.5 text-slate-600" aria-hidden="true" />
          <div>
            <h2 id="source-groups-title" className="text-sm font-semibold text-slate-900">Source groups</h2>
            <p className="mt-1 text-sm text-slate-600">Identical source references are grouped once; row locations remain available as detail.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={expandAll} className="min-h-9 rounded-sm border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Expand all</button>
          <button type="button" onClick={collapseAll} className="min-h-9 rounded-sm border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Collapse all</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-600" role="status">No source records are available.</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {groups.map(group => {
            const isExpanded = expanded.has(group.id)
            return (
              <div key={group.id}>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />}
                    <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${group.role === 'reference' ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                      {roleLabel(group.role)}
                    </span>
                    <span className="rounded-sm border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{group.section}</span>
                    <span className={`truncate text-xs font-mono ${group.missingSource ? 'text-amber-800' : 'text-slate-800'}`} title={group.sourceRef}>{group.sourceRef}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-600">{group.recordCount} record{group.recordCount === 1 ? '' : 's'}</span>
                </button>

                {isExpanded && (
                  <div className="px-12 pb-4 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-medium text-slate-600">Row / record locations</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {group.locations.map((location, index) => <li key={`${group.id}-${location}-${index}`}>{location}</li>)}
                    </ul>
                    {group.missingSource && <p className="mt-2 text-amber-700">Source reference is missing for this group and needs review.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
