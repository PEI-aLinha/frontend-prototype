import type { ReactNode } from 'react'
import { cn } from './cn'

/** "To register" row: dashed 36×36 box with "+", title, text and action on the right. */
export function PendingRow({ title, text, action, assigned }: { title: string; text: string; action: ReactNode; assigned?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3.5 px-5 py-4 max-md:flex-wrap', assigned && 'bg-paper-soft')}>
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-dashed border-line text-[1.125rem] font-extrabold text-muted">+</span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-bold">{title}</p>
        <p className="text-[0.8125rem] text-ink-soft">{text}</p>
      </div>
      <div className="max-md:w-full">{action}</div>
    </div>
  )
}
