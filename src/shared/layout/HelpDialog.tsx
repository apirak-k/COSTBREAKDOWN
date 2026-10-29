import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowLeftRight,
  Copy,
  FileSpreadsheet,
  FlaskConical,
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
  | 'getting-started'
  | 'guided-workflow'
  | 'master-data'
  | 'cost-breakdown'
  | 'simulation'
  | 'important-concepts'
  | 'quick-reference'
  | 'faq'

const helpSections: Array<{ id: HelpSectionId; label: string }> = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'guided-workflow', label: 'Guided Workflow' },
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
  { label: 'Edit', description: 'Change this dataset’s Working values.', Icon: Pencil },
  { label: 'Import', description: 'Load an XLSX into this dataset.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy another dataset here.', Icon: Copy },
  { label: 'Sizing', description: 'Set row counts or download a template.', Icon: Table2 },
  { label: 'Prepare Dataset', description: 'Check warnings and blockers, then jump to an issue.', Icon: Info },
  { label: 'Save', description: 'Save a checkpoint for this session.', Icon: Save },
  { label: 'Reset', description: 'Restore saved values, or the starting values.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values. Keep rows and Last Saved.', Icon: Trash2 },
  { label: 'Export', description: 'Save current values as an XLSX.', Icon: Upload }
]

const quickTools: HelpTool[] = [
  { label: 'Import', description: 'Load an XLSX.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy a dataset.', Icon: Copy },
  { label: 'Edit', description: 'Change values.', Icon: Pencil },
  { label: 'Save', description: 'Save a session checkpoint.', Icon: Save },
  { label: 'Reset', description: 'Restore saved or starting values.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values.', Icon: Trash2 },
  { label: 'Send', description: 'Send supported changes to Master Data.', Icon: Send },
  { label: 'Export', description: 'Save an XLSX where you choose.', Icon: Upload }
]

const faqItems = [
  {
    question: 'Where should I start?',
    answer: 'Start in Master Data. Prepare and check your data.'
  },
  {
    question: 'Do I need to Save before Export?',
    answer: 'No. Export uses current Working values.'
  },
  {
    question: 'Why does Cost Breakdown change after editing Master Data?',
    answer: 'Cost Breakdown reads the latest Master Data Working values.'
  },
  {
    question: 'Where does Simulation Send go?',
    answer: 'It goes to the Master Data dataset that matches the Active Dataset.'
  },
  {
    question: 'Why did my Simulation scenario rebuild or reset?',
    answer: 'If that role’s Master Data values change, its scenario rebuilds from them.'
  },
  {
    question: 'What happens when I close the browser?',
    answer: 'The current session ends. Export data you want to keep.'
  },
  {
    question: 'Where is my exported XLSX?',
    answer: 'Export saves the XLSX to the location you choose.'
  }
]

function HelpToolList({ tools, label }: { tools: HelpTool[]; label: string }) {
  return (
    <dl aria-label={label} className="divide-y divide-slate-200 border-y border-slate-200">
      {tools.map(({ label: toolLabel, description, Icon }) => (
        <div key={toolLabel} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-x-3 py-2">
          <dt className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-800">
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{toolLabel}</span>
          </dt>
          <dd className="min-w-0 text-xs leading-5 text-slate-600">{description}</dd>
        </div>
      ))}
    </dl>
  )
}

function HeaderTool({ Icon, label, description }: { Icon?: LucideIcon; label: string; description: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 border border-slate-200 bg-slate-50 px-2 py-2">
      {Icon ? <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" /> : <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center text-xs font-bold text-slate-600">?</span>}
      <p className="min-w-0 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">{label}</strong> · {description}</p>
    </div>
  )
}

function HelpContent({ section }: { section: HelpSectionId }) {
  switch (section) {
    case 'getting-started':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Start with Master Data</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Prepare data, review a cost change or test an idea, then export what you want to keep.</p>
          <div
            role="img"
            aria-label="Master Data prepares data. Cost Breakdown explains cost changes, or Simulation tests a change. Export saves the XLSX you choose."
            className="mt-4 grid justify-items-stretch gap-2"
          >
            <div className="border border-slate-300 bg-slate-50 px-3 py-2">
              <h4 className="text-xs font-semibold text-slate-900">Master Data</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">Prepare data</p>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 shrink-0 text-slate-400" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="border border-slate-300 bg-slate-50 px-3 py-2">
                <h4 className="text-xs font-semibold text-slate-900">Cost Breakdown</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">Why did cost change?</p>
              </div>
              <span className="text-xs text-slate-500">or</span>
              <div className="border border-slate-300 bg-slate-50 px-3 py-2">
                <h4 className="text-xs font-semibold text-slate-900">Simulation</h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">What if we change it?</p>
              </div>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 shrink-0 text-slate-400" />
            <div className="border border-slate-300 bg-slate-50 px-3 py-2">
              <h4 className="text-xs font-semibold text-slate-900">Export</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">Keep an XLSX</p>
            </div>
          </div>
        </>
      )
    case 'guided-workflow':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">From XLSX to a decision</h3>
          <ol className="mt-3 space-y-2.5">
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">1</span><FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Import original XLSX into Reference.</strong><br />Use it as your baseline.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">2</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Clone Reference to Current.</strong><br />Start from the same data.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">3</span><Pencil aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Edit Current, then use Prepare Dataset.</strong><br />Check warnings and blockers.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">4</span><ArrowLeftRight aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Review Reference → Current in Cost Breakdown.</strong><br />See what changed and why.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">5</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Clone Current to Custom.</strong><br />Make a copy for testing.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">6</span><FlaskConical aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" /><span><strong>Test changes in Simulation.</strong><br />Adjust supported parameters.</span></li>
            <li className="grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)] gap-x-2 text-xs leading-5 text-slate-700"><span className="font-mono text-slate-400">7</span><span className="mt-0.5 flex gap-1 text-slate-500"><Send aria-hidden="true" className="h-4 w-4" /><Upload aria-hidden="true" className="h-4 w-4" /></span><span><strong>Send if needed, then Export.</strong><br />Send to Master Data before exporting if you want to keep the changes.</span></li>
          </ol>
          <p className="mt-4 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"><strong>Need to add or remove data?</strong> Use Master Data. Simulation changes supported values only.</p>
        </>
      )
    case 'master-data':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Prepare and check your datasets</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">Reference</strong> is the baseline. <strong className="font-semibold text-slate-800">Current</strong> is the latest data. <strong className="font-semibold text-slate-800">Custom</strong> is a separate alternative.</p>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Tools</h4>
          <HelpToolList tools={masterDataTools} label="Master Data tools" />
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Values and status</h4>
          <ul className="space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Working</strong> is the current set of values.</li>
            <li><strong className="font-semibold text-slate-800">Last Saved</strong> is a checkpoint for this session.</li>
            <li><strong className="font-semibold text-slate-800">Saved</strong> means Working matches Last Saved. <strong className="font-semibold text-slate-800">Draft</strong> means it differs or has no checkpoint.</li>
            <li><strong className="font-semibold text-slate-800">Warning</strong> means check an issue. A <strong className="font-semibold text-slate-800">Blocker</strong> can stop Reference and Current from being ready.</li>
          </ul>
        </>
      )
    case 'cost-breakdown':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Why did the cost change?</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Before / After</strong> choose the datasets to compare.</li>
            <li><strong className="font-semibold text-slate-800">Standard Cost Gap = After − Before.</strong></li>
            <li><strong className="font-semibold text-slate-800">CHANGED</strong> means values differ. Expand it to see Parameter Cost Effects.</li>
            <li><strong className="font-semibold text-slate-800">ADDED</strong> means After only. <strong className="font-semibold text-slate-800">REMOVED</strong> means Before only.</li>
            <li><strong className="font-semibold text-slate-800">Selected contribution</strong> shows selected costs beside the full Gap.</li>
            <li>Cost Breakdown reads the latest Master Data <strong className="font-semibold text-slate-800">Working</strong> values.</li>
          </ul>
        </>
      )
    case 'simulation':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">What if we changed this?</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Active Dataset</strong> is the dataset you edit, Send, or Reset.</li>
            <li><strong className="font-semibold text-slate-800">Result Before / After</strong> choose the two datasets in the result.</li>
            <li><strong className="font-semibold text-slate-800">BOM:</strong> Price, Usage, and Loss.</li>
            <li><strong className="font-semibold text-slate-800">Routing:</strong> Manning, Capacity, and Yield.</li>
            <li><strong className="font-semibold text-slate-800">Business &amp; Economic:</strong> Selling Price, SG&amp;A, Action Cost, and Batch Size.</li>
          </ul>
          <p className="mt-4 border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-800">Send follows the Active Dataset, not Result After.</p>
          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><Send aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p>Send copies supported BOM and Routing parameters to the matching Master Data Working values. Selling Price, SG&amp;A, Action Cost, and Batch Size are not sent.</p></div>
          <p className="mt-3 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">Simulation adjusts supported parameters only. Add or remove BOM items, Work Centers, or Routing operations in Master Data.</p>
          <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><RotateCcw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p>Reset restores this dataset’s Master Data values and clears Action Cost and Batch Size.</p></div>
        </>
      )
    case 'important-concepts':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Remember these</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
            <li><strong>Save ≠ Export.</strong> Save makes a checkpoint. Export saves an XLSX.</li>
            <li><strong>Working ≠ Last Saved.</strong> Working can have unsaved changes.</li>
            <li>Cost Breakdown reads current Master Data Working values.</li>
            <li>Simulation Send follows the Active Dataset.</li>
            <li>Closing the browser ends this session.</li>
            <li>Export data you want to keep.</li>
          </ul>
        </>
      )
    case 'quick-reference':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Tools at a glance</h3>
          <HelpToolList tools={quickTools} label="Quick reference tools" />
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Header</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <HeaderTool Icon={Undo2} label="Undo" description="Undo the last supported action." />
            <HeaderTool Icon={Redo2} label="Redo" description="Redo the last undone action." />
            <HeaderTool Icon={Info} label="i · Prepare Dataset" description="Check warnings and blockers." />
            <HeaderTool label="? · Help" description="Open this quick guide." />
          </div>
        </>
      )
    case 'faq':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Frequently asked questions</h3>
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            {faqItems.map(({ question, answer }) => (
              <details key={question} className="group py-1">
                <summary className="cursor-pointer py-2 text-xs font-semibold leading-5 text-slate-800 marker:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{question}</summary>
                <p className="pb-2 pl-4 text-xs leading-5 text-slate-600">{answer}</p>
              </details>
            ))}
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
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const sectionHoverTimerRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeSection = previewSection ?? selectedSection
  const title = helpSections.find(section => section.id === activeSection)?.label ?? 'Getting Started'

  useTransientInteraction(true, () => onClose())

  const updatePosition = useCallback(() => {
    const trigger = document.getElementById('header-help-trigger')
    const panel = panelRef.current
    if (!trigger || !panel) return

    const triggerRect = trigger.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = window.innerHeight
    const panelWidth = panel.offsetWidth
    const panelHeight = panel.offsetHeight
    const left = Math.max(8, Math.min(triggerRect.right - panelWidth, viewportWidth - panelWidth - 8))
    const preferredTop = triggerRect.bottom + 8
    const top = preferredTop + panelHeight <= viewportHeight - 8
      ? preferredTop
      : Math.max(8, viewportHeight - panelHeight - 8)

    setPosition({ left, top })
  }, [])

  useLayoutEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [activeSection])

  useEffect(() => () => {
    if (sectionHoverTimerRef.current !== null) window.clearTimeout(sectionHoverTimerRef.current)
  }, [])

  const clearSectionHoverTimer = () => {
    if (sectionHoverTimerRef.current !== null) window.clearTimeout(sectionHoverTimerRef.current)
    sectionHoverTimerRef.current = null
  }

  const previewSectionAfterHover = (sectionId: HelpSectionId) => {
    clearSectionHoverTimer()
    sectionHoverTimerRef.current = window.setTimeout(() => setPreviewSection(sectionId), 180)
  }

  const selectSection = (sectionId: HelpSectionId) => {
    clearSectionHoverTimer()
    setPreviewSection(null)
    setSelectedSection(sectionId)
  }

  const returnToSelectedSection = () => {
    clearSectionHoverTimer()
    setPreviewSection(null)
  }

  if (typeof document === 'undefined') return null
  const portalTarget = document.getElementById('header-help-portal-root')
  if (!portalTarget) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        ref={panelRef}
        id="app-help-dialog"
        data-pinned={isPinned}
        role="dialog"
        aria-labelledby="app-help-title"
        style={position ? { left: position.left, top: position.top } : { left: -10000, top: 0, visibility: 'hidden' }}
        onPointerEnter={onPointerEnter}
        onPointerLeave={event => {
          const target = event.relatedTarget
          const trigger = document.getElementById('header-help-trigger-root')
          if (target instanceof Node && (event.currentTarget.contains(target) || trigger?.contains(target))) return
          onPointerLeave()
        }}
        className="pointer-events-auto fixed z-[60] flex h-[min(38rem,calc(100dvh-4rem))] w-[min(48rem,calc(100vw-1rem))] min-h-0 flex-col border border-slate-300 bg-white text-slate-900 shadow-xl"
      >
        <header className="flex min-h-12 shrink-0 items-center gap-3 border-b border-slate-200 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <h2 id="app-help-title" className="text-sm font-semibold">Help</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Quick help for this page</p>
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

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-1">
          <nav aria-label="Help sections" onPointerLeave={returnToSelectedSection} className="flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {helpSections.map(section => {
              const active = selectedSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-controls="app-help-section"
                  data-previewing={previewSection === section.id}
                  onPointerEnter={() => previewSectionAfterHover(section.id)}
                  onPointerLeave={clearSectionHoverTimer}
                  onClick={() => selectSection(section.id)}
                  className={`min-h-8 shrink-0 border-l-2 px-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 md:w-full ${active ? 'border-slate-900 bg-slate-100 font-semibold text-slate-900' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {section.label}
                </button>
              )
            })}
          </nav>

          <div id="app-help-scroll" ref={scrollAreaRef} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            <section id="app-help-section" aria-labelledby="app-help-section-title" className="mx-auto max-w-3xl">
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
