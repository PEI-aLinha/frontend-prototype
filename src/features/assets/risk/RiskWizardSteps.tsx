import { Check } from 'lucide-react'
import { cn } from '../../../ui'
import { RISK_STEPS } from './riskFormModel'

/** Progress header of the new-risk wizard: steps already done can be revisited, later ones are reached with "Seguinte". */
export function RiskWizardSteps({ step, onGo }: { step: number; onGo: (i: number) => void }) {
  return (
    <>
      <p className="mb-2 text-[0.75rem] font-semibold text-ink-soft" aria-live="polite">Passo {step + 1} de {RISK_STEPS.length} · {RISK_STEPS[step].title}</p>
      <ol aria-label="Passos do registo" className="mb-6 grid grid-cols-3 gap-2">
        {RISK_STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          return (
            <li key={s.title} aria-current={current ? 'step' : undefined}>
              <button type="button" disabled={!done} onClick={() => onGo(i)} className={cn('flex w-full flex-col gap-1.5 text-left', done && 'cursor-pointer')}>
                <span className={cn('h-1 rounded-full', done || current ? 'bg-brand' : 'bg-paper-deep')} />
                <span className="flex items-center gap-1.5 text-[0.8125rem] font-bold">
                  <span className={cn('grid size-5 place-items-center rounded-full text-[0.6875rem] font-extrabold', done ? 'bg-signal-soft text-brand' : current ? 'bg-brand text-white' : 'border border-line text-ink-soft')}>
                    {done ? <Check className="size-3" strokeWidth={3} aria-label="Feito" /> : i + 1}
                  </span>
                  <span className={current ? '' : 'text-ink-soft'}>{s.title}</span>
                </span>
                <span className="hidden text-[0.75rem] text-muted sm:block">{s.hint}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
