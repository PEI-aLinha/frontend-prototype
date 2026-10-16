import { ApiError, type DemoActor, type IntegrationConnection, type IntegrationsApi, type ProviderId, type Task, type User } from '../contracts'
import { DISCOVERIES, EVIDENCE, PROVIDERS } from './integrationsCatalog'
import { notify } from './notify'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
import type { DemoState } from './seed'

function provider(id: ProviderId) {
  const p = PROVIDERS.find((x) => x.id === id)
  if (!p) throw new ApiError('Integração desconhecida', 404)
  return p
}

function view(s: Readonly<DemoState>, id: ProviderId): IntegrationConnection {
  const c = s.connections[id]
  return { provider: provider(id), status: c?.status ?? 'disponivel', connectedBy: c?.connectedBy ?? null, connectedAt: c?.connectedAt ?? null, lastSyncAt: c?.lastSyncAt ?? null, secretRef: c?.secretRef ?? null, assignedTo: c?.assignedTo ?? null, errorMessage: c?.errorMessage }
}

/** Ligações a sistemas do cliente, só de leitura. As credenciais ficam no cofre (OpenBao). */
export function createIntegrationsMock(getActor: () => DemoActor): IntegrationsApi {
  const me = (): User => {
    const u = getState().users.find((x) => x.id === getActor().userId)
    if (!u) throw new ApiError('Utilizador desconhecido', 401)
    return u
  }
  const canConnect = (id: ProviderId) => {
    const u = me()
    if (u.role === 'responsavel') return
    if (u.role === 'analista' && getState().connections[id]?.assignedTo === u.id) return
    throw new ApiError('Não tem permissão para ligar esta integração.', 403)
  }

  /** Sincroniza: cria sugestões novas e atualiza evidências desta integração. */
  const syncInto = (s: DemoState, id: ProviderId): DemoState => {
    const known = new Set(s.discoveries.map((d) => d.name))
    const fresh = DISCOVERIES[id].filter((d) => !known.has(d.name)).map((d) => ({ ...d, id: newId('dsc'), status: 'proposto' as const, resolvedAssetId: null }))
    const evidence = [...s.evidence.filter((e) => e.provider !== id), ...EVIDENCE[id].map((e) => ({ ...e, id: newId('evd'), collectedAt: now() }))]
    return { ...s, discoveries: [...s.discoveries, ...fresh], evidence }
  }

  return {
    list: () => simulate(() => {
      if (me().role === 'consultor') return PROVIDERS.map((p) => view(getState(), p.id)).filter((c) => c.status === 'ligado')
      if (me().role === 'analista') return PROVIDERS.map((p) => view(getState(), p.id)).filter((c) => c.assignedTo === me().id)
      return PROVIDERS.map((p) => view(getState(), p.id))
    }),

    connect: (org, id) => simulate(() => {
      canConnect(id)
      if (!provider(id).applies) throw new ApiError('Esta integração não se aplica à sua empresa.', 409)
      const u = me()
      setState((s) => {
        const prev = s.connections[id]
        const stamp = now()
        const next: DemoState = { ...s, connections: { ...s.connections, [id]: { status: 'ligado', connectedBy: u.id, connectedAt: stamp, lastSyncAt: stamp, secretRef: `openbao://alinha/${org}/${id}`, assignedTo: prev?.assignedTo ?? null } } }
        const entry = auditEntry({ organizationId: org, userId: u.id, action: 'connect', entityType: 'integration', entityId: id, summary: `Ligou a integração "${provider(id).name}" (só leitura)`, before: null, after: { status: 'ligado' } })
        let out = syncInto({ ...next, audit: [...next.audit, entry] }, id)
        const task = out.tasks.find((t) => t.kind === 'integracao' && t.provider === id && t.status === 'pendente')
        if (task) {
          out = { ...out, tasks: out.tasks.map((t) => (t.id === task.id ? { ...t, status: 'concluida' as const } : t)) }
          out = notify(out, { organizationId: org, userId: task.assignedBy, kind: 'integracao', title: `${u.name.split(' ')[0]} ligou ${provider(id).name}`, body: 'Há ativos sugeridos para rever no inventário.', link: '/org/componentes-agueda/integracoes' })
        }
        return out
      })
      return view(getState(), id)
    }),

    sync: (_org, id) => simulate(() => {
      canConnect(id)
      setState((s) => {
        const c = s.connections[id]
        if (c?.status !== 'ligado') throw new ApiError('A integração não está ligada.', 409)
        return syncInto({ ...s, connections: { ...s.connections, [id]: { ...c, lastSyncAt: now() } } }, id)
      })
      return view(getState(), id)
    }),

    disconnect: (org, id) => simulate(() => {
      if (me().role !== 'responsavel') throw new ApiError('Só o Responsável designado pode desligar integrações.', 403)
      setState((s) => {
        const entry = auditEntry({ organizationId: org, userId: me().id, action: 'disconnect', entityType: 'integration', entityId: id, summary: `Desligou a integração "${provider(id).name}" e apagou a credencial do cofre`, before: { status: 'ligado' }, after: { status: 'disponivel' } })
        const { [id]: _removed, ...rest } = s.connections
        void _removed
        return { ...s, connections: rest, evidence: s.evidence.filter((e) => e.provider !== id), discoveries: s.discoveries.filter((d) => d.provider !== id || d.status !== 'proposto'), audit: [...s.audit, entry] }
      })
    }),

    assign: (org, id, userId) => simulate(() => {
      if (me().role !== 'responsavel') throw new ApiError('Não tem permissão.', 403)
      let task!: Task
      setState((s) => {
        const u = me()
        const assignee = s.users.find((x) => x.id === userId)
        if (!assignee) throw new ApiError('Analista desconhecido', 404)
        task = { id: newId('task'), organizationId: org, kind: 'integracao', provider: id, title: `Ligar ${provider(id).name}`, scope: provider(id).name, context: 'Integrações · só leitura', assigneeId: userId, assignedBy: u.id, dueDate: '2026-10-20', status: 'pendente', createdAt: now() }
        const entry = auditEntry({ organizationId: org, userId: u.id, action: 'assign', entityType: 'task', entityId: task.id, summary: `Pediu ao ${assignee.name} para ligar "${provider(id).name}"`, before: null, after: { provider: id } })
        const next: DemoState = { ...s, tasks: [...s.tasks, task], connections: { ...s.connections, [id]: { ...view(s, id), status: 'pedido', assignedTo: userId } }, audit: [...s.audit, entry] }
        return notify(next, { organizationId: org, userId, kind: 'tarefa', title: `Nova tarefa: ligar ${provider(id).name}`, body: 'Autorize o acesso só de leitura. Demora cerca de 2 minutos.', link: '/org/componentes-agueda/integracoes' })
      })
      return task
    }),

    listDiscoveries: () => simulate(() => (me().role === 'consultor' ? [] : getState().discoveries)),

    decide: (org, id, d) => simulate(() => {
      if (me().role !== 'responsavel') throw new ApiError('Só o Responsável designado decide o que entra no inventário.', 403)
      setState((s) => {
        const disc = s.discoveries.find((x) => x.id === id)
        if (!disc || disc.status !== 'proposto') throw new ApiError('Sugestão já decidida.', 409)
        const u = me()
        const stamp = now()
        if (d.decision === 'ignorar') {
          const entry = auditEntry({ organizationId: org, userId: u.id, action: 'ignore', entityType: 'integration', entityId: id, summary: `Ignorou a sugestão "${disc.name}" (${provider(disc.provider).name})`, before: null, after: null })
          return { ...s, discoveries: s.discoveries.map((x) => (x.id === id ? { ...x, status: 'ignorado' as const } : x)), audit: [...s.audit, entry] }
        }
        if (d.decision === 'associar') {
          const asset = s.assets.find((a) => a.id === d.assetId)
          if (!asset) throw new ApiError('Ativo não encontrado', 404)
          const entry = auditEntry({ organizationId: org, userId: u.id, action: 'link', entityType: 'asset', entityId: asset.id, summary: `Associou "${disc.name}" ao ativo "${asset.name}" (passa a ser verificado pela integração)`, before: null, after: { provider: disc.provider } })
          return { ...s, discoveries: s.discoveries.map((x) => (x.id === id ? { ...x, status: 'associado' as const, resolvedAssetId: asset.id } : x)), audit: [...s.audit, entry] }
        }
        const asset = { id: newId('ast'), organizationId: org, name: disc.name, type: disc.type, criticalServiceId: d.criticalServiceId, ownerId: u.id, criticality: d.criticality, source: 'integracao' as const, location: provider(disc.provider).name, createdBy: u.id, createdAt: stamp, updatedAt: stamp }
        const entry = auditEntry({ organizationId: org, userId: u.id, action: 'create', entityType: 'asset', entityId: asset.id, summary: `Acrescentou o ativo "${asset.name}" sugerido por ${provider(disc.provider).name}`, before: null, after: { criticality: asset.criticality } })
        return { ...s, assets: [...s.assets, asset], discoveries: s.discoveries.map((x) => (x.id === id ? { ...x, status: 'aceite' as const, resolvedAssetId: asset.id } : x)), audit: [...s.audit, entry] }
      })
      return getState().discoveries.find((x) => x.id === id)!
    }),

    listEvidence: () => simulate(() => (me().role === 'analista' ? [] : getState().evidence)),
  }
}
