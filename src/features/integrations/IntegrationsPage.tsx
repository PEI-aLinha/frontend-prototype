import { useState } from 'react'
import { CheckCircle2, CircleAlert, Plug, RefreshCw, KeyRound, Unplug, UserPlus } from 'lucide-react'
import type { CollectedEvidence, IntegrationConnection, ProviderInfo } from '../../api/contracts'
import { useAssets, useAssignIntegration, useDisconnectIntegration, useDiscoveries, useEvidence, useIntegrations, useServices, useSyncIntegration, useTasks, useUpdateTask, useUsers } from '../../api/queries'
import { dateTime, EVIDENCE_STRENGTH_LABEL } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { Button, Card, Chip, ErrorState, Eyebrow, Note, PageHeader, SkeletonRows, cn, useToast } from '../../ui'
import { ConnectModal } from './ConnectModal'
import { DiscoveryList } from './DiscoveryList'

const STATUS: Record<IntegrationConnection['status'], string> = { disponivel: 'Por ligar', pedido: 'Pedido enviado', ligado: 'Ligado', erro: 'Erro' }

function sortByUse(items: IntegrationConnection[]): IntegrationConnection[] {
  return [...items.filter((i) => i.provider.applies), ...items.filter((i) => !i.provider.applies)]
}

function ConnectionCard({ c, onConnect, isOwner, canConnect }: { c: IntegrationConnection; onConnect: (p: ProviderInfo) => void; isOwner: boolean; canConnect: boolean }) {
  const org = useTenant()
  const toast = useToast()
  const users = useUsers(org.id)
  const sync = useSyncIntegration(org.id)
  const disconnect = useDisconnectIntegration(org.id)
  const assign = useAssignIntegration(org.id)
  const cancelTask = useUpdateTask(org.id)
  const tasks = useTasks(org.id)
  const [confirmOff, setConfirmOff] = useState(false)
  const analyst = users.data?.find((u) => u.role === 'analista')
  const assignee = users.data?.find((u) => u.id === c.assignedTo)
  const { persona } = useSession()
  const on = c.status === 'ligado'
  const forMe = c.status === 'pedido' && c.assignedTo === persona?.userId
  const request = tasks.data?.find((t) => t.kind === 'integracao' && t.provider === c.provider.id && t.status === 'pendente')
  const withdraw = (taskId: string, name: string) => cancelTask.mutate({ id: taskId, change: { status: 'cancelada' } }, { onSuccess: () => toast.show(`Pedido a ${name} cancelado`), onError: fail })
  const fail = (e: Error) => toast.show(e.message, 'error')

  return (
    <li className="list-none">
      <Card className={cn('flex h-full flex-col gap-3', !c.provider.applies && 'opacity-100')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Eyebrow>{c.provider.category}</Eyebrow>
             <h3 className="mt-1 text-base font-extrabold truncate">{c.provider.name}</h3>
           </div>
           {c.provider.applies ? <Chip tone={on || forMe ? 'signal' : 'neutral'} icon={on ? <CheckCircle2 className="size-3.5" aria-hidden /> : undefined}>{forMe ? 'Pedido para si' : STATUS[c.status]}</Chip> : <Chip tone="neutral">Não usa</Chip>}
          </div>
          <p className="text-sm text-ink-soft">{c.provider.description}</p>
          {on && <p className="text-xs text-muted">Última leitura: {c.lastSyncAt ? dateTime(c.lastSyncAt) : '—'}{c.secretRef && <> · <VaultKey /> credencial no cofre</>}</p>}
          {c.status === 'pedido' && assignee && <p className="text-xs text-muted">{assignee.id === persona?.userId ? 'Pedido a si: autorize a ligação aqui.' : `Pedido a ${assignee.name}, que recebe uma tarefa para autorizar.`}</p>}
        {c.provider.applies && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {on ? (
              <>
                {canConnect && <Button size="sm" variant="secondary" icon={<RefreshCw className="size-4" aria-hidden />} loading={sync.isPending} onClick={() => sync.mutate(c.provider.id, { onSuccess: () => toast.show('Leitura atualizada'), onError: fail })}>Ler agora</Button>}
                {isOwner && (confirmOff
                  ? <Button size="sm" variant="danger" loading={disconnect.isPending} onClick={() => disconnect.mutate(c.provider.id, { onSuccess: () => toast.show(`${c.provider.name} desligado`), onError: fail })}>Confirmar: desligar</Button>
                  : <Button size="sm" variant="ghost" icon={<Unplug className="size-4" aria-hidden />} onClick={() => setConfirmOff(true)}>Desligar</Button>)}
              </>
            ) : (
              <>
                {/* The responsible person is rarely the system's administrator: asking the technician comes first. */}
                {isOwner && analyst && c.status !== 'pedido' && <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} loading={assign.isPending}
                  onClick={() => assign.mutate({ provider: c.provider.id, userId: analyst.id }, {
                    onSuccess: (task) => toast.show(`Pedido enviado a ${analyst.name}`, 'success', { label: 'Anular', onClick: () => withdraw(task.id, analyst.name) }),
                    onError: fail,
                  })}>Pedir ao técnico</Button>}
                {canConnect && <Button size="sm" variant={isOwner && analyst ? 'ghost' : 'primary'} icon={<Plug className="size-4" aria-hidden />} onClick={() => onConnect(c.provider)}>{isOwner && analyst ? 'Ligar eu' : 'Ligar'}</Button>}
                {isOwner && c.status === 'pedido' && request && assignee && <Button size="sm" variant="ghost" loading={cancelTask.isPending} onClick={() => withdraw(request.id, assignee.name)}>Cancelar pedido</Button>}
              </>
            )}
          </div>
        )}
      </Card>
    </li>
  )
}

function VaultKey() {
  return <KeyRound className="inline size-3.5 align-[-2px]" aria-hidden />
}

function EvidenceList({ items, providerName }: { items: CollectedEvidence[]; providerName: (p: CollectedEvidence['provider']) => string }) {
  if (!items.length) return <p className="rounded-[14px] bg-paper-soft px-4 py-5 text-center text-sm text-ink-soft">Ainda não há evidências recolhidas. Ligue uma integração para começar.</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.id} className="flex items-start gap-3 rounded-[12px] border border-line-soft px-4 py-3">
          {e.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" aria-label="Cumpre" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-risk-high-ink" aria-label="Não cumpre" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{e.title}</p>
            <p className="text-sm text-ink-soft">{e.result}</p>
            <p className="mt-1 text-xs text-muted">{providerName(e.provider)} · {EVIDENCE_STRENGTH_LABEL[e.strength]} · {dateTime(e.collectedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Integrations with the company's systems (RF37 / US37). Read-only; a human decides what gets in. */
/** The usual case in one click: the technician is asked for every system the company uses and nobody has asked for yet. */
function AskAll({ items }: { items: IntegrationConnection[] }) {
  const org = useTenant()
  const toast = useToast()
  const users = useUsers(org.id)
  const assign = useAssignIntegration(org.id)
  const cancelTask = useUpdateTask(org.id)
  const [busy, setBusy] = useState(false)
  const analyst = users.data?.find((u) => u.role === 'analista')
  const open = items.filter((c) => c.provider.applies && (c.status === 'disponivel' || c.status === 'erro'))
  if (!analyst || open.length < 2) return null
  const askAll = () => {
    setBusy(true)
    Promise.all(open.map((c) => assign.mutateAsync({ provider: c.provider.id, userId: analyst.id })))
      .then((tasks) => toast.show(`${tasks.length} pedidos enviados a ${analyst.name}`, 'success', {
        label: 'Anular',
        onClick: () => Promise.all(tasks.map((t) => cancelTask.mutateAsync({ id: t.id, change: { status: 'cancelada' } })))
          .then(() => toast.show('Pedidos cancelados'))
          .catch((e: Error) => toast.show(e.message, 'error')),
      }))
      .catch((e: Error) => toast.show(e.message, 'error'))
      .finally(() => setBusy(false))
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line-soft bg-paper-soft px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-ink-soft">{open.length} sistemas por ligar. Quem os administra costuma ser o técnico, {analyst.name}: recebe uma tarefa para cada um.</p>
      <Button size="sm" icon={<UserPlus className="size-4" aria-hidden />} loading={busy} onClick={askAll}>Pedir tudo ao técnico</Button>
    </div>
  )
}

export function IntegrationsPage() {
  const org = useTenant()
  const { persona } = useSession()
  const integrations = useIntegrations(org.id)
  const discoveries = useDiscoveries(org.id)
  const evidence = useEvidence(org.id)
  const assets = useAssets(org.id)
  const services = useServices(org.id)
  const [connecting, setConnecting] = useState<ProviderInfo | null>(null)
  const isOwner = persona.role === 'responsavel'
  const isConsultant = persona.role === 'consultor'
  const error = integrations.error ?? discoveries.error ?? evidence.error
  const providerName = (id: string) => integrations.data?.find((c) => c.provider.id === id)?.provider.name ?? id
  const pending = discoveries.data?.filter((d) => d.status === 'proposto').length ?? 0

  return (
    <>
      <PageHeader title="Integrações" subtitle={isConsultant ? 'Evidências recolhidas automaticamente dos sistemas do cliente.' : 'Ligue os sistemas que a empresa já usa para manter o inventário e as evidências em dia.'} />
      {error ? <ErrorState error={error} onRetry={() => { void integrations.refetch(); void discoveries.refetch(); void evidence.refetch() }} /> : !integrations.data ? <SkeletonRows rows={4} /> : (
        <>
          {!isConsultant && (
            <section aria-labelledby="int-catalog" className="flex flex-col gap-3">
              <h2 id="int-catalog" className="text-lg font-extrabold">{persona.role === 'analista' ? 'Pedidos para si' : 'Sistemas disponíveis'}</h2>
              {integrations.data.length === 0
                ? <p className="rounded-[14px] bg-paper-soft px-4 py-5 text-center text-sm text-ink-soft">Não tem integrações para ligar.</p>
                // One grid: each card already names its category, and the ones the company does not use come last.
                : <>{isOwner && <AskAll items={integrations.data} />}<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sortByUse(integrations.data).map((c) => <ConnectionCard key={c.provider.id} c={c} onConnect={setConnecting} isOwner={isOwner} canConnect={isOwner || c.assignedTo === persona.userId} />)}</ul></>}
            </section>
          )}
          {isOwner && (
            <section aria-labelledby="int-disc" className="flex flex-col gap-3">
              <h2 id="int-disc" className="flex items-center gap-2 text-lg font-extrabold">Ativos encontrados {pending > 0 && <Chip>{pending} por rever</Chip>}</h2>
              <DiscoveryList items={discoveries.data ?? []} assets={assets.data ?? []} services={services.data ?? []} providerName={providerName} canDecide={isOwner} />
            </section>
          )}
          {persona.role !== 'analista' && (
            <section aria-labelledby="int-ev" className="flex flex-col gap-3">
              <h2 id="int-ev" className="text-lg font-extrabold">Evidências recolhidas</h2>
              <EvidenceList items={evidence.data ?? []} providerName={providerName} />
            </section>
          )}
          <Note>Todas as ligações são só de leitura. As credenciais ficam guardadas cifradas e nunca aparecem no ecrã. Cada ligação, leitura e decisão fica no histórico.</Note>
        </>
      )}
      <ConnectModal key={connecting?.id ?? 'none'} provider={connecting} open={!!connecting} canReview={isOwner}
        onClose={(review) => { setConnecting(null); if (review) requestAnimationFrame(() => document.getElementById('int-disc')?.scrollIntoView({ block: 'start' })) }} />
    </>
  )
}
