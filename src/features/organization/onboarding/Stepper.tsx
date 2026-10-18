import { Check } from 'lucide-react'
import { cn } from '../../../ui'

/** Numbered steps of a public flow (registration, invitation). `current` equal to the length means all done. */
export function Stepper({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', done ? 'bg-signal-soft text-brand' : active ? 'bg-brand text-white' : 'border border-line bg-paper text-muted')}>
              {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Concluído" /> : i + 1}
            </span>
            <span className={cn('truncate text-[13px]', active ? 'font-bold text-ink' : 'font-semibold text-ink-soft')}>{s}</span>
            {i < steps.length - 1 && <span aria-hidden className={cn('h-px flex-1', done ? 'bg-brand' : 'bg-line-soft')} />}
          </li>
        )
      })}
    </ol>
  )
}
