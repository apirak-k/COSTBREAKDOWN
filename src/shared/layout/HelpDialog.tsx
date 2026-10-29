import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
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
  onClose: () => void
}

interface HelpTool {
  label: string
  description: string
  Icon: LucideIcon
}

const masterDataTools: HelpTool[] = [
  { label: 'Edit', description: 'Change the selected dataset’s Working values.', Icon: Pencil },
  { label: 'Import', description: 'Load a compatible XLSX into the selected dataset.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy another dataset into the selected dataset’s Working values.', Icon: Copy },
  { label: 'Sizing', description: 'Set table row counts or download an Excel template.', Icon: Table2 },
  { label: 'Prepare Dataset', description: 'Review warnings and blockers, then navigate to an issue.', Icon: Info },
  { label: 'Save', description: 'Checkpoint the selected dataset’s Working values for this session.', Icon: Save },
  { label: 'Reset', description: 'Restore the selected dataset from its saved or initial reset state.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values while keeping the table structure and Last Saved.', Icon: Trash2 },
  { label: 'Export', description: 'Create an XLSX from the selected dataset’s current Working values.', Icon: Upload }
]

const quickTools: HelpTool[] = [
  { label: 'Import', description: 'Load a compatible XLSX.', Icon: FileSpreadsheet },
  { label: 'Clone', description: 'Copy one dataset into another.', Icon: Copy },
  { label: 'Edit', description: 'Change Working values.', Icon: Pencil },
  { label: 'Save', description: 'Create a session checkpoint.', Icon: Save },
  { label: 'Reset', description: 'Restore saved or initial values.', Icon: RotateCcw },
  { label: 'Clear', description: 'Blank editable values.', Icon: Trash2 },
  { label: 'Send', description: 'Send supported Simulation parameters to the matching Master Data dataset.', Icon: Send },
  { label: 'Export', description: 'Create an XLSX to keep or share.', Icon: Upload }
]

const faqItems = [
  {
    question: 'Where should I start?',
    answer: 'Start in Master Data. Prepare Reference, Current, and Custom as needed.'
  },
  {
    question: 'Do I need to Save before Export?',
    answer: 'No. Export uses current Working values, including unsaved edits.'
  },
  {
    question: 'Why does Cost Breakdown change after editing Master Data?',
    answer: 'Cost Breakdown reads the latest Master Data Working values.'
  },
  {
    question: 'Where does Simulation Send go?',
    answer: 'It sends supported parameters to the Master Data dataset matching the Active Dataset.'
  },
  {
    question: 'Why did my Simulation scenario rebuild or reset?',
    answer: 'When that role’s Master Data Working basis changes, its scenario rebuilds from the new basis.'
  },
  {
    question: 'What happens when I close the browser?',
    answer: 'The current session ends. Export the datasets you want to keep before closing it.'
  },
  {
    question: 'Where is my exported XLSX?',
    answer: 'Check your browser’s Downloads list or its configured download folder.'
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
          <p className="mt-1 text-xs leading-5 text-slate-600">Prepare data first, then compare costs or test a proposal.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="border border-slate-200 bg-slate-50 p-3"><h4 className="text-xs font-semibold text-slate-900">Master Data</h4><p className="mt-1 text-xs leading-5 text-slate-600">Prepare and check datasets.</p></div>
            <div className="border border-slate-200 bg-slate-50 p-3"><h4 className="text-xs font-semibold text-slate-900">Cost Breakdown</h4><p className="mt-1 text-xs leading-5 text-slate-600">Understand why cost changed.</p></div>
            <div className="border border-slate-200 bg-slate-50 p-3"><h4 className="text-xs font-semibold text-slate-900">Simulation</h4><p className="mt-1 text-xs leading-5 text-slate-600">Test what-if changes.</p></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">Export</strong> creates an XLSX you can keep.</p>
        </>
      )
    case 'guided-workflow':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">From your workbook to a decision</h3>
          <ol className="mt-3 space-y-2">
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">1</span><FileSpreadsheet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Import original XLSX into <strong>Reference</strong>.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">2</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Clone <strong>Reference</strong> to <strong>Current</strong>.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">3</span><Pencil aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Edit Current, then check it with <strong>Prepare Dataset</strong>.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">4</span><span aria-hidden="true" className="w-4 shrink-0" /><span>Compare <strong>Reference → Current</strong> in Cost Breakdown.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">5</span><Copy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Clone Current to Custom and test changes in Simulation.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">6</span><Send aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Send the supported proposal back to its matching Master Data dataset if needed.</span></li>
            <li className="flex gap-3 text-xs leading-5 text-slate-700"><span className="w-5 shrink-0 font-mono text-slate-400">7</span><Upload aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Export the dataset you want to keep.</span></li>
          </ol>
        </>
      )
    case 'master-data':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Prepare and check your datasets</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600"><strong className="font-semibold text-slate-800">Reference</strong>, <strong className="font-semibold text-slate-800">Current</strong>, and <strong className="font-semibold text-slate-800">Custom</strong> are separate datasets. A typical setup uses Reference as the baseline, Current as the latest data, and Custom for an alternative.</p>
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Tools</h4>
          <HelpToolList tools={masterDataTools} label="Master Data tools" />
          <h4 className="mb-2 mt-4 text-xs font-semibold text-slate-800">Values and status</h4>
          <ul className="space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Working</strong> is the current dataset used by the analyses.</li>
            <li><strong className="font-semibold text-slate-800">Last Saved</strong> is a checkpoint in this browser session.</li>
            <li><strong className="font-semibold text-slate-800">Saved</strong> means Working matches Last Saved. <strong className="font-semibold text-slate-800">Draft</strong> means it differs or has no checkpoint.</li>
            <li><strong className="font-semibold text-slate-800">Warning</strong> needs review. A <strong className="font-semibold text-slate-800">Blocker</strong> can keep the Reference/Current pair from being ready.</li>
          </ul>
        </>
      )
    case 'cost-breakdown':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Why did the cost change?</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Before / After</strong> choose the two datasets to compare.</li>
            <li><strong className="font-semibold text-slate-800">Standard Cost Gap = After − Before.</strong></li>
            <li><strong className="font-semibold text-slate-800">CHANGED</strong> means the item differs; expand it to see Parameter Cost Effects.</li>
            <li><strong className="font-semibold text-slate-800">ADDED</strong> appears only in After. <strong className="font-semibold text-slate-800">REMOVED</strong> appears only in Before.</li>
            <li><strong className="font-semibold text-slate-800">Selected contribution</strong> focuses on chosen findings while the full Gap stays visible.</li>
            <li>Cost Breakdown reads the latest Master Data <strong className="font-semibold text-slate-800">Working</strong> values.</li>
          </ul>
        </>
      )
    case 'simulation':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">What if we changed this?</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
            <li><strong className="font-semibold text-slate-800">Active Dataset</strong> is the scenario you edit, Send, or Reset.</li>
            <li><strong className="font-semibold text-slate-800">Result Before / After</strong> choose what the result compares.</li>
            <li><strong className="font-semibold text-slate-800">BOM:</strong> Price, Usage, and Loss.</li>
            <li><strong className="font-semibold text-slate-800">Routing:</strong> Manning, Capacity, and Yield.</li>
            <li><strong className="font-semibold text-slate-800">Business / Economic:</strong> Selling Price, SG&amp;A, Action Cost, and Batch Size.</li>
          </ul>
          <p className="mt-4 border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-800">Send follows the Active Dataset, not Result After.</p>
          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600"><Send aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p>Send copies supported BOM and Routing parameters to the matching Master Data Working dataset. Selling Price, SG&amp;A overrides, Action Costs, and Batch Size are not sent.</p></div>
          <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><RotateCcw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p>Reset returns parameters and Selling Price / SG&amp;A to Master Data, then clears Action Costs and Batch Size.</p></div>
        </>
      )
    case 'important-concepts':
      return (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Keep these differences in mind</h3>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
            <li><strong>Save ≠ Export.</strong> Save creates a session checkpoint; Export creates an XLSX file.</li>
            <li><strong>Working ≠ Last Saved.</strong> Working values can include unsaved changes.</li>
            <li>Cost Breakdown reads current Master Data Working values.</li>
            <li>Simulation Send follows the Active Dataset.</li>
            <li>Closing the browser ends the current session.</li>
            <li>Export anything you want to keep.</li>
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
            <HeaderTool Icon={Undo2} label="Undo" description="Undo a supported edit in the current workspace." />
            <HeaderTool Icon={Redo2} label="Redo" description="Redo the last undone edit." />
            <HeaderTool Icon={Info} label="i · Prepare Dataset" description="Review dataset readiness, warnings, and blockers." />
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

export const HelpDialog: React.FC<HelpDialogProps> = ({ initialSection, onClose }) => {
  const [activeSection, setActiveSection] = useState(initialSection)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const title = helpSections.find(section => section.id === activeSection)?.label ?? 'Getting Started'

  useTransientInteraction(true, () => onClose())

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [activeSection])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const dialog = event.currentTarget
    const focusable = [...dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )].filter(element => element.getClientRects().length > 0 && !element.closest('[hidden]'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) {
      event.preventDefault()
      return
    }
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault()
      first.focus()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/55 p-3 sm:p-4" data-safe-workspace-interaction="true">
      <div
        id="app-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-help-title"
        onKeyDown={handleKeyDown}
        className="flex h-[min(46rem,calc(100dvh-1.5rem))] w-[min(64rem,calc(100vw-1.5rem))] min-h-0 flex-col border border-slate-300 bg-white text-slate-900 shadow-xl"
      >
        <header className="flex min-h-12 shrink-0 items-center gap-3 border-b border-slate-200 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <h2 id="app-help-title" className="text-sm font-semibold">Help &amp; User Guide</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Quick help for the current workspace</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="grid h-8 w-8 shrink-0 place-items-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-1">
          <nav aria-label="Help sections" className="flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {helpSections.map(section => {
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-controls="app-help-section"
                  onClick={() => setActiveSection(section.id)}
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
    document.body
  )
}
