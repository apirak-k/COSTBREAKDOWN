import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ChevronDown,
  CircleX,
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
  { label: 'Edit', description: 'Change Working values.', Icon: Pencil },
  { label: 'Import', description: 'Load XLSX into this dataset.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Source Working → Destination Working.', Icon: Copy },
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
  { question: 'Do I need to Save before Export?', answer: 'No. Export uses current Working values.' },
  { question: 'Why does Cost Breakdown change after editing Master Data?', answer: 'Cost Breakdown reads the latest Master Data Working values, including unsaved edits.' },
  { question: 'Where does Simulation Send go?', answer: 'It goes to the Master Data dataset that matches the Active Dataset.' },
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
    case 'getting-started':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Start with Master Data</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Prepare data first. Then review a cost change or test an idea. Export the XLSX you want to keep.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)]">
            <section aria-label="What each page does" className="border border-slate-200 bg-white p-3">
              <h4 className="mb-2 text-xs font-semibold text-slate-800">What each page does</h4>
              <dl className="divide-y divide-slate-200">
                <div className="flex items-center gap-2 py-2"><Table2 aria-hidden="true" className="h-4 w-4 text-slate-500" /><dt className="text-xs font-semibold text-slate-800">Master Data</dt><dd className="ml-auto text-right text-xs text-slate-600">Prepare data</dd></div>
                <div className="flex items-center gap-2 py-2"><ArrowLeftRight aria-hidden="true" className="h-4 w-4 text-slate-500" /><dt className="text-xs font-semibold text-slate-800">Cost Breakdown</dt><dd className="ml-auto text-right text-xs text-slate-600">Explain cost changes</dd></div>
                <div className="flex items-center gap-2 py-2"><FlaskConical aria-hidden="true" className="h-4 w-4 text-slate-500" /><dt className="text-xs font-semibold text-slate-800">Simulation</dt><dd className="ml-auto text-right text-xs text-slate-600">Test what-if changes</dd></div>
                <div className="flex items-center gap-2 py-2"><Upload aria-hidden="true" className="h-4 w-4 text-slate-500" /><dt className="text-xs font-semibold text-slate-800">Export</dt><dd className="ml-auto text-right text-xs text-slate-600">Keep an XLSX</dd></div>
              </dl>
            </section>
            <div
              role="img"
              aria-label="Master Data prepares data. Cost Breakdown explains cost changes or Simulation tests a change. Export saves the XLSX you choose."
              className="border border-slate-200 bg-slate-50 p-3"
            >
              <h4 className="mb-2 text-xs font-semibold text-slate-800">Main flow</h4>
              <div className="mx-auto grid max-w-xl gap-2">
                <div className="border border-slate-300 bg-white px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-slate-900">Master Data</p>
                  <p className="text-xs text-slate-600">Prepare data</p>
                </div>
                <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 text-slate-400" />
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div className="border border-slate-300 bg-white px-2 py-2 text-center">
                    <p className="text-xs font-semibold text-slate-900">Cost Breakdown</p>
                    <p className="text-xs text-slate-600">Why did cost change?</p>
                  </div>
                  <span className="text-xs text-slate-500">or</span>
                  <div className="border border-slate-300 bg-white px-2 py-2 text-center">
                    <p className="text-xs font-semibold text-slate-900">Simulation</p>
                    <p className="text-xs text-slate-600">What if we change it?</p>
                  </div>
                </div>
                <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 text-slate-400" />
                <div className="border border-slate-300 bg-white px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-slate-900">Export</p>
                  <p className="text-xs text-slate-600">Keep the XLSX</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    case 'guided-workflow':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">From XLSX to a decision</h3>
          <ol aria-label="Seven steps to prepare, compare, test, and export data" className="mt-3 grid gap-2 sm:grid-cols-2">
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">1</span><FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Import original XLSX into Reference.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">2</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Clone Reference → Current to start from the same baseline.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">3</span><Pencil aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Edit Current, then check it with Prepare Dataset.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">4</span><ArrowLeftRight aria-hidden="true" data-help-icon="compare" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Review Reference → Current in Cost Breakdown.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">5</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Clone Current → Custom to test without changing Current.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700"><span className="w-4 shrink-0 font-mono text-slate-400">6</span><Send aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Send supported changes to matching Master Data if needed.</span></li>
            <li className="flex min-w-0 items-start gap-2 border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700 sm:col-span-2"><span className="w-4 shrink-0 font-mono text-slate-400">7</span><Upload aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Export the dataset you want to keep.</span></li>
          </ol>
          <p className="mt-3 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"><strong className="font-semibold text-slate-800">Need to add or remove data?</strong> Use Master Data. Simulation adjusts supported parameters of existing data.</p>
        </>
      )
    case 'master-data':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Prepare and check your datasets</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <StateCard title="Reference">Baseline</StateCard>
            <StateCard title="Current">Latest Working data</StateCard>
            <StateCard title="Custom">Separate alternative</StateCard>
          </div>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Tools and data flow</h4>
          <HelpToolGrid tools={masterDataTools} label="Master Data tools" />
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Values and status</h4>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <StateCard title="Working">Values in use.</StateCard>
            <StateCard title="Last Saved">Session checkpoint.</StateCard>
            <StateCard title="Saved" icon={<span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-inset ring-emerald-700/70" />}>Working matches Last Saved.</StateCard>
            <StateCard title="Draft" icon={<span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-400 ring-2 ring-inset ring-slate-600/70" />}>Working differs or has no checkpoint.</StateCard>
            <StateCard title="Warning" icon={<AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-amber-700" />}>Review recommended. You can continue.</StateCard>
            <StateCard title="Blocker" icon={<CircleX aria-hidden="true" className="h-3.5 w-3.5 text-rose-700" />}>Resolve it for dataset readiness.</StateCard>
          </div>
        </>
      )
    case 'cost-breakdown':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Why did the cost change?</h3>
          <div aria-label="After minus Before equals Standard Cost Gap" className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2">
            <StateCard title="After">Choose a dataset.</StateCard>
            <span aria-hidden="true" className="text-lg font-medium text-slate-500">−</span>
            <StateCard title="Before">Choose a dataset.</StateCard>
            <span aria-hidden="true" className="text-lg font-medium text-slate-500">=</span>
            <StateCard title="Standard Cost Gap">After − Before</StateCard>
          </div>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Row status</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <StateCard title="CHANGED">Values differ. Expand for Parameter Cost Effects.</StateCard>
            <StateCard title="ADDED">In After only.</StateCard>
            <StateCard title="REMOVED">In Before only.</StateCard>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Full Gap">All cost changes.</StateCard>
            <StateCard title="Selected contribution">Only the selected rows.</StateCard>
          </div>
          <p className="mt-3 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">Cost Breakdown reads the latest Master Data Working values, including unsaved edits.</p>
        </>
      )
    case 'simulation':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">What if we changed this?</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Active Dataset">Edit, Send, and Reset target.</StateCard>
            <StateCard title="Result Before / After">Choose the two datasets to compare.</StateCard>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border border-blue-200 bg-blue-50 px-3 py-2">
            <Send aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-700" />
            <span className="text-xs font-semibold text-slate-800">Active Dataset</span>
            <span aria-hidden="true" className="text-slate-500">→</span>
            <span className="text-xs text-slate-700">Matching Master Data Working</span>
            <strong className="ml-auto text-xs text-slate-800">Send target</strong>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-800">Send follows the Active Dataset, not Result After. Changing Result Before or After does not change the Send target.</p>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Supported changes</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <StateCard title="BOM">Price · Usage · Loss</StateCard>
            <StateCard title="Routing">Manning · Capacity · Yield</StateCard>
            <StateCard title="Simulation only">Selling Price · SG&amp;A · Variable / Fixed Action Cost · Batch Size</StateCard>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Send"><span className="inline-flex items-center gap-1"><Send aria-hidden="true" className="h-3.5 w-3.5" /> Supported BOM and Routing parameters go to matching Master Data Working.</span></StateCard>
            <StateCard title="Reset"><span className="inline-flex items-center gap-1"><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Restores this dataset’s Master Data values and clears Action Cost and Batch Size.</span></StateCard>
          </div>
          <p className="mt-3 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">Simulation adjusts supported parameters only. Add or remove BOM items, Work Centers, or Routing operations in Master Data. Simulation-only economics are not sent.</p>
        </>
      )
    case 'important-concepts':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Keep these pairs clear</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Save ≠ Export">Save = session checkpoint. Export = XLSX saved to the location you choose.</StateCard>
            <StateCard title="Working ≠ Last Saved">Working = values in use. Last Saved = latest session checkpoint.</StateCard>
            <StateCard title="Warning ≠ Blocker">Warning = review; you can continue. Blocker = resolve for readiness.</StateCard>
            <StateCard title="Active Dataset ≠ Result After">Active Dataset = edit / Send / Reset target. Result After = comparison choice.</StateCard>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StateCard title="Cost Breakdown">Reads current Master Data Working values.</StateCard>
            <StateCard title="Browser session">Closing the browser ends it. Export data you want to keep.</StateCard>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">Changing Result Before or After changes the comparison, not the Send target.</p>
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
            <HeaderTool Icon={Info} label="Prepare Dataset" description="Check warnings and blockers." />
            <HeaderTool symbol="?" label="Help" description="Open this quick guide." />
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
  const title = helpSections.find(section => section.id === activeSection)?.label ?? 'Getting Started'

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
