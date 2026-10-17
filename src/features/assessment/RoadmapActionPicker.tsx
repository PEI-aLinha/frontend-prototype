import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import type { Id, RemediationAction } from '../../api/contracts'
import { useProposeAction } from '../../api/queries'
import { shortDate } from '../../config/labels'
import { AIBadge, Button, Field, TextInput, cn, useToast } from '../../ui'

interface Props {
  orgId: Id
  actions: RemediationAction[]
  selected: Id[]
  onChange: (ids: Id[]) => void
  error?: string
  /** Suggestions (e.g. actions for the same control), shown first. */
  suggested?: Id[]
}

/** Roadmap action picker (Assessment plugin), exposed to other plugins via public.ts. */
export function RoadmapActionPicker({ orgId, actions, selected, onChange, error, suggested = [] }: Props) {
  const toast = useToast()
  const propose = useProposeAction(orgId)
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string>()

  const ordered = [...actions].sort((a, b) => Number(suggested.includes(b.id)) - Number(suggested.includes(a.id)) || a.priority - b.priority)
  const toggle = (id: Id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const submit = () => {
    if (description.trim().length < 5) { setFormError('Descreva a ação em poucas palavras.'); return }
    propose.mutate({ description: description.trim(), legalObligation: 'A definir pela consultora', requiredEvidence: 'A definir', dueDate: null }, {
      onSuccess: (a) => {
        onChange([...selected, a.id])
        setDescription('')
        setAdding(false)
        toast.show('Ação proposta para o roadmap')
      },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? 'actions-error' : undefined}>
      <legend className="mb-1 text-[13px] font-semibold text-ink-soft">Ações do roadmap que mitigam este risco</legend>
      <ul className="flex flex-col gap-2">
        {ordered.map((a) => {
          const on = selected.includes(a.id)
          return (
            <li key={a.id}>
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-[12px] border px-3.5 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal', on ? 'border-brand bg-brand-soft/60' : 'border-line-soft hover:border-line')}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(a.id)} />
                <span aria-hidden className={cn('mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2', on ? 'border-brand bg-brand text-white' : 'border-line')}>
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[14px]', on ? 'font-bold text-brand' : 'font-semibold')}>{a.description}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    #{a.priority} no roadmap · {a.controlCode !== '—' ? `${a.controlCode} · ` : ''}{a.dueDate ? `até ${shortDate(a.dueDate)}` : 'sem prazo'}
                    {suggested.includes(a.id) && <span className="font-bold text-brand"> · sugerida para este ativo</span>}
                  </span>
                  {a.aiOutputId && <span className="mt-1.5 block"><AIBadge /></span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {error && <p id="actions-error" role="alert" className="text-[13px] font-semibold text-danger">{error}</p>}
      {adding ? (
        <div className="flex flex-col gap-3 rounded-[12px] bg-paper-soft p-3.5">
          <Field label="Nova ação para o roadmap" error={formError} hint="Entra no fim do roadmap e sobe se ficar ligada a riscos altos.">
            {(p) => <TextInput id={p.id} invalid={p.invalid} aria-describedby={p.describedBy} value={description} onChange={(e) => { setDescription(e.target.value); setFormError(undefined) }} placeholder="Ex.: Isolar as cópias de segurança da rede (offline)" autoFocus />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button size="sm" onClick={submit} loading={propose.isPending}>Propor ação</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="self-start" icon={<Plus className="size-4" aria-hidden />} onClick={() => setAdding(true)}>Propor nova ação</Button>
      )}
    </fieldset>
  )
}
