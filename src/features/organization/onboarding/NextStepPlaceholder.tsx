import { useNavigate } from 'react-router'
import { Button, Card, Eyebrow } from '../../../ui'
import { useRegistration } from './registration'

/** Temporary target for the steps that are still being built (US10, blocks 2 and 3). */
export function NextStepPlaceholder({ step, title }: { step: string; title: string }) {
  const navigate = useNavigate()
  const { account } = useRegistration()
  return (
    <>
      <header className="flex flex-col gap-2">
        <Eyebrow className="text-[12px]">{step}</Eyebrow>
        <h1 className="text-[30px] font-extrabold title-tight">{title}</h1>
        {account && <p className="text-[16px] text-ink-soft">Conta criada para {account.name} ({account.email}).</p>}
      </header>
      <Card soft className="flex flex-col items-start gap-4">
        <p className="text-[14px] text-ink-soft">Este passo ainda está a ser construído.</p>
        <Button variant="secondary" onClick={() => navigate('/registo/conta')}>Voltar ao passo anterior</Button>
      </Card>
    </>
  )
}
