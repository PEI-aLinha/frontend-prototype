import { Navigate, useNavigate } from 'react-router'
import { Button, Eyebrow } from '../../../ui'
import { MfaSetup } from './MfaSetup'
import { useRegistration } from './registration'

/** US10 · step 2 — simulated MFA setup (authenticator app + 6-digit code). */
export function MfaSetupPage() {
  const navigate = useNavigate()
  const { account, setMfaVerified } = useRegistration()
  if (!account) return <Navigate to="/registo/conta" replace />

  return (
    <>
      <header className="flex flex-col gap-2">
        <Eyebrow className="text-[12px]">Passo 2 de 3 · Segurança</Eyebrow>
        <h1 className="text-[30px] font-extrabold title-tight">Proteja a sua conta</h1>
        <p className="text-[16px] text-ink-soft">Além da palavra-passe, vai entrar com um código do seu telemóvel. Assim, mesmo que alguém descubra a palavra-passe, não consegue entrar.</p>
      </header>
      <MfaSetup email={account.email} onVerified={() => { setMfaVerified(true); navigate('/registo/organizacao') }} />
      <div className="-mt-4 flex justify-center">
        <Button variant="link" size="sm" className="!text-ink-soft" onClick={() => navigate('/registo/conta')}>Voltar ao passo anterior</Button>
      </div>
    </>
  )
}
