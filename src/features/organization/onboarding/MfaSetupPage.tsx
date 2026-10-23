import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../../ui'
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
        <h1 className="text-[1.875rem] font-extrabold title-tight">Proteja a sua conta</h1>
        <p className="text-[1rem] text-ink-soft">Além da palavra-passe, vai entrar com um código do seu telemóvel. Assim, mesmo que alguém descubra a palavra-passe, não consegue entrar.</p>
      </header>
      <MfaSetup email={account.email} onVerified={() => { setMfaVerified(true); navigate('/registo/organizacao') }} />
      <div className="-mt-4 flex">
        <Button variant="link" size="sm" className="!text-ink-soft" onClick={() => navigate('/registo/conta')}>Voltar ao passo anterior</Button>
      </div>
    </>
  )
}
