import { Check, Minus } from 'lucide-react'
import { cn } from '../../../ui'
import { PASSWORD_RULES } from './password'

/** Live checklist under the password field. */
export function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="flex flex-wrap gap-x-5 gap-y-1.5">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.label} className="flex items-center gap-2 text-[13px]">
            <span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-signal-soft text-brand' : 'bg-paper-deep text-ink-soft')}>
              {ok ? <Check className="size-3" strokeWidth={3} aria-label="Cumpre" /> : <Minus className="size-3" strokeWidth={3} aria-label="Ainda não cumpre" />}
            </span>
            <span className={ok ? 'text-ink' : 'text-ink-soft'}>{r.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
