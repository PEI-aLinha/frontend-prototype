import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Check } from 'lucide-react'
import type { AiUse, ScopeInput } from '../../../api/contracts'
import { useSaveScope } from '../../../api/queries'
import { useTenant } from '../../../core/tenant'
import { Button, Card, OptionGroup, PageHeader, cn, useToast, type OptionItem } from '../../../ui'

type Draft = { [K in keyof ScopeInput]: K extends 'aiUses' ? AiUse[] : ScopeInput[K] | null }
type Errors = Partial<Record<keyof ScopeInput, string>>

const EMPLOYEE: OptionItem<ScopeInput['employeeData']>[] = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]
const CUSTOMER: OptionItem<ScopeInput['customerData']>[] = [
  { value: 'sim', label: 'Sim, de pessoas', hint: 'Nomes, emails, telefones ou moradas de clientes particulares ou de contactos.' },
  { value: 'so_empresas', label: 'Só de empresas', hint: 'Apenas dados como o nome, o NIF ou a morada de outras empresas.' },
  { value: 'nao', label: 'Não' },
]
const USES_AI: OptionItem<ScopeInput['usesAi']>[] = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
  { value: 'nao_sei', label: 'Não sei' },
]
const AI_USES: Array<{ value: AiUse; label: string; hint: string }> = [
  { value: 'chatbot', label: 'Chatbot', hint: 'No site ou no apoio a clientes.' },
  { value: 'recrutamento', label: 'Recrutamento ou avaliação de pessoas', hint: 'Software que escolhe candidatos ou avalia trabalhadores.' },
  { value: 'assistente', label: 'Assistentes no dia a dia', hint: 'Por exemplo, ChatGPT ou Copilot para escrever textos ou resumos.' },
  { value: 'outro', label: 'Outro uso', hint: 'Por exemplo, previsão de vendas ou controlo de qualidade com câmaras.' },
]

function validate(d: Draft): Errors {
  const e: Errors = {}
  if (!d.employeeData) e.employeeData = 'Escolha uma resposta.'
  if (!d.customerData) e.customerData = 'Escolha uma resposta.'
  if (!d.usesAi) e.usesAi = 'Escolha uma resposta.'
  else if (d.usesAi === 'sim' && d.aiUses.length === 0) e.aiUses = 'Escolha pelo menos um uso.'
  return e
}

function AiUseGroup({ value, onChange, error }: { value: AiUse[]; onChange: (v: AiUse[]) => void; error?: string }) {
  const toggle = (u: AiUse) => onChange(value.includes(u) ? value.filter((x) => x !== u) : [...value, u])
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? 'ai-uses-err' : undefined}>
      <legend className="mb-1.5 text-[13px] font-semibold text-ink-soft">Para quê? Escolha todos os que se aplicam.</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {AI_USES.map((o) => {
          const on = value.includes(o.value)
          return (
            <label key={o.value} className={cn('flex cursor-pointer items-start gap-3 rounded-[12px] border px-4 py-3.5 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal', on ? 'border-brand bg-brand-soft' : 'border-line bg-paper hover:border-ink-soft')}>
              <input type="checkbox" checked={on} onChange={() => toggle(o.value)} className="sr-only" />
              <span aria-hidden className={cn('mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2', on ? 'border-brand bg-brand text-white' : 'border-line')}>
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-[15px]', on ? 'font-bold text-brand' : 'text-ink')}>{o.label}</span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && <p id="ai-uses-err" role="alert" className="text-[13px] font-semibold text-danger">{error}</p>}
    </fieldset>
  )
}

function Question({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line-soft pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-[16px] font-bold">{n}. {title}</h2>
      {children}
    </section>
  )
}

/** US34 — questions about personal data and AI that define the regulatory scope (RF03). */
export function ScopeQuestionsPage() {
  const org = useTenant()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveScope(org.id)
  const [draft, setDraft] = useState<Draft>(() => ({
    employeeData: org.scope?.employeeData ?? null,
    customerData: org.scope?.customerData ?? null,
    usesAi: org.scope?.usesAi ?? null,
    aiUses: org.scope?.aiUses ?? [],
  }))
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate(draft) : {}
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(draft)).length > 0) return
    save.mutate(draft as ScopeInput, {
      onSuccess: () => {
        toast.show('Respostas guardadas')
        navigate(`/org/${org.slug}/ambito`)
      },
    })
  }

  return (
    <>
      <PageHeader eyebrow={org.name} title="Que leis se aplicam à empresa?" subtitle="Três perguntas rápidas. Pode mudar as respostas mais tarde." />
      <Card className="px-7 py-7 max-md:px-5">
        <form noValidate onSubmit={submit} className="flex max-w-[760px] flex-col gap-6">
          <Question n={1} title="A empresa guarda dados dos trabalhadores?">
            <OptionGroup name="employeeData" legend="Por exemplo, contactos, salários, horários ou faltas." columns={2} value={draft.employeeData} onChange={(v) => set('employeeData', v)} options={EMPLOYEE} error={errors.employeeData} />
          </Question>
          <Question n={2} title="E de clientes ou fornecedores?">
            <OptionGroup name="customerData" legend="Inclui contactos guardados no email, no telemóvel ou em folhas de Excel." value={draft.customerData} onChange={(v) => set('customerData', v)} options={CUSTOMER} error={errors.customerData} />
          </Question>
          <Question n={3} title="A empresa usa sistemas de inteligência artificial?">
            <OptionGroup name="usesAi" legend="Programas que respondem, escolhem ou decidem sozinhos, como um chatbot." columns={3} value={draft.usesAi} onChange={(v) => set('usesAi', v)} options={USES_AI} error={errors.usesAi} />
            {draft.usesAi === 'sim' && <AiUseGroup value={draft.aiUses} onChange={(v) => set('aiUses', v)} error={errors.aiUses} />}
          </Question>
          {save.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[13px] font-semibold text-risk-high-ink">{save.error.message}</p>}
          <Button type="submit" className="self-start max-sm:self-stretch" loading={save.isPending}>Guardar respostas</Button>
        </form>
      </Card>
    </>
  )
}
