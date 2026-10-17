import { Outlet, useLocation } from 'react-router'
import { Check } from 'lucide-react'
import { Logo, cn } from '../../../ui'
import { RegistrationProvider } from './registration'

const ONBOARDING_STEPS = [
  { path: 'conta', label: 'Conta' },
  { path: 'seguranca', label: 'Segurança' },
  { path: 'organizacao', label: 'Organização' },
] as const

/** Public onboarding (US10): no navigation, one centred column, step indicator on top. */
export function OnboardingLayout() {
  const { pathname } = useLocation()
  const current = Math.max(0, ONBOARDING_STEPS.findIndex((s) => pathname.endsWith(`/${s.path}`)))
  return (
    <RegistrationProvider>
      <div className="min-h-dvh bg-paper-soft px-5 pb-28 pt-10 max-md:pt-6">
        <div className="mx-auto flex max-w-[560px] flex-col gap-7">
          <Logo />
          <ol aria-label="Passos do registo" className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((s, i) => {
              const done = i < current
              const active = i === current
              return (
                <li key={s.path} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', done ? 'bg-signal-soft text-brand' : active ? 'bg-brand text-white' : 'border border-line bg-paper text-muted')}>
                    {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Concluído" /> : i + 1}
                  </span>
                  <span className={cn('truncate text-[13px]', active ? 'font-bold text-ink' : 'font-semibold text-ink-soft')}>{s.label}</span>
                  {i < ONBOARDING_STEPS.length - 1 && <span aria-hidden className={cn('h-px flex-1', done ? 'bg-brand' : 'bg-line-soft')} />}
                </li>
              )
            })}
          </ol>
          <main id="conteudo" className="flex flex-col gap-6">
            <Outlet />
          </main>
        </div>
      </div>
    </RegistrationProvider>
  )
}
