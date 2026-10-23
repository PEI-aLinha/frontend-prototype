import { Link, Navigate, useNavigate } from 'react-router'
import { buttonClass } from '../../../ui'
import { StepBadge } from './OnboardingLayout'
import { MfaSetup } from './MfaSetup'
import { useRegistration } from './registration'

/** US10 · step 2 — simulated MFA setup (authenticator app + 6-digit code). */
export function MfaSetupPage() {
  const navigate = useNavigate()
  const { account, setMfaVerified } = useRegistration()
  if (!account) return <Navigate to="/registo/conta" replace />

  return (
    <>
      <header className="flex flex-col gap-3">
        <StepBadge>Passo 2 de 3</StepBadge>
        <h1 className="text-[30px] font-extrabold title-tight">Proteja a sua conta</h1>
        <p className="text-[16px] text-ink-soft">Além da palavra-passe, vai entrar com um código do seu telemóvel. Assim, mesmo que alguém descubra a palavra-passe, não consegue entrar.</p>
      </header>
      <MfaSetup email={account.email} onVerified={() => { setMfaVerified(true); navigate('/registo/organizacao') }} />
      <p className="-mt-4 flex">
        <Link to="/registo/conta" className={buttonClass({ variant: 'link', size: 'sm', className: '!text-ink-soft' })}>Voltar ao passo anterior</Link>
      </p>
    </>
  )
}
