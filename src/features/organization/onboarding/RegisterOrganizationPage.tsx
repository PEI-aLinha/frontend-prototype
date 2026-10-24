import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Info, Save } from 'lucide-react'
import { useRegisterOrganization } from '../../../api/queries'
import { useSession } from '../../../core/session'
import { Button, Field, Note, Select, TextArea, TextInput, Tooltip, buttonClass, useToast } from '../../../ui'
import { StepBadge } from './OnboardingLayout'
import { SECTORS, sectorById } from '../sectors'
import { EMPTY_ORGANIZATION, EXAMPLE_ORGANIZATION, toOrganizationInput, validateOrganization, type OrganizationForm } from './organizationForm'
import { useRegistration } from './registration'

/** Label text with an (i) that shows the explanation on hover or keyboard focus. */
function WithHelp({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <Tooltip content={help}>
        <button type="button" aria-label={`Ajuda: ${label}`} className="grid size-5 place-items-center rounded-full text-muted hover:text-ink"><Info className="size-3.5" aria-hidden /></button>
      </Tooltip>
    </span>
  )
}

function Section({ title, description, help, children }: { title: string; description?: string; help?: string; children: ReactNode }) {
  const descriptionId = useId()
  // The legend must be the fieldset's first child to name the group; the divider lives on the wrapper so it does not cut through the legend.
  return (
    <div className="border-t border-line-soft pt-6 first:border-t-0 first:pt-0">
      <fieldset aria-describedby={description ? descriptionId : undefined} className="flex min-w-0 flex-col gap-4">
        <legend className={description ? 'mb-1 text-[1rem] font-bold' : 'mb-4 text-[1rem] font-bold'}>{help ? <WithHelp label={title} help={help} /> : title}</legend>
        {description && <p id={descriptionId} className="text-[0.8125rem] text-ink-soft">{description}</p>}
        {children}
      </fieldset>
    </div>
  )
}

const row = 'grid items-start gap-5 md:grid-cols-2'

/** US10 · step 3 — organisation details needed for the NIS2 framing (RF01). */
export function RegisterOrganizationPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { signInAs } = useSession()
  const { account, mfaVerified, organization, setOrganization, restored, registered, finish } = useRegistration()
  const register = useRegisterOrganization()
  const [form, setForm] = useState<OrganizationForm>(organization ?? EMPTY_ORGANIZATION)
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  if (registered) return <Navigate to="/registo/concluido" replace />
  if (!account) return <Navigate to="/registo/conta" replace />
  if (!mfaVerified) return <Navigate to="/registo/seguranca" replace />

  const errors = submitted ? validateOrganization(form) : {}
  const sector = sectorById(form.sector)
  const set = <K extends keyof OrganizationForm>(key: K, value: OrganizationForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateOrganization(form)).length > 0) {
      // Wait for the error state to render, then focus the first invalid field.
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    setOrganization(form)
    register.mutate({ account, organization: toOrganizationInput(form) }, {
      onSuccess: (org) => {
        finish(org)
        // The person who just registered becomes the session, in the designated manager role (persona "Rui" slot).
        const name = account!.name.trim()
        const parts = name.split(/\s+/)
        signInAs('rui', { userId: org.registeredBy!, name, firstName: parts[0], initials: (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase() })
        navigate('/registo/concluido')
      },
    })
  }

  const saveForLater = () => {
    setOrganization(form)
    toast.show('Guardado. Pode fechar a página e continuar mais tarde a partir daqui.')
  }

  const text = (key: keyof OrganizationForm, extra: Partial<Parameters<typeof TextInput>[0]> = {}) => (p: { id: string; describedBy?: string; invalid: boolean; required: boolean }) => (
    <TextInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} aria-required={p.required} value={form[key]} onChange={(e) => set(key, e.target.value)} {...extra} />
  )

  return (
    <>
      <header className="flex flex-col gap-3">
        <StepBadge>Passo 3 de 3</StepBadge>
        <h1 className="text-[1.875rem] font-extrabold title-tight">Registe a sua organização</h1>
        <p className="text-[1rem] text-ink-soft">Com estes dados indicamos que leis se aplicam à empresa. Encontra a maioria na certidão permanente.</p>
        <p className="text-[0.875rem] text-ink-soft">Todos os campos são obrigatórios.</p>
      </header>

      {restored && organization && <Note>Retomámos o registo que deixou a meio. Confirme os dados e termine quando quiser.</Note>}

      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-6">
          <Section title="Identificação">
            <Field label="Denominação" hint="O nome oficial da empresa." error={errors.name}>{text('name', { autoComplete: 'organization', placeholder: 'Ex.: Componentes Águeda, Lda.' })}</Field>
            <div className={row}>
              <Field label="NIF" error={errors.nif}>{text('nif', { inputMode: 'numeric', maxLength: 11, placeholder: '9 dígitos' })}</Field>
              <Field label="Código CAE principal" error={errors.cae}>{text('cae', { inputMode: 'numeric', maxLength: 5, placeholder: 'Ex.: 29320' })}</Field>
            </div>
          </Section>

          <Section title="Atividade">
            <div className={row}>
              <Field label="Setor" error={errors.sector}>
                {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} required={p.required} value={form.sector} placeholder="Escolher o setor…" onChange={(v) => setForm((f) => ({ ...f, sector: v, subsector: '' }))} options={SECTORS.map((s) => ({ value: s.id, label: s.label }))} />}
              </Field>
              <Field label="Subsetor" hint={sector && sector.subsectors.length === 0 ? 'Este setor não tem subsetores.' : undefined} error={errors.subsector}>
                {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} required={!!sector && sector.subsectors.length > 0} value={form.subsector} placeholder={sector ? (sector.subsectors.length ? 'Escolher o subsetor…' : 'Não se aplica') : 'Escolha primeiro o setor'} disabled={!sector || sector.subsectors.length === 0} onChange={(v) => set('subsector', v)} options={(sector?.subsectors ?? []).map((s) => ({ value: s.id, label: s.label }))} />}
              </Field>
            </div>
            <Field
              label={<WithHelp label="Serviços prestados" help="O que a empresa faz ou vende, e a quem." />}
              error={errors.services}
            >
              {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} aria-required={p.required} value={form.services} onChange={(e) => set('services', e.target.value)} placeholder="Ex.: Fabrico de componentes para a indústria automóvel." />}
            </Field>
          </Section>

          <Section title="Dimensão" help="Use os valores do último ano fechado.">
            <div className={row}>
              <Field label="Número de trabalhadores" error={errors.employees}>{text('employees', { inputMode: 'numeric', placeholder: 'Ex.: 120' })}</Field>
              <Field label={<WithHelp label="Volume de negócios anual" help="Em euros, sem cêntimos." />} error={errors.turnover}>
                {(p) => (
                  <div className="relative">
                    <TextInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} aria-required={p.required} inputMode="numeric" value={form.turnover} onChange={(e) => set('turnover', e.target.value)} placeholder="Ex.: 18 500 000" className="pr-10" />
                    <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-muted">€</span>
                  </div>
                )}
              </Field>
            </div>
          </Section>

          <Section title="Sede">
            <Field label="Morada" error={errors.address}>{text('address', { autoComplete: 'street-address' })}</Field>
            <div className={row}>
              <Field label="Código postal" error={errors.postalCode}>{text('postalCode', { autoComplete: 'postal-code', maxLength: 8, placeholder: '0000-000' })}</Field>
              <Field label="Localidade" error={errors.city}>{text('city', { autoComplete: 'address-level2' })}</Field>
            </div>
          </Section>

          <Section title="Contactos">
            <div className={row}>
              <Field label="Telefone da empresa" error={errors.phone}>{text('phone', { type: 'tel', autoComplete: 'tel' })}</Field>
              <Field label="Email geral" error={errors.email}>{text('email', { type: 'email', placeholder: 'geral@empresa.pt' })}</Field>
            </div>
          </Section>

          <Section title="Ponto de contacto permanente" help="A pessoa que o CNCS pode contactar a qualquer hora em caso de incidente.">
            <div className={row}>
              <Field label="Nome" error={errors.contactName}>{text('contactName')}</Field>
              <Field label="Telefone disponível a qualquer hora" error={errors.contactPhone}>{text('contactPhone', { type: 'tel' })}</Field>
            </div>
            <Button variant="link" size="sm" className="w-fit" onClick={() => setForm((f) => ({ ...f, contactName: account.name }))}>Sou eu ({account.name})</Button>
          </Section>

          {register.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">
              <span>{register.error.message}</span>
              {/email/i.test(register.error.message) && <Button variant="link" size="sm" onClick={() => navigate('/registo/conta')}>Voltar ao primeiro passo</Button>}
            </div>
          )}
          <div className="flex gap-3 max-sm:flex-col-reverse">
            <Button variant="secondary" icon={<Save className="size-4" aria-hidden />} onClick={saveForLater} disabled={register.isPending}>Guardar e continuar mais tarde</Button>
            <Button type="submit" loading={register.isPending}>Registar organização</Button>
          </div>
        </form>

      <div className="flex flex-col items-start gap-1">
        <Button variant="link" size="sm" onClick={() => { setForm(EXAMPLE_ORGANIZATION); setSubmitted(false) }}>Preencher com o exemplo da Componentes Águeda</Button>
        <p className="text-[0.75rem] text-muted">Só existe no protótipo, para acelerar a demonstração.</p>
        <Link to="/registo/seguranca" className={buttonClass({ variant: 'link', size: 'sm', className: 'mt-2 !text-ink-soft' })}>Voltar ao passo anterior</Link>
      </div>
    </>
  )
}
