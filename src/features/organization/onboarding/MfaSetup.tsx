import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Copy } from 'lucide-react'
import { Button, Card, Field, Note, TextInput, useToast } from '../../../ui'
import { SimulatedQr } from './SimulatedQr'

/** In the prototype this is the only code the "authentication server" accepts. */
const DEMO_CODE = '246810'
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function setupKey(email: string): string {
  let h = 5381
  let key = ''
  for (let i = 0; i < 16; i++) {
    for (const c of `${email}:${i}`) h = Math.imul(h, 33) ^ c.charCodeAt(0)
    key += BASE32[(h >>> 0) % 32]
  }
  return key.match(/.{4}/g)!.join(' ')
}

const APPS = 'Google Authenticator, Microsoft Authenticator ou outra à sua escolha'

/** Simulated MFA setup (authenticator app + 6-digit code), used at registration (US10) and when accepting an invitation (US12). */
export function MfaSetup({ email, submitLabel = 'Confirmar e continuar', onVerified }: { email: string; submitLabel?: string; onVerified: () => void }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [checking, setChecking] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const key = useMemo(() => setupKey(email), [email])

  const fail = (message: string) => { setError(message); input.current?.focus() }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!code) return fail('Indique o código de 6 dígitos que aparece na aplicação.')
    if (code.length < 6) return fail('O código tem 6 dígitos. Faltam ' + (6 - code.length) + '.')
    setChecking(true)
    window.setTimeout(() => {
      setChecking(false)
      if (code !== DEMO_CODE) return fail('Este código não está certo. Os códigos mudam a cada 30 segundos: confirme na aplicação e tente outra vez.')
      toast.show('Autenticação em dois passos ativada')
      onVerified()
    }, 500)
  }

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(key.replaceAll(' ', ''))
      toast.show('Chave copiada')
    } catch {
      toast.show('Não foi possível copiar. Escreva a chave à mão.', 'error')
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-6 px-7 py-7 max-md:px-5">
        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-bold">1. Instale uma aplicação de autenticação</h2>
          <p className="text-[14px] text-ink-soft">No telemóvel, por exemplo {APPS}.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold">2. Leia o código QR com a aplicação</h2>
          <div className="flex items-center gap-6 max-sm:flex-col max-sm:items-start">
            <SimulatedQr seed={email} />
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-[14px] text-ink-soft">Não consegue ler o código? Escreva esta chave na aplicação.</p>
              <code className="w-fit rounded-[10px] bg-paper-soft px-3 py-2 font-mono text-[15px] tracking-[0.08em] text-ink">{key}</code>
              <Button variant="secondary" size="sm" className="w-fit" icon={<Copy className="size-4" aria-hidden />} onClick={copyKey}>Copiar chave</Button>
            </div>
          </div>
        </section>

        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <h2 className="text-[16px] font-bold">3. Escreva o código que aparece na aplicação</h2>
          <Field label="Código de 6 dígitos" error={error}>
            {(p) => (
              <TextInput
                ref={input} id={p.id} aria-describedby={p.describedBy} invalid={p.invalid}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(undefined) }}
                className="max-w-[220px] font-mono text-[20px] tracking-[0.4em]"
              />
            )}
          </Field>
          <Button type="submit" className="w-fit max-sm:w-full" loading={checking}>{submitLabel}</Button>
        </form>
      </Card>

      <Note>Sempre que entrar no aLinha, vai pedir-lhe a palavra-passe e um código novo da aplicação.</Note>

      <div className="flex flex-col items-start gap-1">
        <Button variant="link" size="sm" onClick={() => { setCode(DEMO_CODE); setError(undefined) }}>Preencher com o código da demonstração</Button>
        <p className="text-[12px] text-muted">Só existe no protótipo. Qualquer outro código dá erro, para mostrar a mensagem.</p>
      </div>
    </>
  )
}
