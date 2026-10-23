import { useState } from 'react'
import { CheckCircle2, CircleAlert, Plug, RefreshCw, ShieldCheck, Unplug, UserPlus } from 'lucide-react'
import type { CollectedEvidence, EvidenceStrength, IntegrationConnection, ProviderInfo } from '../../api/contracts'
import { useAssets, useAssignIntegration, useDisconnectIntegration, useDiscoveries, useEvidence, useIntegrations, useServices, useSyncIntegration, useUsers } from '../../api/queries'
import { dateTime } from '../../config/labels'
import { useSession } from '../../core/session'
import { useTenant } from '../../core/tenant'
import { Button, Card, Chip, ErrorState, Eyebrow, Explainer, NextAction, Note, PageHeader, ProgressBar, SkeletonRows, Term, cn, useToast } from '../../ui'
import { ConnectModal } from './ConnectModal'
import { DiscoveryList } from './DiscoveryList'

const STRENGTH: Record<EvidenceStrength, string> = {
  autodeclarada: 'Autodeclarada',
  documento_verificado: 'Documento verificado',
  tecnicamente_verificada: 'Verificada tecnicamente',
  continuamente_verificada: 'Verificada continuamente',
}

const STATUS: Record<IntegrationConnection['status'], string> = { disponivel: 'Por ligar', pedido: 'Pedido enviado', ligado: 'Ligado', erro: 'Erro' }

function ConnectionCard({ c, onConnect, isOwner, canConnect }: { c: IntegrationConnection; onConnect: (p: ProviderInfo) => void; isOwner: boolean; canConnect: boolean }) {
  const org = useTenant()
  const toast = useToast()
  const users = useUsers(org.id)
  const sync = useSyncIntegration(org.id)
  const disconnect = useDisconnectIntegration(org.id)
  const assign = useAssignIntegration(org.id)
  const [confirmOff, setConfirmOff] = useState(false)
  const analyst = users.data?.find((u) => u.role === 'analista')
  const assignee = users.data?.find((u) => u.id === c.assignedTo)
  const on = c.status === 'ligado'
  const fail = (e: Error) => toast.show(e.message, 'error')

  return (
    <li>
      {/* Providers the organization does not use: quieter surface, but text keeps AA contrast (no opacity). */}
      <Card className={cn('flex h-full flex-col gap-3', !c.provider.applies && 'border-dashed bg-paper-soft shadow-none')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <Eyebrow>{c.provider.category}</Eyebrow>
            <h3 className="mt-1 text-[1rem] font-extrabold">{c.provider.name}</h3>
          </div>
          {c.provider.applies ? <Chip tone={on ? 'signal' : 'neutral'} icon={on ? <CheckCircle2 className="size-3.5" aria-hidden /> : undefined}>{STATUS[c.status]}</Chip> : <Chip tone="neutral">Não usa</Chip>}
        </div>
        <p className={cn('text-[0.8125rem]', c.provider.applies ? 'text-ink-soft' : 'text-muted')}>{c.provider.description}</p>
        {on && <p className="text-[0.75rem] text-muted">Última leitura: {c.lastSyncAt ? dateTime(c.lastSyncAt) : '—'}{c.secretRef && <> · <Lock /> credencial no cofre</>}</p>}
        {c.status === 'pedido' && assignee && <p className="text-[0.75rem] text-muted">Pedido ao {assignee.name}. Recebe uma tarefa para autorizar.</p>}
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
                {/* Secondary: the page's next-action banner already carries the one connection to start with. */}
                {canConnect && <Button size="sm" variant="secondary" icon={<Plug className="size-4" aria-hidden />} onClick={() => onConnect(c.provider)}>Ligar</Button>}
                {isOwner && analyst && c.status !== 'pedido' && <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} loading={assign.isPending} onClick={() => assign.mutate({ provider: c.provider.id, userId: analyst.id }, { onSuccess: () => toast.show(`Pedido enviado ao ${analyst.name}`), onError: fail })}>Pedir ao {analyst.name.split(' ')[0]}</Button>}
              </>
            )}
          </div>
        )}
      </Card>
    </li>
  )
}


function Lock() {
  return <ShieldCheck className="inline size-3.5 align-[-2px]" aria-hidden />
}

function EvidenceList({ items, providerName }: { items: CollectedEvidence[]; providerName: (p: CollectedEvidence['provider']) => string }) {
  if (!items.length) return <p className="rounded-[14px] bg-paper-soft px-4 py-5 text-center text-[0.875rem] text-ink-soft">Ainda não há evidências recolhidas. Ligue uma integração para começar.</p>
  const newestFirst = [...items].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
  return (
    <ol className="ml-2 flex flex-col border-l-2 border-line-soft">
      {newestFirst.map((e) => (
        <li key={e.id} className="relative pb-4 pl-6 last:pb-0">
          <span aria-hidden className={cn('absolute -left-[7px] top-1 size-3 rounded-full ring-4 ring-paper', e.ok ? 'bg-brand' : 'bg-risk-high-ink')} />
          <p className="text-[0.75rem] font-semibold text-muted">{dateTime(e.collectedAt)} · {providerName(e.provider)}</p>
          <div className="mt-1 flex items-start gap-2 rounded-[12px] border border-line-soft px-4 py-3">
            {e.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" aria-label="Cumpre" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-risk-high-ink" aria-label="Não cumpre" />}
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-bold">{e.title}</p>
              <p className="text-[0.8125rem] text-ink-soft">{e.result}</p>
              <p className="mt-1 text-[0.75rem] text-muted">{STRENGTH[e.strength]}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Integrations with the company's systems (RF37 / US37). Read-only; a human decides what gets in. */
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
  const usable = integrations.data?.filter((c) => c.provider.applies) ?? []
  const unused = integrations.data?.filter((c) => !c.provider.applies) ?? []
  const connected = usable.filter((c) => c.status === 'ligado').length
  const card = (c: IntegrationConnection) => <ConnectionCard key={c.provider.id} c={c} onConnect={setConnecting} isOwner={isOwner} canConnect={isOwner || c.assignedTo === persona.userId} />
  const firstToConnect = isConsultant ? undefined : integrations.data?.find((c) => c.provider.applies && c.status !== 'ligado' && (isOwner ? c.status !== 'pedido' : c.assignedTo === persona.userId))
  const nextAction = isOwner && pending > 0
    ? <NextAction title={`Reveja ${pending} ${pending === 1 ? 'ativo encontrado' : 'ativos encontrados'}`} text="Só entram no inventário depois de decidir: acrescentar, associar a um que já existe ou ignorar." cta="Ver sugestões" onClick={() => document.getElementById('int-disc')?.scrollIntoView({ behavior: 'smooth' })} />
    : firstToConnect && <NextAction title={`Ligue ${firstToConnect.provider.name}`} text={firstToConnect.provider.description} cta="Ligar" onClick={() => setConnecting(firstToConnect.provider)} />

  return (
    <>
      <PageHeader eyebrow={org.name} title="Integrações" subtitle={isConsultant ? 'Evidências recolhidas automaticamente dos sistemas do cliente.' : 'Ligue os sistemas que a empresa já usa para manter o inventário e as evidências em dia.'} />
      {!isConsultant && (
        <Explainer id={`integrations-${persona.role}`} intro={<>Uma <Term k="integracao">integração</Term> lê dados de um sistema que já usam (ex.: Microsoft 365). Nunca altera nada.</>}
          steps={persona.role === 'analista' ? [
            { title: 'Autorize o acesso', text: 'O Rui pediu-lhe para ligar um sistema. Clique em "Ligar" e siga os três passos.' },
            { title: 'Primeira leitura', text: 'O aLinha lê os dados e prepara sugestões de ativos.' },
            { title: 'O Rui decide', text: 'As sugestões ficam à espera do Rui. Não entram sozinhas no inventário.' },
          ] : [
            { title: 'Escolha o que ligar', text: 'Comece pelo email e contas (Microsoft 365). Se não souber as senhas de administrador, peça ao Pedro.' },
            { title: 'Reveja as sugestões', text: 'Os ativos encontrados aparecem em baixo. Acrescente, associe a um que já existe, ou ignore.' },
            { title: 'Evidências automáticas', text: 'Algumas ações do roadmap (ex.: MFA) passam a ser verificadas sozinhas. A consultora vê o resultado.' },
          ]} />
      )}
      {integrations.data && nextAction}
      {error ? <ErrorState error={error} onRetry={() => { integrations.refetch(); discoveries.refetch(); evidence.refetch() }} /> : !integrations.data ? <SkeletonRows rows={4} /> : (
        <>
          {!isConsultant && (
            <section aria-labelledby="int-catalog" className="flex flex-col gap-3">
              <h2 id="int-catalog" className="section-title">{persona.role === 'analista' ? 'Pedidos para si' : 'Sistemas disponíveis'}</h2>
              {usable.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[0.8125rem] font-semibold text-ink-soft">{connected} de {usable.length} sistemas ligados</p>
                  <ProgressBar value={connected} max={usable.length} label="Sistemas ligados" />
                </div>
              )}
              {integrations.data.length === 0
                ? <p className="rounded-[14px] bg-paper-soft px-4 py-5 text-center text-[0.875rem] text-ink-soft">Não tem integrações para ligar.</p>
                : <>
                  {/* One continuous grid: each card already names its category, so per-category rows only left gaps. */}
                  {usable.length > 0 && <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{usable.map(card)}</ul>}
                  {unused.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      <Eyebrow as="h3">Não usa</Eyebrow>
                      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{unused.map(card)}</ul>
                    </div>
                  )}
                </>}
            </section>
          )}
          {isOwner && (
            <section aria-labelledby="int-disc" className="flex flex-col gap-3">
              <h2 id="int-disc" className="section-title flex items-center gap-2">Ativos encontrados {pending > 0 && <Chip>{pending} por rever</Chip>}</h2>
              <DiscoveryList items={discoveries.data ?? []} assets={assets.data ?? []} services={services.data ?? []} providerName={providerName} canDecide={isOwner} />
            </section>
          )}
          {persona.role !== 'analista' && (
            <section aria-labelledby="int-ev" className="flex flex-col gap-3">
              <h2 id="int-ev" className="section-title">Evidências recolhidas</h2>
              <EvidenceList items={evidence.data ?? []} providerName={providerName} />
            </section>
          )}
          <Note plain>Todas as ligações são só de leitura. As credenciais ficam num cofre cifrado (OpenBao) e nunca aparecem no ecrã. Cada ligação, leitura e decisão fica no histórico.</Note>
        </>
      )}
      <ConnectModal key={connecting?.id ?? 'none'} provider={connecting} open={!!connecting} onClose={() => setConnecting(null)} />
    </>
  )
}
