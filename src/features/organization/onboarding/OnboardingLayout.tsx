import { Navigate, Outlet, useLocation } from 'react-router'
import { Logo } from '../../../ui'
import { Stepper } from './Stepper'
import { RegistrationProvider, useRegistration } from './registration'

const ONBOARDING_STEPS = [
  { path: 'conta', label: 'Conta' },
  { path: 'seguranca', label: 'Segurança' },
  { path: 'organizacao', label: 'Organização' },
] as const

/** Public onboarding (US10): no navigation, one centred column, step indicator on top. */
export function OnboardingLayout() {
  const { pathname } = useLocation()
  const current = pathname.endsWith('/concluido') ? ONBOARDING_STEPS.length : Math.max(0, ONBOARDING_STEPS.findIndex((s) => pathname.endsWith(`/${s.path}`)))
  return (
    <RegistrationProvider>
      <div className="min-h-dvh bg-paper-soft px-5 pb-28 pt-10 max-md:pt-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-7">
          <Logo />
          <Stepper steps={ONBOARDING_STEPS.map((x) => x.label)} current={current} label="Passos do registo" />
          <main id="conteudo" className="flex flex-col gap-6">
            <Outlet />
          </main>
        </div>
      </div>
    </RegistrationProvider>
  )
}

/** /registo: resumes a saved registration at the furthest step reached. */
export function ResumeRegistration() {
  const { account, mfaVerified } = useRegistration()
  return <Navigate to={!account ? 'conta' : !mfaVerified ? 'seguranca' : 'organizacao'} replace />
}
