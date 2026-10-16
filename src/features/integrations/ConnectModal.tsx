import { useState } from 'react'
import { Check, KeyRound, Lock, RefreshCw } from 'lucide-react'
import type { ProviderInfo } from '../../api/contracts'
import { useConnectIntegration } from '../../api/queries'
import { useTenant } from '../../core/tenant'
import { Button, Chip, Modal, Note, cn, useToast } from '../../ui'

const STEPS = ['O que lemos', 'Autorizar', 'Primeira leitura'] as const

/** Simulated three-step connection. In the real version, step 2 opens the provider's consent page (OAuth). */
export function ConnectModal({ provider, open, onClose }: { provider: ProviderInfo | null; open: boolean; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const connect = useConnectIntegration(org.id)
  const [step, setStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  if (!provider) return null

  const authorize = () => {
    setStep(2)
    connect.mutate(provider.id, {
      onSuccess: () => toast.show(`${provider.name} ligado (só leitura)`),
      onError: (e) => { toast.show(e.message, 'error'); setStep(1) },
    })
  }

  const footer = step === 0 ? (
    <><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => setStep(1)}>Continuar</Button></>
  ) : step === 1 ? (
    <><Button variant="secondary" onClick={() => setStep(0)}>Voltar</Button><Button disabled={!agreed} onClick={authorize}>Autorizar acesso só de leitura</Button></>
  ) : (
    <Button disabled={connect.isPending} onClick={onClose}>{connect.isPending ? 'A ler…' : 'Ver o que foi encontrado'}</Button>
  )

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={600} chip={<Chip>Integração · só leitura</Chip>} title={`Ligar ${provider.name}`} footer={footer}
      description="O aLinha nunca altera nada nos seus sistemas. Só lê o necessário para manter o inventário e as evidências em dia.">
      <ol className="flex gap-2" aria-label="Passos">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={cn('flex flex-1 items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-bold', i === step ? 'bg-brand-soft text-brand' : i < step ? 'text-brand' : 'text-muted')}>
            <span className={cn('grid size-5 place-items-center rounded-full text-[11px]', i <= step ? 'bg-brand text-white' : 'bg-paper-soft')}>{i < step ? <Check className="size-3" aria-hidden /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-[14px] bg-paper-soft p-4">
            <h3 className="text-[14px] font-bold">O aLinha vai ler</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink-soft">{provider.reads.map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />{r}</li>)}</ul>
          </section>
          <section className="rounded-[14px] bg-paper-soft p-4">
            <h3 className="text-[14px] font-bold">E traz para aqui</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink-soft">{provider.brings.map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />{r}</li>)}</ul>
          </section>
          <p className="text-[13px] text-ink-soft sm:col-span-2">Os ativos encontrados <strong>não entram sozinhos</strong> no inventário: aparecem como sugestões e é o Responsável que decide.</p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 rounded-[14px] border border-line-soft p-4">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div className="text-[13px] text-ink-soft">
              <p className="text-[14px] font-bold text-ink">Simulação da página de autorização de {provider.name}</p>
              <p className="mt-1">Na versão real abre-se a página do fornecedor, onde um administrador aprova o acesso. A credencial fica guardada num cofre cifrado (OpenBao) e <strong>nunca</strong> é mostrada no aLinha.</p>
            </div>
          </div>
          <label className="flex items-start gap-2 text-[14px]">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-brand)]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            Sou administrador de {provider.name} e autorizo o aLinha a ler estes dados.
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-2 py-4 text-center" role="status">
          {connect.isPending ? <RefreshCw className="size-6 animate-spin text-brand" aria-hidden /> : <Lock className="size-6 text-brand" aria-hidden />}
          <p className="text-[15px] font-bold">{connect.isPending ? 'A fazer a primeira leitura…' : 'Ligação feita. Primeira leitura concluída.'}</p>
          {!connect.isPending && <p className="text-[13px] text-ink-soft">Os ativos sugeridos e as evidências recolhidas estão na página de integrações.</p>}
        </div>
      )}
      {step < 2 && <Note>Pode desligar a qualquer momento. Ao desligar, a credencial é apagada do cofre.</Note>}
    </Modal>
  )
}
