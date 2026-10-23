import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useCheckEmail } from '../../../api/queries'
import { Button, Field, Note, TextInput } from '../../../ui'
import { StepBadge } from './OnboardingLayout'
import { PasswordInput } from './PasswordInput'
import { PasswordChecklist } from './PasswordChecklist'
import { examplePassword, passwordIsValid } from './password'
import { useRegistration } from './registration'
import { isValidEmail } from '../../../config/email'

interface Form {
  name: string
  email: string
  password: string
  confirm: string
  terms: boolean
}

type Errors = Partial<Record<keyof Form, string>>

const EMPTY: Form = { name: '', email: '', password: '', confirm: '', terms: false }
const EXAMPLE: Omit<Form, 'password' | 'confirm'> = { name: 'Rui Santos', email: 'rui.santos@compagueda.pt', terms: true }
const FIELD_ORDER: Array<keyof Form> = ['name', 'email', 'password', 'confirm', 'terms']


function validate(f: Form): Errors {
  const e: Errors = {}
  const name = f.name.trim()
  if (!name) e.name = 'Indique o seu nome.'
  else if (name.split(/\s+/).length < 2) e.name = 'Indique o nome e o apelido, como aparecem nos documentos da empresa.'
  const email = f.email.trim()
  if (!email) e.email = 'Indique o seu email.'
  else if (!isValidEmail(email)) e.email = 'Este email não parece válido. Exemplo: nome@empresa.pt'
  if (!f.password) e.password = 'Escolha uma palavra-passe.'
  else if (!passwordIsValid(f.password)) e.password = 'A palavra-passe ainda não cumpre as regras indicadas.'
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
  const [takenEmail, setTakenEmail] = useState<string | null>(null)
  const checkEmail = useCheckEmail()
  const refs = useRef<Partial<Record<keyof Form, HTMLInputElement | null>>>({})

  const errors = submitted ? validate(form) : {}
  const emailTaken = takenEmail !== null && takenEmail === form.email.trim().toLowerCase()
  if (emailTaken && !errors.email) errors.email = 'Já existe uma conta com este email. Use outro email.'
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(form)
    const first = FIELD_ORDER.find((k) => found[k])
    if (first) { refs.current[first]?.focus(); return }
    const email = form.email.trim().toLowerCase()
    checkEmail.mutate(email, {
      onSuccess: (available) => {
        if (!available) { setTakenEmail(email); refs.current.email?.focus(); return }
        setAccount({ name: form.name.trim(), email })
        navigate('/registo/seguranca')
      },
    })
  }

  return (
    <>
      <header className="flex flex-col gap-3">
        <StepBadge>Passo 1 de 3</StepBadge>
        <h1 className="text-[1.875rem] font-extrabold title-tight">Crie a sua conta</h1>
      </header>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid items-start gap-5 md:grid-cols-2">
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
                  <PasswordChecklist id="password-rules" password={form.password} />
                </div>
              )}
            </Field>
            <Field label="Repetir a palavra-passe" error={errors.confirm}>
              {(p) => <PasswordInput ref={(el) => { refs.current.confirm = el }} id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />}
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-[0.875rem] text-ink">
              <input ref={(el) => { refs.current.terms = el }} type="checkbox" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? 'terms-error' : undefined} className="mt-[3px] size-[18px] shrink-0 accent-brand" />
              <span>Li e aceito os termos de utilização e a política de privacidade. Os dados da empresa ficam guardados na União Europeia.</span>
            </label>
            {errors.terms && <p id="terms-error" role="alert" className="text-[0.8125rem] font-semibold text-danger">{errors.terms}</p>}
          </div>

          {checkEmail.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{checkEmail.error.message}</p>}
          <Button type="submit" className="w-fit max-sm:w-full" loading={checkEmail.isPending}>Criar conta e continuar</Button>
        </form>

      {emailTaken && (
        <Note>Na demonstração, a conta do Rui Santos já existe. Para ver o registo desde o início, abra o menu Demo (Alt+P) e escolha «Adesão · empresa por registar».</Note>
      )}

      <div className="flex flex-col items-start gap-1">
        <Button variant="link" size="sm" onClick={() => { const example = examplePassword(); setForm({ ...EXAMPLE, password: example, confirm: example }); setSubmitted(false) }}>Preencher com o exemplo do Rui Santos</Button>
        <p className="text-[0.75rem] text-muted">Só existe no protótipo, para acelerar a demonstração.</p>
      </div>
    </>
  )
}
