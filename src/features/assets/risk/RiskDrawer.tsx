import { useState } from 'react'
import type { Asset, RemediationAction, Risk, RiskActionLink, User } from '../../../api/contracts'
import { useAudit, useSaveRisk } from '../../../api/queries'
import { RISK_STATUS_LABEL, TREATMENT_LABEL } from '../../../config/labels'
import { useTenant } from '../../../core/tenant'
import { Button, Chip, Drawer, HistoryList, Modal, Note, RiskLevelBadge, Tabs, useToast } from '../../../ui'
import { toHistory } from '../history'
import { computeRiskLevel, describeRule } from './computeRiskLevel'
import { RiskFields, RiskStepFields } from './RiskFields'
import { RiskWizardSteps } from './RiskWizardSteps'
import { RiskStatusActions } from './RiskStatusActions'
import { emptyRisk, RISK_STEPS, riskToValues, toRiskInput, validateRisk, validateRiskStep, type RiskErrors } from './riskFormModel'

interface Props {
  open: boolean
  onClose: () => void
  risk: Risk | null
  initialAssetId?: string | null
  assets: Asset[]
  users: User[]
  actions: RemediationAction[]
  links: RiskActionLink[]
  onSaved?: (risk: Risk, linkedHigh: boolean) => void
}

/** Novo risco / editar risco (consultora). */
export function RiskEditDrawer({ open, onClose, risk, initialAssetId, assets, users, actions, links, onSaved }: Props) {
  const org = useTenant()
  const toast = useToast()
  const save = useSaveRisk(org.id)
  const [initial] = useState(() => (risk ? riskToValues(risk, links.filter((l) => l.riskId === risk.id).map((l) => l.remediationActionId)) : emptyRisk(initialAssetId)))
  const [values, setValues] = useState(initial)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [errors, setErrors] = useState<RiskErrors>({})
  const [touched, setTouched] = useState(false)
  const [step, setStep] = useState(0)
  const isWizard = !risk
  const lastStep = step === RISK_STEPS.length - 1
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  // Closing with unsaved input asks first: the drawer is easy to dismiss by accident (Esc, overlay).
  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose())
  const goTo = (i: number) => { setErrors({}); setStep(i) }

  const onChange = (v: typeof values) => {
    setValues(v)
    if (touched) setErrors(isWizard ? validateRiskStep(v, step) : validateRisk(v))
  }

  const next = () => {
    const e = validateRiskStep(values, step)
    setErrors(e)
    if (Object.keys(e).length) return
    setTouched(false)
    setStep(step + 1)
  }

  const submit = () => {
    if (isWizard && !lastStep) return next()
    setTouched(true)
    const e = validateRisk(values)
    setErrors(e)
    if (Object.keys(e).length) {
      toast.show('Há campos por preencher', 'error')
      if (isWizard) setStep(RISK_STEPS.findIndex((_, i) => Object.keys(validateRiskStep(values, i)).length > 0))
      return
    }
    save.mutate({ input: toRiskInput(values), id: risk?.id }, {
      onSuccess: (r) => {
        const high = computeRiskLevel(r.probability, r.impact).level === 'alto' && values.treatment === 'mitigar'
        toast.show(risk ? 'Risco atualizado' : `Risco "${r.threat}" registado`)
        onSaved?.(r, high)
        onClose()
      },
      onError: (er) => toast.show(er.message, 'error'),
    })
  }

  const form = (
    <form id="risk-form" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
      {isWizard ? (
        <>
          <RiskWizardSteps step={step} onGo={goTo} />
          {step > 0 && <IdentifySummary threat={values.threat} asset={assets.find((a) => a.id === values.assetId)?.name} onEdit={() => goTo(0)} />}
          <RiskStepFields step={step} values={values} onChange={onChange} errors={errors} assets={assets} users={users} actions={actions} />
        </>
      ) : <RiskFields values={values} onChange={onChange} errors={errors} assets={assets} users={users} actions={actions} />}
    </form>
  )

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && requestClose()} width={600} eyebrow="Registo de riscos · ISO/IEC 27005" title={risk ? risk.threat : 'Novo risco'}
        description={risk ? undefined : 'O nível é calculado pelo sistema a partir da probabilidade e do impacto.'}
        chip={risk ? <><RiskLevelBadge level={computeRiskLevel(risk.probability, risk.impact).level} /><Chip tone="neutral">{RISK_STATUS_LABEL[risk.status]}</Chip></> : undefined}
        footer={<>
          {isWizard && step > 0
            ? <Button variant="secondary" onClick={() => goTo(step - 1)}>Voltar</Button>
            : <Button variant="secondary" onClick={requestClose}>Cancelar</Button>}
          <Button type="submit" form="risk-form" loading={save.isPending}>{risk ? 'Guardar alterações' : lastStep ? 'Registar risco' : 'Seguinte'}</Button>
        </>}>
        {risk ? <Tabs tabs={[{ value: 'risco', label: 'Risco', content: form }, { value: 'estado', label: 'Estado', content: <RiskStatusActions risk={risk} onDone={onClose} /> }, { value: 'historico', label: 'Histórico', content: <RiskHistory riskId={risk.id} users={users} /> }]} /> : form}
      </Drawer>
      <Modal open={confirmDiscard} onOpenChange={setConfirmDiscard} width={440} title={risk ? 'Descartar as alterações?' : 'Descartar o novo risco?'}
        description="O que preencheu ainda não foi guardado e perde-se ao fechar."
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>Continuar a editar</Button>
          <Button variant="danger" onClick={() => { setConfirmDiscard(false); onClose() }}>Descartar</Button>
        </>} />
    </>
  )
}

/** Steps 2 and 3 keep step 1 in view, so nobody has to remember what they described (Nielsen: recognition over recall). */
function IdentifySummary({ threat, asset, onEdit }: { threat: string; asset?: string; onEdit: () => void }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-[12px] bg-paper-soft px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-[11px] text-muted">Risco a registar</p>
        <p className="mt-0.5 truncate text-[14px] font-bold">{threat || '—'}</p>
        <p className="text-[13px] text-ink-soft">{asset ?? 'Toda a empresa'}</p>
      </div>
      <Button variant="link" size="sm" onClick={onEdit}>Alterar</Button>
    </div>
  )
}

function RiskHistory({ riskId, users }: { riskId: string; users: User[] }) {
  const org = useTenant()
  const audit = useAudit(org.id, riskId)
  return audit.data ? <HistoryList items={toHistory(audit.data, users)} /> : <p className="text-[14px] text-muted">A carregar…</p>
}

/** Client view (D3): read-only, plain language. */
export function RiskReadDrawer({ open, onClose, risk, assets, users, actions, links }: Omit<Props, 'initialAssetId' | 'onSaved'>) {
  if (!risk) return null
  const { level } = computeRiskLevel(risk.probability, risk.impact)
  const asset = assets.find((a) => a.id === risk.assetId)
  const linked = links.filter((l) => l.riskId === risk.id).map((l) => actions.find((a) => a.id === l.remediationActionId)).filter(Boolean) as RemediationAction[]
  const owner = users.find((u) => u.id === risk.ownerId)
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} width={560} eyebrow={asset ? asset.name : 'Toda a empresa'} title={risk.threat} chip={<RiskLevelBadge level={level} prefix="Risco " />}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div className="flex flex-col gap-6">
        <section className="rounded-[16px] bg-brand-deep px-6 py-5 text-white">
          <p className="eyebrow text-[11px] text-signal-soft">O que isto significa para a empresa</p>
          <p className="mt-2 text-[17px] font-bold leading-snug">{risk.plainLanguage ?? risk.description}</p>
        </section>
        <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-3 text-[14px] max-sm:grid-cols-1">
          <dt className="text-ink-soft">Porque é {level === 'alto' ? 'alto' : level === 'medio' ? 'médio' : 'baixo'}</dt>
          <dd className="font-semibold">{describeRule(risk.probability, risk.impact)} <span className="font-normal text-muted">(probabilidade × impacto)</span></dd>
          <dt className="text-ink-soft">O que está a ser feito</dt>
          <dd className="font-semibold">{risk.treatment ? TREATMENT_LABEL[risk.treatment] : 'Ainda por decidir'}{risk.treatment === 'aceitar' && risk.acceptanceJustification ? ` — ${risk.acceptanceJustification}` : ''}</dd>
          <dt className="text-ink-soft">Responsável</dt>
          <dd className="font-semibold">{owner?.name ?? '—'}</dd>
          {risk.residualProbability && risk.residualImpact && (<><dt className="text-ink-soft">Depois das ações</dt><dd><RiskLevelBadge level={computeRiskLevel(risk.residualProbability, risk.residualImpact).level} prefix="Previsto: " /></dd></>)}
        </dl>
        {linked.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold">Ações do roadmap que reduzem este risco</h3>
            {linked.map((a) => (
              <div key={a.id} className="rounded-[12px] border border-line-soft px-4 py-3">
                <p className="text-[14px] font-semibold">{a.description}</p>
                <p className="text-[12px] text-muted">#{a.priority} no roadmap · {a.legalObligation}</p>
              </div>
            ))}
          </section>
        )}
        <Note>Registado pela consultora Marta Ferreira. O nível é calculado por regra e não por IA.</Note>
      </div>
    </Drawer>
  )
}
