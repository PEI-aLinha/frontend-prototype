import { lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Chip, Logo } from '../../../ui'
import { Stepper } from './Stepper'
import { RegistrationProvider, useRegistration } from './registration'

const ONBOARDING_STEPS = [
  { path: 'conta', label: 'Conta' },
  { path: 'seguranca', label: 'Segurança' },
  { path: 'organizacao', label: 'Organização' },
] as const

/** "Passo 1 de 3" pill above each onboarding title. */
export function StepBadge({ children }: { children: ReactNode }) {
  return <Chip className="w-fit font-semibold">{children}</Chip>
}

const OnboardingParticles = lazy(() => import('./OnboardingParticles'))

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches)

// Static network of points and lines on the brand panel: shown while the animation loads and when motion is reduced (fixed coordinates, viewBox 500×900).
const NODES: Array<[number, number]> = [
  [195, 32], [322, 48], [80, 112], [150, 138], [292, 120], [368, 88], [420, 132], [342, 150],
  [92, 248], [64, 330], [200, 335], [234, 316], [372, 310], [492, 380], [305, 402], [150, 488],
  [258, 465], [210, 580], [160, 548], [316, 548], [42, 468], [428, 474], [212, 666], [404, 676],
  [26, 645], [242, 740], [428, 720], [372, 856],
]
const EDGES: Array<[number, number]> = [
  [0, 1], [0, 3], [0, 2], [1, 5], [1, 4], [4, 6], [5, 6], [5, 7], [4, 7], [3, 4], [2, 3], [3, 8],
  [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [10, 14], [11, 14], [14, 16], [15, 16], [15, 17],
  [16, 17], [17, 18], [17, 19], [16, 19], [9, 20], [20, 15], [14, 21], [12, 21], [17, 22], [22, 25],
  [22, 23], [24, 25], [23, 26], [10, 18], [15, 18], [16, 21],
]

function Network() {
  return (
    <svg aria-hidden viewBox="0 0 500 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      {EDGES.map(([a, b]) => <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="white" strokeOpacity={0.14} strokeWidth={1} />)}
      {NODES.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill="white" fillOpacity={0.35} />)}
    </svg>
  )
}

/** Public onboarding (US10): brand panel with the steps on the left, the current step on the right. */
export function OnboardingLayout() {
  const { pathname } = useLocation()
  const reducedMotion = useReducedMotion()
  const current = pathname.endsWith('/concluido') ? ONBOARDING_STEPS.length : Math.max(0, ONBOARDING_STEPS.findIndex((s) => pathname.endsWith(`/${s.path}`)))
  const steps = ONBOARDING_STEPS.map((x) => x.label)
  return (
    <RegistrationProvider>
      <div className="flex min-h-dvh bg-paper">
        <aside className="sticky top-0 flex h-dvh w-[500px] shrink-0 flex-col justify-between overflow-hidden bg-brand-deep bg-gradient-to-br from-brand-deep via-brand/90 to-signal/75 px-14 pb-28 pt-14 max-xl:w-[420px] max-xl:px-11 max-lg:hidden">
          {reducedMotion ? <Network /> : <Suspense fallback={<Network />}><OnboardingParticles /></Suspense>}
          <Logo className="relative h-10 w-fit brightness-0 invert" />
          <p className="relative text-[4rem] font-extrabold leading-[0.98] tracking-[-0.03em] text-white">Tudo<br />alinhado.</p>
          <div className="relative">
            <Stepper steps={steps} current={current} label="Passos do registo" orientation="vertical" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 items-center px-10 pb-28 pt-16 max-md:px-5 max-md:pt-6">
          <div className="mx-auto flex w-full max-w-[620px] flex-col gap-7">
            <div className="flex flex-col gap-7 lg:hidden">
              <Logo className="self-start" />
              <Stepper steps={steps} current={current} label="Passos do registo" />
            </div>
            <main id="conteudo" className="flex flex-col gap-6">
              <Outlet />
            </main>
          </div>
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
