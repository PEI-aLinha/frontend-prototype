import { Bot, Sparkles } from 'lucide-react'
import { Avatar } from './Avatar'
import { dateTime } from '../config/labels'

export interface HistoryItem {
  id: string
  who: { name: string; initials: string } | null
  actorType: 'user' | 'system' | 'ai'
  summary: string
  createdAt: string
  context?: string
}

/** Change history (RF29): who, when, what. */
export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return <p className="text-[14px] text-muted">Ainda não há alterações registadas.</p>
  return (
    <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-line-soft">
      {items.map((h) => (
        <li key={h.id} className="relative flex gap-3">
          {h.actorType === 'user' && h.who ? (
            <span className="relative z-10 ring-4 ring-paper rounded-full"><Avatar initials={h.who.initials} size={28} /></span>
          ) : (
            <span className="relative z-10 grid size-7 place-items-center rounded-full bg-brand-deep text-signal-soft ring-4 ring-paper">
              {h.actorType === 'ai' ? <Sparkles className="size-3.5" aria-hidden /> : <Bot className="size-3.5" aria-hidden />}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[14px]">
              <span className="font-bold">{h.actorType === 'ai' ? 'IA do aLinha' : h.actorType === 'system' ? 'Sistema' : h.who?.name}</span>{' '}
              <span className="text-ink-soft">{h.summary.charAt(0).toLowerCase() + h.summary.slice(1)}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              <time dateTime={h.createdAt}>{dateTime(h.createdAt)}</time>
              {h.context && <> · {h.context}</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
