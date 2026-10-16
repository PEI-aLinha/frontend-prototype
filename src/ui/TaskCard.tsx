import type { ReactNode } from 'react'
import { Chip } from './Chip'
import { cn } from './cn'

interface TaskCardProps {
  type: string
  due?: string
  title: string
  meta: string
  done?: boolean
  action?: ReactNode
}

/** Cartão de tarefa do analista: chip do tipo + prazo, título Bold 17, meta 13. */
export function TaskCard({ type, due, title, meta, done, action }: TaskCardProps) {
  return (
    <article className={cn('flex items-center gap-5 rounded-[16px] border border-line-soft px-6 py-5 max-md:flex-col max-md:items-stretch max-md:px-5', done ? 'bg-paper-soft' : 'bg-paper')}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{type}</Chip>
          {done ? <Chip tone="neutral">Concluída</Chip> : due && <span className="text-[13px] font-bold text-brand">{due}</span>}
        </div>
        <h3 className={cn('text-[17px] font-bold', done && 'text-ink-soft')}>{title}</h3>
        <p className="text-[13px] text-muted">{meta}</p>
      </div>
      {done ? <span className="text-[14px] font-bold text-signal">✓ Feito</span> : action}
    </article>
  )
}
