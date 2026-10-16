import type { FormEvent, ReactNode } from 'react'
import { ALL_SERVICES, type AssetType, type CriticalService, type User } from '../../api/contracts'
import { NONE, type AssetFormValues, type Errors } from './assetFormModel'
import { ASSET_TYPE_LABEL } from '../../config/labels'
import { Field, Segmented, Select, Term, TextInput } from '../../ui'

interface AssetFormProps {
  id: string
  values: AssetFormValues
  onChange: (v: AssetFormValues) => void
  services: CriticalService[]
  owners: User[]
  errors: Errors
  /** Outros ativos que podem ser dependências (o próprio fica de fora). */
  others?: Array<{ id: string; name: string }>
}

export function AssetFields({ id, values: v, onChange, services, owners, errors, others = [] }: AssetFormProps) {
  const set = <K extends keyof AssetFormValues>(k: K, val: AssetFormValues[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome" error={errors.name} hint="Como a equipa conhece o ativo. Ex.: Servidor de produção.">
        {(p) => <TextInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={v.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" error={errors.type}>
          {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={v.type} onChange={(x) => set('type', x as AssetType)} options={Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />}
        </Field>
        <Field label="Localização" optional>
          {(p) => <TextInput id={p.id} value={v.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex.: Pavilhão 2" />}
        </Field>
      </div>
      <Field label={<><Term k="servicoCritico">Serviço crítico</Term> que suporta</>} hint="Se este ativo falhar, que atividade da empresa para?">
        {(p) => (
          <Select id={p.id} value={v.service} onChange={(x) => set('service', x)} options={[
            ...services.map((s) => ({ value: s.id, label: s.name })),
            { value: ALL_SERVICES, label: 'Todos os serviços' },
            { value: NONE, label: 'Nenhum em particular' },
          ]} />
        )}
      </Field>
      <Field label="Responsável" error={errors.ownerId}>
        {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={v.ownerId} onChange={(x) => set('ownerId', x)} options={owners.map((u) => ({ value: u.id, label: u.name }))} />}
      </Field>
      <div className="flex flex-col gap-2">
        <p id={`${id}-crit`} className="text-[13px] font-semibold text-ink-soft"><Term k="criticidade" /></p>
        <Segmented labelledBy={`${id}-crit`} value={v.criticality} onChange={(x) => set('criticality', x)} options={[{ value: 'alto', label: 'Alta' }, { value: 'medio', label: 'Média' }, { value: 'baixo', label: 'Baixa' }]} />
        <p className="text-[13px] text-muted">Alta: se falhar, a produção ou a faturação param. Média: atrasa o trabalho. Baixa: incómodo, resolve-se no dia.</p>
      </div>
      {others.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-semibold text-ink-soft">Depende de <span className="font-normal text-muted">(opcional)</span></legend>
          <p className="-mt-1 text-[13px] text-muted">Que outros ativos têm de funcionar para este funcionar? Ajuda a perceber o efeito em cadeia de uma falha.</p>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => {
              const on = v.dependsOn.includes(o.id)
              return (
                <button key={o.id} type="button" aria-pressed={on} onClick={() => set('dependsOn', on ? v.dependsOn.filter((d) => d !== o.id) : [...v.dependsOn, o.id])}
                  className={on ? 'rounded-full border border-brand bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand' : 'rounded-full border border-line-soft px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:border-line'}>
                  {on ? '✓ ' : '+ '}{o.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
    </div>
  )
}

export function FormShell({ onSubmit, children, id }: { onSubmit: () => void; children: ReactNode; id: string }) {
  return (
    <form id={id} noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit() }}>
      {children}
    </form>
  )
}
