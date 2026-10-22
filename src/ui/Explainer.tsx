import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { cn } from './cn'

interface ExplainerProps {
  /** Key to remember whether the person dismissed the explanation (per browser). */
  id: string
  title?: string
  intro: ReactNode
  steps: Array<{ title: string; text: ReactNode }>
  footer?: ReactNode
  /** Open on the first visit, collapsed on later ones (unless the person reopens it). */
  collapseOnRevisit?: boolean
  /** Collapsed until the person opens it (pages whose first visit already has a guided tour). */
  startCollapsed?: boolean
}

const storageKey = (id: string) => `alinha-explainer-${id}`

function readCollapsed(id: string, collapseOnRevisit: boolean, startCollapsed: boolean): boolean {
  try {
    const stored = localStorage.getItem(storageKey(id))
    if (startCollapsed) return stored !== 'open'
    return stored === 'closed' || (collapseOnRevisit && stored === 'seen')
  } catch {
    return startCollapsed
  }
}

/** "How this screen works": short step-by-step explanation that can be collapsed. */
export function Explainer({ id, title = 'Como funciona este ecrã', intro, steps, footer, collapseOnRevisit = false, startCollapsed = false }: ExplainerProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(id, collapseOnRevisit, startCollapsed))
  useEffect(() => {
    if (!collapseOnRevisit) return
    try {
      if (localStorage.getItem(storageKey(id)) === null) localStorage.setItem(storageKey(id), 'seen')
    } catch {
      // no persistence: stays open each visit
    }
  }, [id, collapseOnRevisit])
  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(storageKey(id), next ? 'closed' : 'open')
    } catch {
      // no persistence: lasts only for this session
    }
  }
  return (
    <section aria-label={title} className="rounded-[16px] border border-line-soft bg-paper-soft">
      <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Lightbulb className="size-4" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">{title}</span>
          {collapsed && <span className="block truncate text-[13px] text-ink-soft">{typeof intro === 'string' ? intro : 'Mostrar explicação'}</span>}
        </span>
        <ChevronDown className={cn('size-4 text-ink-soft transition-transform', !collapsed && 'rotate-180')} aria-hidden />
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-4 px-5 pb-5">
          <p className="max-w-[760px] text-[14px] text-ink-soft">{intro}</p>
          <ol className="grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-[12px] bg-paper p-3.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-extrabold text-white">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold">{s.title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-soft">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {footer && <div className="text-[13px] text-ink-soft">{footer}</div>}
        </div>
      )}
    </section>
  )
}
