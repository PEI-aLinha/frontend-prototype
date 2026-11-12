import { Link } from 'react-router'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from './cn'

export interface NextStep {
  label: string
  hint?: string
  done: boolean
  to?: string
  cta?: string
}

/** "What to do next" checklist: tells each person their next step. */
export function NextSteps({ title = 'O que fazer a seguir', steps }: { title?: string; steps: NextStep[] }) {
  const next = steps.findIndex((s) => !s.done)
  const done = steps.filter((s) => s.done).length
  return (
    <section aria-label={title} className="rounded-[16px] border border-line-soft bg-paper">
      <header className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
        <h2 className="section-title">{title}</h2>
        <span className="text-[0.8125rem] font-semibold text-ink-soft">{done} de {steps.length} feitos</span>
      </header>
      <ol>
        {steps.map((s, i) => {
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
