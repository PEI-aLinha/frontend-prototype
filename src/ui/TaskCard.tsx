import type { ReactNode } from 'react'
import { Chip } from './Chip'
import { cn } from './cn'

interface TaskCardProps {
  type: string
  due?: string
  title: string
  meta: string
  done?: boolean
  /** Shown before the due date, e.g. "Por fazer" or "Atrasada". */
  state?: ReactNode
  /** Late tasks show the due date in the high-risk colour. */
  late?: boolean
  action?: ReactNode
}

/** Analyst task card: type chip + due date, Bold 17 title, 13 meta. */
export function TaskCard({ type, due, title, meta, done, state, late, action }: TaskCardProps) {
  return (
    <article className={cn('flex items-center gap-5 rounded-[16px] border border-line-soft px-6 py-5 max-md:flex-col max-md:items-stretch max-md:px-5', done ? 'bg-paper-soft' : 'bg-paper')}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{type}</Chip>
          {done ? <Chip tone="neutral">Concluída</Chip> : <>{state}{due && <span className={cn('text-[13px] font-bold', late ? 'text-risk-high-ink' : 'text-brand')}>{due}</span>}</>}
        </div>
        <h3 className={cn('text-[16px] font-bold', done && 'text-ink-soft')}>{title}</h3>
        <p className="text-[13px] text-muted">{meta}</p>
      </div>
      {done ? <span className="text-[14px] font-bold text-brand"><span aria-hidden className="text-signal">✓</span> Feito</span> : action}
    </article>
  )
}
