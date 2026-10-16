import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { Asset } from '../../api/contracts'
import { useCompleteTask, useSaveAsset } from '../../api/queries'
import { ASSET_TYPE_LABEL, shortDay } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { Button, CriticalityChip, EmptyState, ErrorState, Note, PageHeader, ProgressBar, SkeletonRows, useToast, cn } from '../../ui'
import { AssetFields, FormShell } from './AssetForm'
import { emptyValues, toInput, valuesFromAsset } from './assetFormModel'
import { useAssetForm } from './useAssetForm'
import { useInventory } from './useInventory'

/** 11 — Pedro regista os ativos técnicos da sua tarefa. */
export function RegisterAssetsPage() {
  const { taskId = '' } = useParams()
  const org = useTenant()
  const { persona } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const inv = useInventory()
  const save = useSaveAsset(org.id)
  const complete = useCompleteTask(org.id)
  const defaults = emptyValues({ ownerId: persona.userId, service: 'svc-producao' })
  const form = useAssetForm(defaults)
  const [editing, setEditing] = useState<Asset | null>(null)

  const task = inv.tasks.find((t) => t.id === taskId)
  if (inv.error) return <ErrorState error={inv.error} onRetry={inv.refetch} />
  if (!inv.data) return <SkeletonRows rows={5} />
  if (!task) {
    return (
      <>
        <PageHeader eyebrow={org.name} title="Registar ativos técnicos" />
        <EmptyState title="Ainda não tem tarefas de ativos" action={<Button variant="secondary" onClick={() => navigate(`/org/${org.slug}/tarefas`)}>As minhas tarefas</Button>}>
          Quando o Rui Santos lhe atribuir o registo, os ativos aparecem aqui.
        </EmptyState>
      </>
    )
  }

  const mine = inv.data.assets.filter((a) => a.taskId === task.id)
  const expected = task.expectedCount ?? 4
  const done = task.status === 'concluida'
  const owners = inv.data.users.filter((u) => u.role !== 'consultor')

  const persist = (then: 'another' | 'finish') => {
    if (!form.check()) return
    save.mutate({ input: toInput(form.values, task.id), id: editing?.id }, {
      onSuccess: (a) => {
        if (then === 'another') {
          toast.show(`"${a.name}" ${editing ? 'atualizado' : 'registado'}`)
          setEditing(null)
          form.reset(defaults)
          document.getElementById('asset-name-focus')?.focus()
          return
        }
        complete.mutate(task.id, {
          onSuccess: () => { toast.show('Tarefa concluída · o Rui foi notificado'); navigate(`/org/${org.slug}/tarefas`) },
          onError: (e) => toast.show(e.message, 'error'),
        })
      },
      onError: (e) => toast.show(e.message, 'error'),
    })
  }

  const finishWithoutNew = () => complete.mutate(task.id, {
    onSuccess: () => { toast.show('Tarefa concluída · o Rui foi notificado'); navigate(`/org/${org.slug}/tarefas`) },
    onError: (e) => toast.show(e.message, 'error'),
  })

  const meta = (
    <div className="flex w-[260px] flex-col items-end gap-2 max-md:w-full max-md:items-stretch">
      <p className="text-[13px] font-bold">{mine.length} de {expected} registados</p>
      <ProgressBar value={mine.length} max={expected} label="Ativos registados" className="w-full" />
    </div>
  )

  return (
    <>
      <button type="button" onClick={() => navigate(`/org/${org.slug}/tarefas`)} className="-mb-3 inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-brand hover:underline">
        <ArrowLeft className="size-4" aria-hidden />As minhas tarefas
      </button>
      <PageHeader eyebrow="Tarefa · Inventário de ativos" title="Registar ativos técnicos" subtitle={`Atribuída por Rui Santos · até ${shortDay(task.dueDate)}`} actions={meta} />
      {done && <Note>Tarefa concluída. Pode ainda corrigir os ativos que registou; o Rui vê as alterações no histórico.</Note>}

      <div className="flex items-start gap-7 max-lg:flex-col-reverse">
        <section aria-labelledby="registered" className="flex min-w-0 flex-1 flex-col gap-3 max-lg:w-full">
          <h2 id="registered" className="text-[16px] font-bold">Já registados</h2>
          {mine.length === 0 && <p className="rounded-[14px] border border-dashed border-line px-5 py-6 text-[14px] text-ink-soft">Ainda não registou nenhum ativo. Comece pelo servidor de produção.</p>}
          {mine.map((a) => (
            <button key={a.id} type="button" onClick={() => { setEditing(a); form.reset(valuesFromAsset(a)) }}
              className={cn('group flex items-center gap-3.5 rounded-[14px] border bg-paper px-[18px] py-3.5 text-left transition-colors hover:border-line', editing?.id === a.id ? 'border-brand' : 'border-line-soft')}>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{a.name}</p>
                <p className="text-[13px] text-ink-soft">{ASSET_TYPE_LABEL[a.type]} · {inv.data!.serviceName(a.criticalServiceId)}</p>
              </div>
              <Pencil className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-label="Editar" />
              <CriticalityChip level={a.criticality} />
            </button>
          ))}
        </section>

        <section aria-labelledby="new-asset" className="flex w-[520px] shrink-0 flex-col gap-4 rounded-[18px] border border-line-soft bg-paper px-7 py-[26px] max-lg:w-full max-md:px-5">
          <div className="flex items-center justify-between">
            <h2 id="new-asset" className="text-[19px] font-extrabold">{editing ? 'Editar ativo' : 'Novo ativo'}</h2>
            {editing && <Button variant="ghost" size="sm" onClick={() => { setEditing(null); form.reset(defaults) }}>Cancelar edição</Button>}
          </div>
          <span id="asset-name-focus" tabIndex={-1} />
          <FormShell id="register-form" onSubmit={() => persist('another')}>
            <AssetFields id="reg" values={form.values} onChange={form.onChange} services={inv.data.services} owners={owners} errors={form.errors} />
          </FormShell>
          <div className="mt-1 flex gap-3 max-sm:flex-col">
            <Button type="submit" form="register-form" variant="secondary" block loading={save.isPending && !complete.isPending}>{editing ? 'Guardar alterações' : 'Guardar e adicionar outro'}</Button>
            {!done && <Button block onClick={() => (form.values.name.trim() ? persist('finish') : finishWithoutNew())} loading={complete.isPending}>Guardar e concluir</Button>}
          </div>
        </section>
      </div>
    </>
  )
}
