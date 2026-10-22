import { useId } from 'react'
import type { Asset, RemediationAction, Treatment, User } from '../../../api/contracts'
import { RISK_MATRIX } from '../../../config/riskMatrix'
import { ASSET_TYPE_LABEL, TREATMENT_HINT, TREATMENT_LABEL } from '../../../config/labels'
import { useTenant } from '../../../core/tenant'
import { RoadmapActionPicker } from '../../assessment/public'
import { Field, OptionGroup, RiskLevelBadge, Segmented, Select, Term, TextArea, TextInput, cn } from '../../../ui'
import type { GlossaryKey } from '../../../config/glossary'
import { computeRiskLevel, describeRule } from './computeRiskLevel'
import { NO_ASSET, REVIEW_OPTIONS, SUGGESTED_ACTIONS, type RiskErrors, type RiskFormValues } from './riskFormModel'

interface Props {
  values: RiskFormValues
  onChange: (v: RiskFormValues) => void
  errors: RiskErrors
  assets: Asset[]
  users: User[]
  actions: RemediationAction[]
}

function ScaleField({ label, kind, value, onChange, error, term }: { label: string; term?: GlossaryKey; kind: 'probability' | 'impact'; value: number | null; onChange: (v: number) => void; error?: string }) {
  const id = useId()
  const steps = RISK_MATRIX[kind]
  const current = steps.find((s) => s.value === value)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p id={id} className="text-[13px] font-semibold text-ink-soft">{term ? <Term k={term}>{label}</Term> : label}</p>
      <Segmented labelledBy={id} block invalid={!!error} value={value === null ? null : String(value)} onChange={(v) => onChange(Number(v))} options={steps.map((s) => ({ value: String(s.value), label: s.label }))} />
      <p className={cn('min-h-[38px] text-[13px]', error ? 'font-semibold text-danger' : 'text-muted')} role={error ? 'alert' : undefined}>{error ?? current?.hint ?? 'Escolha um nível. Cada um tem uma explicação curta.'}</p>
    </div>
  )
}

/** Level computed live, with the rule visible. Never picked by hand. */
export function LiveLevel({ probability, impact, label = 'Nível de risco', compact }: { probability: number | null; impact: number | null; label?: string; compact?: boolean }) {
  const ready = probability !== null && impact !== null
  const result = ready ? computeRiskLevel(probability, impact) : null
  return (
    <div aria-live="polite" className={cn('flex items-center justify-between gap-3 rounded-[14px] border border-dashed border-line px-4', compact ? 'py-2.5' : 'py-3.5')}>
      <div>
        <p className="eyebrow text-[11px] text-muted">{label} · calculado pelo sistema</p>
        <p className="mt-0.5 text-[14px] font-semibold">{ready ? describeRule(probability, impact) : 'Escolha a probabilidade e o impacto'}</p>
        {result && !compact && <p className="text-[12px] text-muted">Regra: probabilidade × impacto = {probability} × {impact} = {result.score}</p>}
      </div>
      {result ? <RiskLevelBadge level={result.level} size="lg" /> : <span className="text-[13px] text-muted">—</span>}
    </div>
  )
}

type StepProps = Props

function IdentifyFields({ values: v, onChange, errors, assets }: StepProps) {
  const set = <K extends keyof RiskFormValues>(k: K, val: RiskFormValues[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="flex flex-col gap-5">
      <Field label={<><Term k="ativo">Ativo</Term> afetado</>} optional hint={v.assetId === NO_ASSET ? 'Sem ativo: o risco é sobre a organização no seu todo.' : undefined}>
        {(p) => <Select id={p.id} value={v.assetId} onChange={(x) => set('assetId', x)} options={[{ value: NO_ASSET, label: 'Sem ativo concreto' }, ...assets.map((a) => ({ value: a.id, label: a.name, hint: ASSET_TYPE_LABEL[a.type] }))]} />}
      </Field>
      <Field label={<Term k="ameaca" />} error={errors.threat} hint="O que pode correr mal, em poucas palavras.">
        {(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={v.threat} onChange={(e) => set('threat', e.target.value)} placeholder="Ex.: Ransomware no servidor de produção" />}
      </Field>
      <Field label="Descrição" optional hint="O que pode acontecer e porquê. Para a equipa técnica.">
        {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} value={v.description} onChange={(e) => set('description', e.target.value)} />}
      </Field>
    </div>
  )
}

function AssessFields({ values: v, onChange, errors, users }: StepProps) {
  const set = <K extends keyof RiskFormValues>(k: K, val: RiskFormValues[K]) => onChange({ ...v, [k]: val })
  const owners = users.filter((u) => u.role !== 'consultor')
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ScaleField label="Probabilidade" term="probabilidade" kind="probability" value={v.probability} onChange={(x) => set('probability', x)} error={errors.probability} />
        <ScaleField label="Impacto" term="impacto" kind="impact" value={v.impact} onChange={(x) => set('impact', x)} error={errors.impact} />
      </div>
      <LiveLevel probability={v.probability} impact={v.impact} />

      <Field label="Responsável pelo risco" hint="Na empresa cliente. Recebe as ações ligadas.">
        {(p) => <Select id={p.id} aria-describedby={p.describedBy} value={v.ownerId} onChange={(x) => set('ownerId', x)} options={owners.map((u) => ({ value: u.id, label: u.name }))} />}
      </Field>
    </div>
  )
}

function TreatFields({ values: v, onChange, errors, assets, actions }: StepProps) {
  const org = useTenant()
  const set = <K extends keyof RiskFormValues>(k: K, val: RiskFormValues[K]) => onChange({ ...v, [k]: val })
  const asset = assets.find((a) => a.id === v.assetId)
  const suggested = asset ? SUGGESTED_ACTIONS[asset.type] ?? [] : []
  return (
    <div className="flex flex-col gap-5">
      <OptionGroup<Treatment> name="treatment" legend={<><Term k="tratamento">Tratamento</Term> (<Term k="iso27005">ISO/IEC 27005</Term>)</>} columns={2} value={v.treatment} onChange={(x) => set('treatment', x)}
        options={(Object.keys(TREATMENT_LABEL) as Treatment[]).map((t) => ({ value: t, label: TREATMENT_LABEL[t], hint: TREATMENT_HINT[t] }))} />

      {v.treatment === 'mitigar' && (
        <RoadmapActionPicker orgId={org.id} actions={actions} selected={v.actionIds} onChange={(ids) => set('actionIds', ids)} error={errors.actionIds} suggested={suggested} />
      )}
      {v.treatment === 'aceitar' && (
        <Field label="Justificação da aceitação" error={errors.acceptanceJustification}>
          {(p) => <TextArea id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={v.acceptanceJustification} onChange={(e) => set('acceptanceJustification', e.target.value)} placeholder="Ex.: o custo de tratar é maior do que o impacto previsto; revemos na revisão trimestral." />}
        </Field>
      )}

      <div className="flex flex-col gap-3 rounded-[14px] bg-paper-soft p-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold">
          <input type="checkbox" checked={v.hasResidual} onChange={(e) => set('hasResidual', e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
          Indicar o <Term k="riscoResidual">risco residual</Term> previsto <span className="font-normal text-muted">(opcional)</span>
        </label>
        {v.hasResidual && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ScaleField label="Probabilidade depois do tratamento" kind="probability" value={v.residualProbability} onChange={(x) => set('residualProbability', x)} />
              <ScaleField label="Impacto depois do tratamento" kind="impact" value={v.residualImpact} onChange={(x) => set('residualImpact', x)} />
            </div>
            {errors.residual && <p role="alert" className="text-[13px] font-semibold text-danger">{errors.residual}</p>}
            <LiveLevel probability={v.residualProbability} impact={v.residualImpact} label="Risco residual" compact />
          </>
        )}
      </div>

      <Field label="Próxima revisão" hint="A ISO/IEC 27005 pede que cada risco seja revisto periodicamente. Recebe um lembrete nessa data.">
        {(p) => <Select id={p.id} describedBy={p.describedBy} value={v.reviewDate} onChange={(x) => set('reviewDate', x)} options={REVIEW_OPTIONS} />}
      </Field>

      <Field label="O que isto significa para a empresa" optional hint="Uma frase simples que o Rui vê depois de validar o roadmap.">
        {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} rows={2} value={v.plainLanguage} onChange={(e) => set('plainLanguage', e.target.value)} placeholder="Ex.: Um vírus pode bloquear o servidor e parar a produção durante dias." />}
      </Field>
    </div>
  )
}

/** One wizard step of the new-risk form. */
export function RiskStepFields({ step, ...props }: Props & { step: number }) {
  return step === 0 ? <IdentifyFields {...props} /> : step === 1 ? <AssessFields {...props} /> : <TreatFields {...props} />
}

/** All steps in one form (editing an existing risk). */
export function RiskFields(props: Props) {
  return (
    <div className="flex flex-col gap-5">
      <IdentifyFields {...props} />
      <AssessFields {...props} />
      <TreatFields {...props} />
    </div>
  )
}
