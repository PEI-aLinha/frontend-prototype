import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Check, Minus } from 'lucide-react'
import { Button, Card, Eyebrow, Field, TextInput, cn } from '../../../ui'
import { PasswordInput } from './PasswordInput'
import { useRegistration } from './registration'

interface Form {
  name: string
  email: string
  password: string
  confirm: string
  terms: boolean
}

type Errors = Partial<Record<keyof Form, string>>

const EMPTY: Form = { name: '', email: '', password: '', confirm: '', terms: false }
const EXAMPLE: Form = { name: 'Rui Santos', email: 'rui.santos@compagueda.pt', password: 'Aguedasegura2026', confirm: 'Aguedasegura2026', terms: true }
const FIELD_ORDER: Array<keyof Form> = ['name', 'email', 'password', 'confirm', 'terms']

const PASSWORD_RULES = [
  { label: 'Pelo menos 12 caracteres', test: (p: string) => p.length >= 12 },
  { label: 'Letras e números', test: (p: string) => /[a-zA-Z]/.test(p) && /\d/.test(p) },
]

function validate(f: Form): Errors {
  const e: Errors = {}
  const name = f.name.trim()
  if (!name) e.name = 'Indique o seu nome.'
  else if (name.split(/\s+/).length < 2) e.name = 'Indique o nome e o apelido, como aparecem nos documentos da empresa.'
  const email = f.email.trim()
  if (!email) e.email = 'Indique o seu email.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Este email não parece válido. Exemplo: nome@empresa.pt'
  if (!f.password) e.password = 'Escolha uma palavra-passe.'
  else if (!PASSWORD_RULES.every((r) => r.test(f.password))) e.password = 'A palavra-passe ainda não cumpre as regras indicadas.'
  if (!f.confirm) e.confirm = 'Repita a palavra-passe.'
  else if (f.confirm !== f.password) e.confirm = 'As duas palavras-passe não são iguais.'
  if (!f.terms) e.terms = 'Para continuar, aceite os termos de utilização e a política de privacidade.'
  return e
}

/** US10 · step 1 — the designated manager creates an account. */
export function CreateAccountPage() {
  const navigate = useNavigate()
  const { account, setAccount } = useRegistration()
  const [form, setForm] = useState<Form>(() => (account ? { ...EMPTY, ...account } : EMPTY))
  const [submitted, setSubmitted] = useState(false)
  const refs = useRef<Partial<Record<keyof Form, HTMLInputElement | null>>>({})

  const errors = submitted ? validate(form) : {}
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(form)
    const first = FIELD_ORDER.find((k) => found[k])
    if (first) { refs.current[first]?.focus(); return }
    setAccount({ name: form.name.trim(), email: form.email.trim().toLowerCase() })
    navigate('/registo/seguranca')
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <Eyebrow className="text-[12px]">Passo 1 de 3 · Conta</Eyebrow>
        <h1 className="text-[30px] font-extrabold title-tight">Crie a sua conta</h1>
      </header>

      <Card className="px-7 py-7 max-md:px-5">
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <Field label="Nome completo" error={errors.name}>
            {(p) => <TextInput ref={(el) => { refs.current.name = el }} id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Rui Santos" />}
          </Field>
          <Field label="Email profissional" hint="É para aqui que enviamos os avisos de prazos e incidentes." error={errors.email}>
            {(p) => <TextInput ref={(el) => { refs.current.email = el }} id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@empresa.pt" />}
          </Field>
          <Field label="Palavra-passe" error={errors.password}>
            {(p) => (
              <div className="flex flex-col gap-2">
                <PasswordInput ref={(el) => { refs.current.password = el }} id={p.id} aria-describedby={[p.describedBy, 'password-rules'].filter(Boolean).join(' ')} invalid={p.invalid} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                <ul id="password-rules" className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {PASSWORD_RULES.map((r) => {
                    const ok = r.test(form.password)
                    return (
                      <li key={r.label} className="flex items-center gap-2 text-[13px]">
                        <span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-signal-soft text-brand' : 'bg-paper-deep text-ink-soft')}>
                          {ok ? <Check className="size-3" strokeWidth={3} aria-label="Cumpre" /> : <Minus className="size-3" strokeWidth={3} aria-label="Ainda não cumpre" />}
                        </span>
                        <span className={ok ? 'text-ink' : 'text-ink-soft'}>{r.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </Field>
          <Field label="Repetir a palavra-passe" error={errors.confirm}>
            {(p) => <PasswordInput ref={(el) => { refs.current.confirm = el }} id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />}
          </Field>

          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink">
              <input ref={(el) => { refs.current.terms = el }} type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? 'terms-error' : undefined} className="mt-[3px] size-[18px] shrink-0 accent-brand" />
              <span>Li e aceito os termos de utilização e a política de privacidade. Os dados da empresa ficam guardados na União Europeia.</span>
            </label>
            {errors.terms && <p id="terms-error" role="alert" className="text-[13px] font-semibold text-danger">{errors.terms}</p>}
          </div>

          <Button type="submit" block>Criar conta e continuar</Button>
        </form>
      </Card>

      <div className="flex flex-col items-center gap-2 text-center">
        <Button variant="link" size="sm" onClick={() => { setForm(EXAMPLE); setSubmitted(false) }}>Preencher com o exemplo do Rui Santos</Button>
        <p className="text-[12px] text-muted">Só existe no protótipo, para acelerar a demonstração.</p>
      </div>
    </>
  )
}
