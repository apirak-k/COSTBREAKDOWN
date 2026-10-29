import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  CircleX,
  ClipboardCheck,
  Copy,
  Database,
  FileSpreadsheet,
  FlaskConical,
  GitCompare,
  Info,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Table2,
  Trash2,
  Undo2,
  Upload,
  X,
  type LucideIcon
} from 'lucide-react'
import { useTransientInteraction } from '../ui/transient-interactions'

export type HelpSectionId =
  | 'workflow'
  | 'master-data'
  | 'cost-breakdown'
  | 'simulation'
  | 'quick-reference'

const helpSections: Array<{ id: HelpSectionId; label: string }> = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'master-data', label: 'Master Data' },
  { id: 'cost-breakdown', label: 'Cost Breakdown' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'quick-reference', label: 'Quick Reference' }
]

interface HelpDialogProps {
  initialSection: HelpSectionId
  isPinned: boolean
  onClose: () => void
  onPointerEnter: () => void
  onPointerLeave: () => void
}

interface HelpTool {
  label: string
  description: string
  Icon: LucideIcon
}

const masterDataTools: HelpTool[] = [
  { label: 'Edit', description: 'Change Working values.', Icon: Pencil },
  { label: 'Import', description: 'Load XLSX into this dataset.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy Working values to another role.', Icon: Copy },
  { label: 'Sizing', description: 'Set row counts or download a template.', Icon: Table2 },
  { label: 'Prepare Dataset', description: 'Review warnings and blockers.', Icon: Info },
  { label: 'Save', description: 'Working → Last Saved.', Icon: Save },
  { label: 'Reset', description: 'Restore saved or starting values.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values. Keep rows and Last Saved.', Icon: Trash2 },
  { label: 'Export', description: 'Working → XLSX.', Icon: Upload }
]

const quickTools: HelpTool[] = [
  { label: 'Import', description: 'Load an XLSX.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy a dataset.', Icon: Copy },
  { label: 'Edit', description: 'Change Working values.', Icon: Pencil },
  { label: 'Save', description: 'Make a session checkpoint.', Icon: Save },
  { label: 'Reset', description: 'Restore saved or starting values.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values.', Icon: Trash2 },
  { label: 'Send', description: 'Simulation → matching Master Data.', Icon: Send },
  { label: 'Export', description: 'Create an XLSX.', Icon: Upload }
]

function HelpToolGrid({ tools, label, columns = 'sm:grid-cols-2 xl:grid-cols-3' }: {
  tools: HelpTool[]
  label: string
  columns?: string
}) {
  return (
    <div role="group" aria-label={label} className={'grid items-stretch gap-2 ' + columns}>
      {tools.map(({ label: toolLabel, description, Icon }) => (
        <div key={toolLabel} className="h-full min-w-0 border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />
            <span>{toolLabel}</span>
          </div>
          <p className="mt-1 text-xs leading-4 text-slate-600">{description}</p>
        </div>
      ))}
    </div>
  )
}

function HeaderTool({ Icon, symbol, label, description }: {
  Icon?: LucideIcon
  symbol?: string
  label: string
  description: string
}) {
  return (
    <div data-help-header-tool={label} className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2">
      {Icon
        ? <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
        : <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center text-xs font-bold text-slate-600">{symbol}</span>}
      <p className="min-w-0 text-xs leading-4 text-slate-600"><strong className="font-semibold text-slate-800">{label}</strong><br />{description}</p>
    </div>
  )
}

function StateCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="h-full min-w-0 border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-1 text-xs leading-4 text-slate-600">{children}</p>
    </div>
  )
}

function StatePair({
  label,
  first,
  second
}: {
  label: string
  first: { title: string; description: string; icon?: React.ReactNode }
  second: { title: string; description: string; icon?: React.ReactNode }
}) {
  return (
    <div role="group" aria-label={label} className="grid min-w-0 content-start gap-1.5">
      <StateCard title={first.title} icon={first.icon}>{first.description}</StateCard>
      <ArrowUpDown aria-hidden="true" className="mx-auto h-3.5 w-3.5 text-slate-400" />
      <StateCard title={second.title} icon={second.icon}>{second.description}</StateCard>
    </div>
  )
}

function BranchConnector() {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 44" preserveAspectRatio="none" className="h-11 w-full text-slate-400">
      <defs>
        <marker id="help-branch-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </marker>
      </defs>
      <path d="M300 0V14 M100 14H500" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M100 14V40" fill="none" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#help-branch-arrow)" />
      <path d="M300 14V40" fill="none" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#help-branch-arrow)" />
      <path d="M500 14V40" fill="none" stroke="currentColor" strokeWidth="1.25" markerEnd="url(#help-branch-arrow)" />
    </svg>
  )
}

function HelpContent({ section }: { section: HelpSectionId }) {
  switch (section) {
    case 'workflow':
      return (
        <>
          <section data-help-workflow-diagram aria-label="How the app areas connect">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">How the app areas connect</h3>
            <div role="group" aria-label="Master Data connects to Cost Breakdown, Simulation, and Export" className="mx-auto max-w-3xl">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-start-2 text-center" data-help-diagram-node="Master Data">
                  <StateCard title="Master Data">Prepare datasets.</StateCard>
                </div>
              </div>
              <BranchConnector />
              <div className="grid grid-cols-3 items-stretch gap-2 text-center">
                <div className="min-w-0" data-help-diagram-node="Cost Breakdown">
                  <StateCard title="Cost Breakdown">Compare changes.</StateCard>
                </div>
                <div className="min-w-0" data-help-diagram-node="Simulation">
                  <StateCard title="Simulation">Test changes.</StateCard>
                </div>
                <div className="min-w-0" data-help-diagram-node="Export">
                  <StateCard title="Export">Save XLSX.</StateCard>
                </div>
              </div>
              <div data-help-send-flow className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Simulation</span>
                <span className="flex flex-col items-center leading-4">
                  <span>Send</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-8" />
                </span>
                <span className="font-medium text-slate-800">matching Master Data role</span>
              </div>
            </div>
          </section>
          <section aria-label="Six-step workflow" className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Workflow steps</h3>
            <ol aria-label="Six workflow steps" className="relative grid max-w-3xl gap-1 before:absolute before:bottom-3 before:left-[0.7rem] before:top-3 before:w-px before:bg-slate-300">
              {[
                { label: 'Prepare datasets', Icon: Database },
                { label: 'Check with Prepare Dataset', Icon: ClipboardCheck },
                { label: 'Compare in Cost Breakdown', Icon: GitCompare },
                { label: 'Test supported changes', Icon: FlaskConical },
                { label: 'Send to matching Master Data', Icon: Send },
                { label: 'Export dataset', Icon: Upload }
              ].map(({ label, Icon }, index) => (
                <li key={label} data-help-workflow-step={index + 1} className="relative flex min-w-0 items-center gap-2 py-1 text-xs leading-5 text-slate-700">
                  <span aria-hidden="true" className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-300 bg-white font-mono text-[11px] font-semibold text-slate-700">{index + 1}</span>
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )
    case 'master-data':
      return (
        <>
          <section data-help-master-roles aria-label="Independent dataset roles">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Dataset roles</h3>
            <div className="grid items-stretch gap-2 sm:grid-cols-3">
              <StateCard title="Reference">Baseline</StateCard>
              <StateCard title="Current">Latest</StateCard>
              <StateCard title="Custom">Alternative</StateCard>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700">Roles are independent, not stages.</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Import · Edit · Clone · Clear · Reset can apply to any role.</p>
            <p className="mt-1 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">Clone between roles:</strong> Source Working → Destination Working.</p>
          </section>
          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-800">Tools</h3>
          <HelpToolGrid tools={masterDataTools} label="Master Data tools" />
          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-800">Values and status</h3>
          <div className="grid items-start gap-3 sm:grid-cols-3">
            <StatePair
              label="Saved and Draft"
              first={{ title: 'Saved', description: 'Working matches Last Saved.', icon: <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-inset ring-emerald-700/70" /> }}
              second={{ title: 'Draft', description: 'Working differs or has no checkpoint.', icon: <span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-400 ring-2 ring-inset ring-slate-600/70" /> }}
            />
            <StatePair
              label="Working and Last Saved"
              first={{ title: 'Working', description: 'Values in use.' }}
              second={{ title: 'Last Saved', description: 'Session checkpoint.' }}
            />
            <StatePair
              label="Warning and Blocker"
              first={{ title: 'Warning', description: 'Review; you can continue.', icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-amber-700" /> }}
              second={{ title: 'Blocker', description: 'Fix for readiness.', icon: <CircleX aria-hidden="true" className="h-3.5 w-3.5 text-rose-700" /> }}
            />
          </div>
        </>
      )
    case 'cost-breakdown':
      return (
        <>
          <div data-help-cost-formula aria-label="After minus Before equals Standard Cost Gap" className="grid items-center gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)] sm:gap-2">
            <StateCard title="After">Dataset.</StateCard>
            <span aria-hidden="true" className="text-center text-lg font-medium text-slate-500">−</span>
            <StateCard title="Before">Dataset.</StateCard>
            <span aria-hidden="true" className="text-center text-lg font-medium text-slate-500">=</span>
            <StateCard title="Standard Cost Gap">After − Before.</StateCard>
          </div>
          <section data-help-cost-group="row-status" aria-label="Row status" className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Row status</h3>
            <div className="grid items-stretch gap-2 sm:grid-cols-3">
              <StateCard title="CHANGED">Values differ. Expand for Parameter Cost Effects.</StateCard>
              <StateCard title="ADDED">In After only.</StateCard>
              <StateCard title="REMOVED">In Before only.</StateCard>
            </div>
          </section>
          <section data-help-cost-group="gap" aria-label="Gap" className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Gap</h3>
            <div className="grid items-stretch gap-2 sm:grid-cols-2">
              <StateCard title="Full Gap">All compared changes.</StateCard>
              <StateCard title="Selected contribution">Selected rows only.</StateCard>
            </div>
          </section>
          <p className="mt-3 text-xs leading-5 text-slate-600">Uses Master Data Working, including unsaved edits.</p>
        </>
      )
    case 'simulation':
      return (
        <div className="grid gap-5">
          <section data-help-simulation-block="edit-scenario" aria-label="Edit scenario">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Edit scenario</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-start-2 text-center">
                <StateCard title="Active Dataset">Edit · Send · Reset target.</StateCard>
              </div>
            </div>
            <BranchConnector />
            <div className="grid grid-cols-3 items-stretch gap-2">
              <StateCard title="BOM">Price · Usage · Loss</StateCard>
              <StateCard title="Routing">Manning · Capacity · Yield</StateCard>
              <StateCard title="Economics">Selling Price · SG&amp;A · Action Cost · Batch Size</StateCard>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Simulation edits existing rows. Add/remove rows in Master Data.</p>
          </section>
          <section data-help-simulation-block="result-comparison" aria-label="Result comparison">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Result comparison</h3>
            <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)]">
              <StateCard title="Active Dataset">Edit / Send / Reset.</StateCard>
              <span aria-hidden="true" className="text-center text-lg font-semibold text-slate-500">≠</span>
              <StateCard title="Result Before → Result After">Comparison only.</StateCard>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Changing comparison does not change Active Dataset or Send target.</p>
          </section>
          <section data-help-simulation-block="actions" aria-label="Actions">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Actions</h3>
            <div className="grid items-stretch gap-2 sm:grid-cols-2">
              <StateCard title="Send" icon={<Send aria-hidden="true" className="h-3.5 w-3.5 text-slate-600" />}>
                <span className="block">Active Dataset → matching Master Data Working.</span>
                <span className="mt-1 block">BOM / Routing only · Economics stay in Simulation.</span>
              </StateCard>
              <StateCard title="Reset" icon={<RotateCcw aria-hidden="true" className="h-3.5 w-3.5 text-slate-600" />}>
                <span className="block">Reload this role's Master Data Working.</span>
                <span className="mt-1 block">Clear Action Cost and Batch Size.</span>
              </StateCard>
            </div>
          </section>
        </div>
      )
    case 'quick-reference':
      return (
        <>
          <h3 className="mb-2 text-xs font-semibold text-slate-800">Key differences</h3>
          <div className="grid items-stretch gap-2 sm:grid-cols-2">
            <StateCard title="Save ≠ Export">
              <span className="block">Save — Session checkpoint.</span>
              <span className="mt-1 block">Export — XLSX saved where you choose.</span>
            </StateCard>
            <StateCard title="Working ≠ Last Saved">
              <span className="block">Working — Values in use.</span>
              <span className="mt-1 block">Last Saved — Session checkpoint.</span>
            </StateCard>
            <StateCard title="Warning ≠ Blocker">
              <span className="block">Warning — Review; you can continue.</span>
              <span className="mt-1 block">Blocker — Fix for readiness.</span>
            </StateCard>
            <StateCard title="Active Dataset ≠ Result Before / After">
              <span className="block">Active Dataset — Edit / Send / Reset.</span>
              <span className="mt-1 block">Results — Comparison only.</span>
            </StateCard>
          </div>
          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-800">Tools at a glance</h3>
          <HelpToolGrid tools={quickTools} label="Quick reference tools" columns="sm:grid-cols-2 xl:grid-cols-4" />
          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-800">Header controls</h3>
          <div className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderTool Icon={Undo2} label="Undo" description="Undo a supported action." />
            <HeaderTool Icon={Redo2} label="Redo" description="Redo the last undone action." />
            <HeaderTool symbol="?" label="Help" description="Open this guide." />
            <HeaderTool Icon={Info} label="Prepare Dataset" description="Check warnings and blockers." />
          </div>
          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-800">Good to know</h3>
          <div className="space-y-1 text-xs leading-5 text-slate-600">
            <p>Closing the browser ends the session. Export to keep data.</p>
            <p>A Master Data source change can rebuild its Simulation scenario.</p>
          </div>
        </>
      )
    default:
      return null
  }
}

export const HelpDialog: React.FC<HelpDialogProps> = ({
  initialSection,
  isPinned,
  onClose,
  onPointerEnter,
  onPointerLeave
}) => {
  const [selectedSection, setSelectedSection] = useState(initialSection)
  const [previewSection, setPreviewSection] = useState<HelpSectionId | null>(null)
  const sectionHoverTimerRef = useRef<number | null>(null)
  const sectionExitTimerRef = useRef<number | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeSection = previewSection ?? selectedSection
  const title = helpSections.find(section => section.id === activeSection)?.label ?? 'Workflow'

  useTransientInteraction(true, () => onClose())

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [activeSection])

  useEffect(() => () => {
    for (const timer of [sectionHoverTimerRef.current, sectionExitTimerRef.current]) {
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [])

  const clearSectionHoverTimer = () => {
    if (sectionHoverTimerRef.current !== null) window.clearTimeout(sectionHoverTimerRef.current)
    sectionHoverTimerRef.current = null
  }

  const clearSectionExitTimer = () => {
    if (sectionExitTimerRef.current !== null) window.clearTimeout(sectionExitTimerRef.current)
    sectionExitTimerRef.current = null
  }

  const previewSectionAfterHover = (sectionId: HelpSectionId) => {
    clearSectionHoverTimer()
    clearSectionExitTimer()
    sectionHoverTimerRef.current = window.setTimeout(() => {
      setPreviewSection(sectionId)
      sectionHoverTimerRef.current = null
    }, 275)
  }

  const scheduleSectionPreviewExit = () => {
    clearSectionHoverTimer()
    clearSectionExitTimer()
    sectionExitTimerRef.current = window.setTimeout(() => {
      setPreviewSection(null)
      sectionExitTimerRef.current = null
    }, 400)
  }

  const selectSection = (sectionId: HelpSectionId) => {
    clearSectionHoverTimer()
    clearSectionExitTimer()
    setPreviewSection(null)
    setSelectedSection(sectionId)
  }

  if (typeof document === 'undefined') return null
  const portalTarget = document.getElementById('header-help-portal-root')
  if (!portalTarget) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-3 sm:p-4">
      <div
        id="app-help-dialog"
        data-pinned={isPinned}
        role="dialog"
        aria-labelledby="app-help-title"
        onPointerEnter={onPointerEnter}
        onPointerLeave={event => {
          const target = event.relatedTarget
          const trigger = document.getElementById('header-help-trigger-root')
          if (target instanceof Node && (event.currentTarget.contains(target) || trigger?.contains(target))) return
          onPointerLeave()
        }}
        className="pointer-events-auto flex h-[min(48rem,calc(100dvh-2rem))] w-[min(72rem,calc(100vw-2rem))] min-h-0 flex-col border border-slate-300 bg-white text-slate-900 shadow-xl"
      >
        <header className="flex min-h-12 shrink-0 items-center gap-3 border-b border-slate-200 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <h2 id="app-help-title" className="text-sm font-semibold">Help</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="grid h-8 w-8 shrink-0 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div
          className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[12rem_minmax(0,1fr)] md:grid-rows-1"
        >
          <nav aria-label="Help sections" className="flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {helpSections.map(section => {
              const selected = selectedSection === section.id
              const previewing = previewSection === section.id && !selected
              const stateClass = selected
                ? 'border-slate-900 bg-slate-100 font-semibold text-slate-900'
                : previewing
                  ? 'border-blue-500 bg-blue-50 font-semibold text-slate-900'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  aria-controls="app-help-section"
                  data-previewing={previewing}
                  onPointerEnter={() => previewSectionAfterHover(section.id)}
                  onPointerLeave={scheduleSectionPreviewExit}
                  onClick={() => selectSection(section.id)}
                  className={'min-h-8 shrink-0 border-l-2 px-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 md:w-full ' + stateClass}
                >
                  {section.label}
                </button>
              )
            })}
          </nav>

          <div
            id="app-help-scroll"
            ref={scrollAreaRef}
            onPointerEnter={clearSectionExitTimer}
            onPointerLeave={scheduleSectionPreviewExit}
            className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
          >
            <section id="app-help-section" aria-labelledby="app-help-section-title" className="mx-auto max-w-5xl">
              <h2 id="app-help-section-title" className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
              <HelpContent section={activeSection} />
            </section>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  )
}
