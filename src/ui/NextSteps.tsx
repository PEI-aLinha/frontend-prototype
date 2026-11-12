import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { cn } from './cn'

export interface NextStep {
  label: string
  hint?: string
  done: boolean
  to?: string
  cta?: string
}

/** From this many finished steps on, they fold into one line so the open steps lead. */
const FOLD_DONE_FROM = 2

interface NextStepsProps {
  title?: string
  /** One line of context under the title (e.g. when and by whom the last step happened). */
  description?: ReactNode
  steps: NextStep[]
}

/** "What to do next" checklist: tells each person their next step. */
export function NextSteps({ title = 'O que fazer a seguir', description, steps }: NextStepsProps) {
  const next = steps.findIndex((s) => !s.done)
  const done = steps.filter((s) => s.done).length
  const foldable = done >= FOLD_DONE_FROM && done < steps.length
  const [showDone, setShowDone] = useState(false)
  const hidden = foldable && !showDone
  const listId = useId()
  return (
    <section aria-label={title} className="rounded-[16px] border border-line-soft bg-paper">
      <header className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{description}</p>}
        </div>
        <span className="shrink-0 text-[0.8125rem] font-semibold text-ink-soft">{done} de {steps.length} feitos</span>
      </header>
      {foldable && (
        <button type="button" aria-expanded={showDone} aria-controls={listId} onClick={() => setShowDone(!showDone)}
          className="flex w-full items-center gap-3.5 border-b border-line-soft px-5 py-3 text-left text-[0.8125rem] font-semibold text-ink-soft hover:bg-paper-soft">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-signal-soft text-brand"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>
          <span className="flex-1">{done} {done === 1 ? 'passo concluído' : 'passos concluídos'}</span>
          <ChevronDown className={cn('size-4 transition-transform', showDone && 'rotate-180')} aria-hidden />
        </button>
      )}
      <ol id={listId}>
        {steps.map((s, i) => {
          if (hidden && s.done) return null
          const current = i === next
          return (
            <li key={s.label} className={cn('flex items-center gap-3.5 border-b border-line-soft px-5 py-3.5 last:border-b-0', current && 'bg-signal-soft/40')}>
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-extrabold', s.done ? 'bg-signal-soft text-brand' : current ? 'bg-brand text-white' : 'border border-line text-ink-soft')}>
                {s.done ? <Check className="size-3.5" strokeWidth={3} aria-label="Feito" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[0.9375rem]', s.done ? 'text-ink-soft line-through decoration-line' : 'font-bold')}>{s.label}</p>
                {s.hint && !s.done && <p className="text-[0.8125rem] text-ink-soft">{s.hint}</p>}
              </div>
              {/* Outlined: the step is already marked by its tint and filled number; the page's primary action lives elsewhere. */}
              {current && s.to && (
                <Link to={s.to} className="inline-flex shrink-0 items-center gap-1 rounded-[9px] border border-brand bg-paper px-3.5 py-2 text-[0.8125rem] font-bold text-brand hover:bg-signal-soft">
                  {s.cta ?? 'Ir'} <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
