import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MailOpen } from 'lucide-react'
import { useAcceptInvite, useInvite } from '../../../api/queries'
import { shortDate } from '../../../config/labels'
import { useSession } from '../../../core/session'
import { Button, Card, EmptyState, Eyebrow, Field, Logo, SkeletonRows, TextInput } from '../../../ui'
import { MfaSetup } from '../onboarding/MfaSetup'
import { PasswordChecklist } from '../onboarding/PasswordChecklist'
import { PasswordInput } from '../onboarding/PasswordInput'
import { Stepper } from '../onboarding/Stepper'
import { examplePassword, passwordIsValid } from '../onboarding/password'

/** US12 — the invited analyst opens the link, creates a password, sets up MFA and enters the platform. */
export function AcceptInvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { signInAs } = useSession()
  const invite = useInvite(token)
  const accept = useAcceptInvite()
  const [step, setStep] = useState<0 | 1>(0)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const errors = !submitted ? {} : {
    password: !password ? 'Escolha uma palavra-passe.' : !passwordIsValid(password) ? 'A palavra-passe ainda não cumpre as regras indicadas.' : undefined,
    confirm: !confirm ? 'Repita a palavra-passe.' : confirm !== password ? 'As duas palavras-passe não são iguais.' : undefined,
    terms: !terms ? 'Para continuar, aceite os termos de utilização e a política de privacidade.' : undefined,
  }

  const next = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!passwordIsValid(password) || confirm !== password || !terms) return
    setStep(1)
  }

  const finish = () => accept.mutate(token, {
    onSuccess: ({ user, organizationSlug }) => {
      // The person joins in the analyst role of the demo (persona "Pedro" slot), with their own identity.
      signInAs('pedro', { userId: user.id, name: user.name, firstName: user.name.split(' ')[0], initials: user.initials })
      navigate(`/org/${organizationSlug}/tarefas`)
    },
  })

  let content
  if (invite.isPending) content = <SkeletonRows rows={3} />
  else if (invite.isError) {
    content = <EmptyState icon={<MailOpen className="size-5" aria-hidden />} title="Não foi possível abrir o convite">{invite.error.message}</EmptyState>
  } else {
    const inv = invite.data
    content = (
      <>
        <Stepper steps={['Conta', 'Segurança']} current={step} label="Passos para aceitar o convite" />
        <header className="flex flex-col gap-2">
          <Eyebrow className="text-[12px]">Convite de {inv.invitedByName} · <time dateTime={inv.invitedAt}>{shortDate(inv.invitedAt)}</time></Eyebrow>
          <h1 className="text-[30px] font-extrabold title-tight">{step === 0 ? `Junte-se à equipa da ${inv.organizationName}` : 'Proteja a sua conta'}</h1>
          {step === 0 && <p className="text-[16px] text-ink-soft">Como analista, vai ver só as tarefas que lhe forem atribuídas.</p>}
        </header>

        {step === 0 ? (
          <>
            <Card className="px-7 py-7 max-md:px-5">
              <form noValidate onSubmit={next} className="flex flex-col gap-5">
                <div className="grid items-start gap-5 md:grid-cols-2">
                  <Field label="Nome">{(p) => <TextInput id={p.id} value={inv.name} readOnly disabled />}</Field>
                  <Field label="Email">{(p) => <TextInput id={p.id} value={inv.email} readOnly disabled />}</Field>
                  <Field label="Palavra-passe" error={errors.password}>
                    {(p) => (
                      <div className="flex flex-col gap-2">
                        <PasswordInput id={p.id} aria-describedby={[p.describedBy, 'invite-password-rules'].filter(Boolean).join(' ')} invalid={p.invalid} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <PasswordChecklist id="invite-password-rules" password={password} />
                      </div>
                    )}
                  </Field>
                  <Field label="Repetir a palavra-passe" error={errors.confirm}>
                    {(p) => <PasswordInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
                  </Field>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink">
                    <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? 'invite-terms-error' : undefined} className="mt-[3px] size-[18px] shrink-0 accent-brand" />
                    <span>Li e aceito os termos de utilização e a política de privacidade.</span>
                  </label>
                  {errors.terms && <p id="invite-terms-error" role="alert" className="text-[13px] font-semibold text-danger">{errors.terms}</p>}
                </div>
                <Button type="submit" block>Continuar</Button>
              </form>
            </Card>
            <div className="flex flex-col items-center gap-2 text-center">
              <Button variant="link" size="sm" onClick={() => { const example = examplePassword(); setPassword(example); setConfirm(example); setTerms(true); setSubmitted(false) }}>Preencher com o exemplo</Button>
              <p className="text-[12px] text-muted">Só existe no protótipo, para acelerar a demonstração.</p>
            </div>
          </>
        ) : (
          <>
            <MfaSetup email={inv.email} submitLabel="Ativar e entrar" onVerified={finish} />
            {accept.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[13px] font-semibold text-risk-high-ink">{accept.error.message}</p>}
            <p className="-mt-4 flex justify-center">
              <Button variant="link" size="sm" className="!text-ink-soft" onClick={() => setStep(0)}>Voltar ao passo anterior</Button>
            </p>
          </>
        )}
      </>
    )
  }

  return (
    <div className="min-h-dvh bg-paper-soft px-5 pb-28 pt-10 max-md:pt-6">
      <div className="mx-auto flex max-w-[760px] flex-col gap-7">
        <header><Logo /></header>
        <main id="conteudo" className="flex flex-col gap-7">
          {content}
        </main>
      </div>
    </div>
  )
}
