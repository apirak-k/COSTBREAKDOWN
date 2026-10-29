import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ChevronDown,
  CircleX,
  Copy,
  FileSpreadsheet,
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
  | 'important-concepts'
  | 'quick-reference'
  | 'faq'

const helpSections: Array<{ id: HelpSectionId; label: string }> = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'master-data', label: 'Master Data' },
  { id: 'cost-breakdown', label: 'Cost Breakdown' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'important-concepts', label: 'Important Concepts' },
  { id: 'quick-reference', label: 'Quick Reference' },
  { id: 'faq', label: 'FAQ' }
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

const faqItems = [
  { question: 'Where should I start?', answer: 'Start in Master Data. Prepare and check your data.' },
  { question: 'Do I need to Save before Export?', answer: 'No. Export uses current Working values and saves an XLSX where you choose.' },
  { question: 'Why does Cost Breakdown change after editing Master Data?', answer: 'It reads Master Data Working values, including unsaved edits.' },
  { question: 'Where does Simulation Send go?', answer: 'It sends supported BOM and Routing changes to the Master Data role that matches the Active Dataset.' },
  { question: 'Why did my Simulation scenario rebuild or reset?', answer: 'If that dataset’s Master Data values change, its scenario rebuilds from them.' },
  { question: 'What happens when I close the browser?', answer: 'The current session ends. Export data you want to keep.' },
  { question: 'Where is my exported XLSX?', answer: 'Export saves the XLSX to the location you choose.' }
]

function HelpToolGrid({ tools, label, columns = 'sm:grid-cols-2 xl:grid-cols-3' }: {
  tools: HelpTool[]
  label: string
  columns?: string
}) {
  return (
    <div role="group" aria-label={label} className={'grid gap-2 ' + columns}>
      {tools.map(({ label: toolLabel, description, Icon }) => (
        <div key={toolLabel} className="min-w-0 border border-slate-200 bg-white px-3 py-2">
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
    <div data-help-header-tool={label} className="flex min-w-0 items-start gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
      {Icon
        ? <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
        : <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center text-xs font-bold text-slate-600">{symbol}</span>}
      <p className="min-w-0 text-xs leading-4 text-slate-600"><strong className="font-semibold text-slate-800">{label}</strong><br />{description}</p>
    </div>
  )
}

function StateCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 border border-slate-200 bg-slate-50 px-3 py-2">
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
    <div role="group" aria-label={label} className="grid min-w-0 gap-1 border border-slate-200 bg-slate-50 p-2">
      <StateCard title={first.title} icon={first.icon}>{first.description}</StateCard>
      <span aria-hidden="true" className="text-center text-xs leading-3 text-slate-400">↕</span>
      <StateCard title={second.title} icon={second.icon}>{second.description}</StateCard>
    </div>
  )
}

function HelpContent({
  section,
  selectedFaq,
  previewFaq,
  onFaqPointerEnter,
  onFaqPointerLeave,
  onFaqToggle
}: {
  section: HelpSectionId
  selectedFaq: string | null
  previewFaq: string | null
  onFaqPointerEnter: (question: string) => void
  onFaqPointerLeave: () => void
  onFaqToggle: (question: string) => void
}) {
  switch (section) {
    case 'workflow':
      return (
        <>
          <section data-help-workflow-diagram aria-label="How the app areas connect" className="border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-3 text-xs font-semibold text-slate-800">How the areas connect</h3>
            <div role="img" aria-label="Master Data prepares datasets for Cost Breakdown, Simulation, or Export. Simulation can send supported changes back to the matching Master Data role." className="mx-auto max-w-3xl">
              <div className="mx-auto max-w-sm border border-slate-300 bg-white px-3 py-2 text-center">
                <p className="text-xs font-semibold text-slate-900">Master Data</p>
                <p className="text-xs text-slate-600">Prepare and manage datasets</p>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                <span aria-hidden="true" className="text-xs leading-4 text-slate-400">↓</span>
                <span aria-hidden="true" className="text-xs leading-4 text-slate-400">↓</span>
                <span aria-hidden="true" className="text-xs leading-4 text-slate-400">↓</span>
                <div className="min-w-0 border border-slate-300 bg-white px-2 py-2">
                  <p className="text-xs font-semibold text-slate-900">Cost Breakdown</p>
                  <p className="mt-1 text-xs text-slate-600">Compare cost changes</p>
                </div>
                <div className="min-w-0 border border-slate-300 bg-white px-2 py-2">
                  <p className="text-xs font-semibold text-slate-900">Simulation</p>
                  <p className="mt-1 text-xs text-slate-600">Test supported changes</p>
                  <p className="mt-2 border-t border-slate-200 pt-2 text-xs font-medium text-slate-700">Send → matching Master Data</p>
                </div>
                <div className="min-w-0 border border-slate-300 bg-white px-2 py-2">
                  <p className="text-xs font-semibold text-slate-900">Export</p>
                  <p className="mt-1 text-xs text-slate-600">Save a chosen XLSX</p>
                </div>
              </div>
            </div>
          </section>
          <section aria-label="Six-step workflow" className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">A simple workflow</h3>
            <ol aria-label="Six steps to prepare, compare, test, send, and export" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                'Prepare datasets in Master Data.',
                'Check data with Prepare Dataset.',
                'Compare datasets in Cost Breakdown.',
                'Test supported changes in Simulation.',
                'Send to matching Master Data if needed.',
                'Export the dataset you want to keep.'
              ].map((step, index) => (
                <li key={step} className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700">
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center bg-slate-100 font-mono text-[11px] font-semibold text-slate-600">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )
    case 'master-data':
      return (
        <>
          <section aria-label="Independent dataset roles" className="border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-xs font-semibold text-slate-800">Manage any dataset</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <StateCard title="Reference">Baseline</StateCard>
              <StateCard title="Current">Latest</StateCard>
              <StateCard title="Custom">Alternative</StateCard>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700">Roles are independent, not stages.</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Import · Edit · Clone · Clear · Reset can apply to any role.</p>
            <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">Clone:</strong> Source Working → Destination Working.</p>
          </section>
          <h3 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Tools</h3>
          <HelpToolGrid tools={masterDataTools} label="Master Data tools" />
          <h3 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Values and status</h3>
          <div className="grid gap-2 sm:grid-cols-3">
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
              first={{ title: 'Warning', description: 'Review recommended. You can continue.', icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-amber-700" /> }}
              second={{ title: 'Blocker', description: 'Fix for readiness.', icon: <CircleX aria-hidden="true" className="h-3.5 w-3.5 text-rose-700" /> }}
            />
          </div>
        </>
      )
    case 'cost-breakdown':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Why did the cost change?</h3>
          <div aria-label="After minus Before equals Standard Cost Gap" className="mt-3 grid items-center gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)] sm:gap-2">
            <StateCard title="After">Choose a dataset.</StateCard>
            <span aria-hidden="true" className="text-lg font-medium text-slate-500">−</span>
            <StateCard title="Before">Choose a dataset.</StateCard>
            <span aria-hidden="true" className="text-lg font-medium text-slate-500">=</span>
            <StateCard title="Standard Cost Gap">After − Before</StateCard>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section data-help-cost-group="row-status" aria-label="Row status" className="border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Row status</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                <StateCard title="CHANGED">Values differ. Expand for Parameter Cost Effects.</StateCard>
                <StateCard title="ADDED">In After only.</StateCard>
                <StateCard title="REMOVED">In Before only.</StateCard>
              </div>
            </section>
            <section data-help-cost-group="gap" aria-label="Gap" className="border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Gap</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <StateCard title="Full Gap">All compared cost changes.</StateCard>
                <StateCard title="Selected contribution">Contribution from selected rows.</StateCard>
              </div>
            </section>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">Uses Master Data Working, including unsaved edits.</p>
        </>
      )
    case 'simulation':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">What if we changed this?</h3>
          <div className="mt-3 grid gap-3">
            <section data-help-simulation-block="edit-scenario" aria-label="Edit scenario" className="border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Edit scenario</h4>
              <StateCard title="Active Dataset">Edit / Send / Reset target.</StateCard>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <StateCard title="BOM">Price · Usage · Loss</StateCard>
                <StateCard title="Routing">Manning · Capacity · Yield</StateCard>
                <StateCard title="Economics">Selling Price · SG&amp;A · Variable / Fixed Action Cost · Batch Size</StateCard>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">Simulation edits supported parameters of existing rows. Add or remove rows in Master Data.</p>
            </section>
            <section data-help-simulation-block="result-comparison" aria-label="Result comparison" className="border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Result comparison</h4>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-slate-200 bg-white px-3 py-2 text-xs">
                <strong className="font-semibold text-slate-800">Result Before</strong>
                <span aria-hidden="true" className="text-slate-400">→</span>
                <strong className="font-semibold text-slate-800">Result After</strong>
                <span className="ml-auto text-slate-500">Comparison only</span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-800">Active Dataset ≠ Result Before / After</p>
              <p className="text-xs leading-5 text-slate-600">Changing Before / After does not change Active Dataset or Send target.</p>
            </section>
            <section data-help-simulation-block="actions" aria-label="Actions" className="border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Actions</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <StateCard title="Send"><span className="inline-flex items-start gap-1.5"><Send aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Active Dataset → matching Master Data Working. BOM/Routing parameters only; Simulation economics are not sent.</span></span></StateCard>
                <StateCard title="Reset"><span className="inline-flex items-start gap-1.5"><RotateCcw aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Restores parameters, Selling Price, and SG&amp;A from this role’s Master Data Working. Clears Variable/Fixed Action Cost and Batch Size.</span></span></StateCard>
              </div>
            </section>
          </div>
        </>
      )
    case 'important-concepts':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Keep these pairs clear</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Save ≠ Export">Save makes a session checkpoint. Export creates an XLSX you choose to keep.</StateCard>
            <StateCard title="Working ≠ Last Saved">Working = values in use. Last Saved = session checkpoint.</StateCard>
            <StateCard title="Warning ≠ Blocker">Warning = review; you can continue. Blocker = resolve for readiness.</StateCard>
            <StateCard title="Active Dataset ≠ Result Before / After">Active Dataset = edit / Send / Reset target. Results = comparison only.</StateCard>
          </div>
          <p className="mt-3 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">Closing the browser ends the current session. Export data you want to keep.</p>
        </>
      )
    case 'quick-reference':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Tools at a glance</h3>
          <HelpToolGrid tools={quickTools} label="Quick reference tools" columns="sm:grid-cols-2 xl:grid-cols-4" />
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Header</h4>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderTool Icon={Undo2} label="Undo" description="Undo the last supported action." />
            <HeaderTool Icon={Redo2} label="Redo" description="Redo the last undone action." />
            <HeaderTool symbol="?" label="Help" description="Open this quick guide." />
            <HeaderTool Icon={Info} label="Prepare Dataset" description="Check warnings and blockers." />
          </div>
        </>
      )
    case 'faq':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Frequently asked questions</h3>
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            {faqItems.map(({ question, answer }, index) => {
              const expanded = (previewFaq ?? selectedFaq) === question
              const answerId = 'app-help-faq-answer-' + (index + 1)
              return (
                <div
                  key={question}
                  data-faq-item={question}
                  data-previewing={previewFaq === question}
                  onPointerEnter={() => onFaqPointerEnter(question)}
                  onPointerLeave={onFaqPointerLeave}
                  className="py-1"
                >
                  <button
                    type="button"
                    aria-controls={answerId}
                    aria-expanded={expanded}
                    onClick={() => onFaqToggle(question)}
                    className="flex w-full items-center justify-between gap-3 py-2 text-left text-xs font-semibold leading-5 text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    <span>{question}</span>
                    <ChevronDown aria-hidden="true" className={'h-4 w-4 shrink-0 text-slate-500 transition-transform ' + (expanded ? 'rotate-180' : '')} />
                  </button>
                  <p id={answerId} hidden={!expanded} className="pb-2 pl-3 text-xs leading-5 text-slate-600">{answer}</p>
                </div>
              )
            })}
          </div>
        </>
      )
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
  const [selectedFaq, setSelectedFaq] = useState<string | null>(null)
  const [previewFaq, setPreviewFaq] = useState<string | null>(null)
  const sectionHoverTimerRef = useRef<number | null>(null)
  const sectionExitTimerRef = useRef<number | null>(null)
  const faqHoverTimerRef = useRef<number | null>(null)
  const faqExitTimerRef = useRef<number | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeSection = previewSection ?? selectedSection
  const title = helpSections.find(section => section.id === activeSection)?.label ?? 'Workflow'

  useTransientInteraction(true, () => onClose())

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [activeSection])

  useEffect(() => () => {
    for (const timer of [sectionHoverTimerRef.current, sectionExitTimerRef.current, faqHoverTimerRef.current, faqExitTimerRef.current]) {
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
    }, 300)
  }

  const selectSection = (sectionId: HelpSectionId) => {
    clearSectionHoverTimer()
    clearSectionExitTimer()
    setPreviewSection(null)
    setSelectedSection(sectionId)
  }

  const clearFaqHoverTimer = () => {
    if (faqHoverTimerRef.current !== null) window.clearTimeout(faqHoverTimerRef.current)
    faqHoverTimerRef.current = null
  }

  const clearFaqExitTimer = () => {
    if (faqExitTimerRef.current !== null) window.clearTimeout(faqExitTimerRef.current)
    faqExitTimerRef.current = null
  }

  const previewFaqAfterHover = (question: string) => {
    clearFaqHoverTimer()
    clearFaqExitTimer()
    if (selectedFaq === question) {
      setPreviewFaq(null)
      return
    }
    faqHoverTimerRef.current = window.setTimeout(() => {
      setPreviewFaq(question)
      faqHoverTimerRef.current = null
    }, 275)
  }

  const scheduleFaqPreviewExit = () => {
    clearFaqHoverTimer()
    clearFaqExitTimer()
    faqExitTimerRef.current = window.setTimeout(() => {
      setPreviewFaq(null)
      faqExitTimerRef.current = null
    }, 300)
  }

  const toggleFaq = (question: string) => {
    clearFaqHoverTimer()
    clearFaqExitTimer()
    setPreviewFaq(null)
    setSelectedFaq(current => current === question ? null : question)
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
          id="app-help-interaction-region"
          onPointerEnter={clearSectionExitTimer}
          onPointerLeave={scheduleSectionPreviewExit}
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
                  onPointerLeave={clearSectionHoverTimer}
                  onClick={() => selectSection(section.id)}
                  className={'min-h-8 shrink-0 border-l-2 px-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 md:w-full ' + stateClass}
                >
                  {section.label}
                </button>
              )
            })}
          </nav>

          <div id="app-help-scroll" ref={scrollAreaRef} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <section id="app-help-section" aria-labelledby="app-help-section-title" className="mx-auto max-w-5xl">
              <h2 id="app-help-section-title" className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
              <HelpContent
                section={activeSection}
                selectedFaq={selectedFaq}
                previewFaq={previewFaq}
                onFaqPointerEnter={previewFaqAfterHover}
                onFaqPointerLeave={scheduleFaqPreviewExit}
                onFaqToggle={toggleFaq}
              />
            </section>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  )
}
