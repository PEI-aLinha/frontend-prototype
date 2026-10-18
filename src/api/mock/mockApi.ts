import {
  ApiError, type Api, type Asset, type AssetInput, type AuditEntry, type CriticalService, type DemoActor,
  type Id, type RemediationAction, type Risk, type RiskInput, type Task, type User,
} from '../contracts'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'
import { shortDayPt } from './dates'
import { createIntegrationsMock } from './integrationsMock'
import { createOrganizationMock } from './organizationMock'
import { createAssessmentMock } from './assessmentMock'
import { createChatMock } from './chatMock'
import type { DemoState } from './seed'

/** Who is making the request. In the real API it comes from the token (Keycloak). */
export type ActorProvider = () => DemoActor

function user(s: Readonly<DemoState>, id: Id): User {
  const u = s.users.find((x) => x.id === id)
  if (!u) throw new ApiError('Utilizador desconhecido', 401)
  return u
}

function requireOrg(s: Readonly<DemoState>, org: Id): void {
  if (!s.organizations.some((o) => o.id === org)) throw new ApiError('Organização não encontrada', 404)
}

/** The designated manager of the organization (its active member with that role). */
function designatedManager(s: Readonly<DemoState>, org: Id): User | undefined {
  const m = s.members.find((x) => x.organizationId === org && x.role === 'responsavel' && x.status === 'ativo')
  return s.users.find((u) => u.id === m?.userId)
}

/** Base path of the organization's client area, e.g. "/org/componentes-agueda". */
function orgPath(s: Readonly<DemoState>, org: Id): string {
  return `/org/${s.organizations.find((o) => o.id === org)?.slug ?? org}`
}

function deny(): never {
  throw new ApiError('Não tem permissão para esta ação.', 403)
}

/** Assets visible to the actor: the analyst only sees those of their task (RF06/US27). */
function visibleAssets(s: Readonly<DemoState>, org: Id, actor: User): Asset[] {
  const all = s.assets.filter((a) => a.organizationId === org)
  if (actor.role !== 'analista') return all
  const myTasks = new Set(s.tasks.filter((t) => t.assigneeId === actor.id && t.kind === 'ativos').map((t) => t.id))
  return all.filter((a) => a.taskId !== undefined && myTasks.has(a.taskId))
}

function clientCanSeeRisks(s: Readonly<DemoState>, org: Id): boolean {
  return !!s.roadmap[org]?.validated
}

function pickAsset(a: Asset): Record<string, unknown> {
  return { name: a.name, type: a.type, criticalServiceId: a.criticalServiceId, ownerId: a.ownerId, criticality: a.criticality, location: a.location ?? null, dependsOn: a.dependsOn ?? [] }
}

function pickRisk(r: Risk): Record<string, unknown> {
  return { threat: r.threat, probability: r.probability, impact: r.impact, treatment: r.treatment, status: r.status, assetId: r.assetId }
}

function validateAsset(input: AssetInput): void {
  if (!input.name.trim()) throw new ApiError('Indique o nome do ativo.', 422)
}

function validateRisk(input: RiskInput): void {
  if (!input.threat.trim()) throw new ApiError('Indique a ameaça.', 422)
  if (input.treatment === 'mitigar' && input.actionIds.length === 0) throw new ApiError('Para mitigar, ligue pelo menos uma ação do roadmap.', 422)
  if (input.treatment === 'aceitar' && !input.acceptanceJustification?.trim()) throw new ApiError('Para aceitar o risco, escreva uma justificação.', 422)
}

function riskStatus(input: RiskInput): Risk['status'] {
  if (!input.treatment) return 'por_tratar'
  if (input.treatment === 'aceitar') return 'aceite'
  return 'em_tratamento'
}

export function createMockApi(getActor: ActorProvider): Api {
  const actor = () => user(getState(), getActor().userId)
  const write = (mutate: (s: DemoState, me: User) => DemoState) => setState((s) => mutate(s, user(s, getActor().userId)))

  return {
    chat: createChatMock(getActor),
    organization: createOrganizationMock(getActor),
    integrations: createIntegrationsMock(getActor),

    directory: {
      getOrganization: (slug) => simulate(() => {
        const o = getState().organizations.find((x) => x.slug === slug || x.id === slug)
        if (!o) throw new ApiError('Organização não encontrada', 404)
        const me = getState().users.find((u) => u.id === getActor().userId)
        if (me?.role === 'consultor' && o.consultantId !== me.id) throw new ApiError('Esta organização não está atribuída a si.', 403)
        if (me?.role !== 'consultor' && !getState().members.some((m) => m.organizationId === o.id && m.userId === me?.id && m.status === 'ativo')) {
          throw new ApiError(me?.role === 'analista' ? 'Já não tem acesso a esta organização. Fale com o Responsável designado.' : 'Não tem acesso a esta organização.', 403)
        }
        return o
      }),
      listUsers: (org) => simulate(() => {
        requireOrg(getState(), org)
        return getState().users
      }),
      getToday: () => simulate(() => getState().today),
    },

    notifications: {
      list: () => simulate(() => getState().notifications.filter((n) => n.userId === getActor().userId)),
      markRead: (id) => simulate(() => {
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id && n.userId === getActor().userId ? { ...n, read: true } : n)) }))
      }),
      markAllRead: () => simulate(() => {
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.userId === getActor().userId ? { ...n, read: true } : n)) }))
      }),
    },

    audit: {
      list: (org, filter) => simulate(() => {
        const me = actor()
        if (me.role === 'analista') deny()
        return getState().audit
          .filter((e) => e.organizationId === org)
          .filter((e) => !filter?.entityId || e.entityId === filter.entityId)
          .filter((e) => !filter?.entityType || e.entityType === filter.entityType)
          .filter((e) => me.role !== 'responsavel' || clientCanSeeRisks(getState(), org) || (e.entityType !== 'risk' && e.entityType !== 'risk_action'))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),
    },

    assets: {
      listServices: (org) => simulate(() => getState().services.filter((s) => s.organizationId === org)),

      saveService: (org, input, id) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        if (!input.name.trim()) throw new ApiError('Indique o nome do serviço.', 422)
        let saved!: CriticalService
        write((s, me) => {
          const before = id ? s.services.find((x) => x.id === id) : undefined
          if (id && !before) throw new ApiError('Serviço não encontrado', 404)
          saved = { ...(before ?? { id: newId('svc'), organizationId: org }), ...input }
          const services = before ? s.services.map((x) => (x.id === id ? saved : x)) : [...s.services, saved]
          const entry = auditEntry({ organizationId: org, userId: me.id, action: before ? 'update' : 'create', entityType: 'critical_service', entityId: saved.id, summary: `${before ? 'Editou' : 'Criou'} o serviço crítico "${saved.name}"`, before: before ? { ...before } : null, after: { ...saved } })
          return { ...s, services, audit: [...s.audit, entry] }
        })
        return saved
      }),

      deleteService: (org, id) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        write((s, me) => {
          const svc = s.services.find((x) => x.id === id)
          if (!svc) throw new ApiError('Serviço não encontrado', 404)
          if (s.assets.some((a) => a.criticalServiceId === id)) throw new ApiError('Há ativos ligados a este serviço. Mude-os de serviço primeiro.', 409)
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'delete', entityType: 'critical_service', entityId: id, summary: `Removeu o serviço crítico "${svc.name}"`, before: { ...svc }, after: null })
          return { ...s, services: s.services.filter((x) => x.id !== id), audit: [...s.audit, entry] }
        })
      }),

      listAssets: (org) => simulate(() => visibleAssets(getState(), org, actor())),

      getAsset: (org, id) => simulate(() => {
        const a = visibleAssets(getState(), org, actor()).find((x) => x.id === id)
        if (!a) throw new ApiError('Ativo não encontrado', 404)
        return a
      }),

      saveAsset: (org, input, id) => simulate(() => {
        const me = actor()
        if (me.role === 'consultor') deny()
        validateAsset(input)
        if (me.role === 'analista') {
          const task = getState().tasks.find((t) => t.id === input.taskId && t.assigneeId === me.id)
          if (!task) deny()
          if (id && !visibleAssets(getState(), org, me).some((a) => a.id === id)) deny()
        }
        let saved!: Asset
        write((s) => {
          const before = id ? s.assets.find((x) => x.id === id) : undefined
          if (id && !before) throw new ApiError('Ativo não encontrado', 404)
          const stamp = now()
          saved = before
            ? { ...before, ...input, updatedAt: stamp }
            : { ...input, id: newId('ast'), organizationId: org, createdBy: me.id, createdAt: stamp, updatedAt: stamp }
          const assets = before ? s.assets.map((x) => (x.id === id ? saved : x)) : [...s.assets, saved]
          const entry = auditEntry({ organizationId: org, userId: me.id, action: before ? 'update' : 'create', entityType: 'asset', entityId: saved.id, summary: `${before ? 'Editou' : 'Registou'} o ativo "${saved.name}"`, before: before ? pickAsset(before) : null, after: pickAsset(saved) })
          return { ...s, assets, audit: [...s.audit, entry] }
        })
        return saved
      }),

      importAssets: (org, inputs) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        if (inputs.length === 0) throw new ApiError('O ficheiro não tem ativos válidos.', 422)
        inputs.forEach(validateAsset)
        let created: Asset[] = []
        write((s, me) => {
          const stamp = now()
          created = inputs.map((input) => ({ ...input, source: 'importacao' as const, id: newId('ast'), organizationId: org, createdBy: me.id, createdAt: stamp, updatedAt: stamp }))
          const entries = created.map((a) => auditEntry({ organizationId: org, userId: me.id, action: 'import', entityType: 'asset', entityId: a.id, summary: `Importou o ativo "${a.name}" de um ficheiro`, before: null, after: pickAsset(a) }))
          return { ...s, assets: [...s.assets, ...created], audit: [...s.audit, ...entries] }
        })
        return created
      }),

      bulkUpdateAssets: (org, ids, change) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        write((s, me) => {
          const stamp = now()
          const entries: AuditEntry[] = []
          const assets = s.assets.map((a) => {
            if (!ids.includes(a.id)) return a
            const next = { ...a, ...change, updatedAt: stamp }
            entries.push(auditEntry({ organizationId: org, userId: me.id, action: 'update', entityType: 'asset', entityId: a.id, summary: `Editou o ativo "${a.name}" (alteração em massa)`, before: pickAsset(a), after: pickAsset(next) }))
            return next
          })
          return { ...s, assets, audit: [...s.audit, ...entries] }
        })
      }),

      bulkDeleteAssets: (org, ids) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        write((s, me) => {
          const removed = s.assets.filter((a) => ids.includes(a.id))
          const entries = removed.map((a) => auditEntry({ organizationId: org, userId: me.id, action: 'delete', entityType: 'asset', entityId: a.id, summary: `Removeu o ativo "${a.name}"`, before: pickAsset(a), after: null }))
          return {
            ...s,
            assets: s.assets.filter((a) => !ids.includes(a.id)).map((a) => ({ ...a, dependsOn: a.dependsOn?.filter((d) => !ids.includes(d)) })),
            risks: s.risks.map((r) => (r.assetId && ids.includes(r.assetId) ? { ...r, assetId: null } : r)),
            audit: [...s.audit, ...entries],
          }
        })
      }),

      deleteAsset: (org, id) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        write((s, me) => {
          const a = s.assets.find((x) => x.id === id)
          if (!a) throw new ApiError('Ativo não encontrado', 404)
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'delete', entityType: 'asset', entityId: id, summary: `Removeu o ativo "${a.name}"`, before: pickAsset(a), after: null })
          return {
            ...s,
            assets: s.assets.filter((x) => x.id !== id).map((x) => ({ ...x, dependsOn: x.dependsOn?.filter((d) => d !== id) })),
            risks: s.risks.map((r) => (r.assetId === id ? { ...r, assetId: null } : r)),
            audit: [...s.audit, entry],
          }
        })
      }),

      listTasks: (org) => simulate(() => {
        const me = actor()
        const tasks = getState().tasks.filter((t) => t.organizationId === org)
        return me.role === 'analista' ? tasks.filter((t) => t.assigneeId === me.id) : tasks
      }),

      assignTask: (org, input) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        if (!input.title.trim()) throw new ApiError('Indique o que registar.', 422)
        if (!input.dueDate) throw new ApiError('Indique o prazo.', 422)
        let task!: Task
        write((s, me) => {
          const assignee = user(s, input.assigneeId)
          const existing = s.tasks.find((t) => t.kind === 'ativos' && t.assigneeId === assignee.id && t.status === 'pendente')
          task = {
            id: existing?.id ?? 'task-ativos', organizationId: org, kind: 'ativos', title: `Registar ${input.title.charAt(0).toLowerCase()}${input.title.slice(1)}`, scope: input.title, context: 'Inventário de ativos',
            assigneeId: assignee.id, assignedBy: me.id, dueDate: input.dueDate, status: 'pendente', expectedCount: 4, createdAt: now(),
          }
          const tasks = [...s.tasks.filter((t) => t.id !== task.id), task]
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'assign', entityType: 'task', entityId: task.id, summary: `Atribuiu ao ${assignee.name} o registo de ${input.title.toLowerCase()}`, before: null, after: { assigneeId: assignee.id, dueDate: input.dueDate } })
          return notify({ ...s, tasks, audit: [...s.audit, entry] }, {
            organizationId: org, userId: assignee.id, kind: 'tarefa', title: 'Nova tarefa: registar ativos',
            body: `${me.name} pediu-lhe: ${input.title}${input.dueDate ? ` · até ${shortDayPt(input.dueDate)}` : ''}`, link: `${orgPath(s, org)}/tarefas/${task.id}/ativos`,
          })
        })
        return task
      }),

      completeTask: (org, id) => simulate(() => {
        let task!: Task
        write((s, me) => {
          const t = s.tasks.find((x) => x.id === id)
          if (!t) throw new ApiError('Tarefa não encontrada', 404)
          if (me.role === 'analista' && t.assigneeId !== me.id) deny()
          task = { ...t, status: 'concluida' }
          const count = s.assets.filter((a) => a.taskId === id).length
          const isAssets = t.kind === 'ativos'
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'complete', entityType: 'task', entityId: id, summary: isAssets ? `Concluiu a tarefa de registo de ativos (${count} registados)` : `Concluiu a tarefa "${t.title}"`, before: { status: t.status }, after: { status: 'concluida' } })
          return notify({ ...s, tasks: s.tasks.map((x) => (x.id === id ? task : x)), audit: [...s.audit, entry] }, isAssets ? {
            organizationId: org, userId: t.assignedBy, kind: 'tarefa_concluida', title: `${me.name.split(' ')[0]} concluiu o registo de ativos`,
            body: `${count} ativos técnicos registados. Veja-os no inventário.`, link: `${orgPath(s, org)}/ativos`,
          } : {
            organizationId: org, userId: t.assignedBy, kind: 'tarefa_concluida', title: `${me.name.split(' ')[0]} concluiu uma tarefa`,
            body: t.title, link: `${orgPath(s, org)}/equipa`,
          })
        })
        return task
      }),

      updateTask: (org, id, change) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        let task!: Task
        write((s, me) => {
          const t = s.tasks.find((x) => x.id === id)
          if (!t) throw new ApiError('Tarefa não encontrada', 404)
          if (t.status !== 'pendente') throw new ApiError('Só pode alterar tarefas pendentes.', 409)
          if (change.dueDate && change.dueDate < s.today) throw new ApiError('O novo prazo não pode ser no passado.', 422)
          task = { ...t, ...change }
          const assignee = s.users.find((u) => u.id === t.assigneeId)
          const summary = change.status === 'cancelada' ? `Cancelou a tarefa "${t.title}"` : `Mudou o prazo da tarefa "${t.title}" para ${shortDayPt(change.dueDate!)}`
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'update', entityType: 'task', entityId: id, summary, before: { dueDate: t.dueDate, status: t.status }, after: { dueDate: task.dueDate, status: task.status } })
          const next = { ...s, tasks: s.tasks.map((x) => (x.id === id ? task : x)), audit: [...s.audit, entry] }
          return assignee ? notify(next, { organizationId: org, userId: assignee.id, kind: 'tarefa', title: change.status === 'cancelada' ? 'Tarefa cancelada' : 'Prazo alterado', body: change.status === 'cancelada' ? `${me.name} cancelou: ${t.title}.` : `${t.title} · novo prazo ${shortDayPt(change.dueDate!)}`, link: `${orgPath(s, org)}/tarefas` }) : next
        })
        return task
      }),

      remindTask: (org, id) => simulate(() => {
        if (actor().role !== 'responsavel') deny()
        write((s, me) => {
          const t = s.tasks.find((x) => x.id === id)
          if (!t || t.status !== 'pendente') throw new ApiError('Só pode lembrar tarefas pendentes.', 409)
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'remind', entityType: 'task', entityId: id, summary: `Enviou um lembrete da tarefa "${t.title}"`, before: null, after: null })
          return notify({ ...s, audit: [...s.audit, entry] }, { organizationId: org, userId: t.assigneeId, kind: 'lembrete', title: `Lembrete de ${me.name.split(' ')[0]}`, body: `${t.title}${t.dueDate ? ` · até ${shortDayPt(t.dueDate)}` : ''}`, link: t.kind === 'ativos' ? `${orgPath(s, org)}/tarefas/${t.id}/ativos` : `${orgPath(s, org)}/tarefas` })
        })
      }),

      listRisks: (org) => simulate(() => {
        const me = actor()
        if (me.role === 'analista') deny()
        if (me.role === 'responsavel' && !clientCanSeeRisks(getState(), org)) deny()
        return getState().risks.filter((r) => r.organizationId === org)
      }),

      getRisk: (org, id) => simulate(() => {
        const me = actor()
        if (me.role === 'analista' || (me.role === 'responsavel' && !clientCanSeeRisks(getState(), org))) deny()
        const r = getState().risks.find((x) => x.id === id && x.organizationId === org)
        if (!r) throw new ApiError('Risco não encontrado', 404)
        return r
      }),

      saveRisk: (org, input, id) => simulate(() => {
        if (actor().role !== 'consultor') deny()
        validateRisk(input)
        let saved!: Risk
        write((s, me) => {
          const before = id ? s.risks.find((x) => x.id === id) : undefined
          if (id && !before) throw new ApiError('Risco não encontrado', 404)
          const { actionIds, ...fields } = input
          const stamp = now()
          saved = before
            ? { ...before, ...fields, status: before.status === 'arquivado' || before.status === 'tratado' ? before.status : riskStatus(input), updatedAt: stamp }
            : { ...fields, id: newId('rsk'), organizationId: org, status: riskStatus(input), createdBy: me.id, createdAt: stamp, updatedAt: stamp }
          const risks = before ? s.risks.map((x) => (x.id === id ? saved : x)) : [...s.risks, saved]

          const previous = s.links.filter((l) => l.riskId === saved.id).map((l) => l.remediationActionId)
          const unknown = actionIds.filter((a) => !s.actions.some((x) => x.id === a))
          if (unknown.length) throw new ApiError('Ação do roadmap desconhecida.', 422)
          const links = [
            ...s.links.filter((l) => l.riskId !== saved.id),
            ...actionIds.map((a) => ({ id: newId('lnk'), riskId: saved.id, remediationActionId: a })),
          ]
          const entries: AuditEntry[] = [auditEntry({ organizationId: org, userId: me.id, action: before ? 'update' : 'create', entityType: 'risk', entityId: saved.id, summary: `${before ? 'Editou' : 'Registou'} o risco "${saved.threat}"`, before: before ? pickRisk(before) : null, after: pickRisk(saved) })]
          const changed = previous.length !== actionIds.length || previous.some((a) => !actionIds.includes(a))
          if (changed) {
            const names = actionIds.map((a) => s.actions.find((x) => x.id === a)?.description ?? a)
            entries.push(auditEntry({ organizationId: org, userId: me.id, action: 'link', entityType: 'risk_action', entityId: saved.id, summary: names.length ? `Ligou o risco a ${names.length} ${names.length === 1 ? 'ação' : 'ações'} do roadmap: ${names.join('; ')}` : 'Removeu as ligações a ações do roadmap', before: { actionIds: previous }, after: { actionIds } }))
          }
          return { ...s, risks, links, audit: [...s.audit, ...entries] }
        })
        return saved
      }),

      setRiskStatus: (org, id, change) => simulate(() => {
        if (actor().role !== 'consultor') deny()
        let saved!: Risk
        write((s, me) => {
          const r = s.risks.find((x) => x.id === id && x.organizationId === org)
          if (!r) throw new ApiError('Risco não encontrado', 404)
          if (change.status === 'tratado' && !r.treatment) throw new ApiError('Defina primeiro o tratamento do risco.', 409)
          if (change.status === 'arquivado' && change.reason.trim().length < 5) throw new ApiError('Explique porque arquiva o risco.', 422)
          const status: Risk['status'] = change.status === 'reaberto' ? (r.treatment === 'aceitar' ? 'aceite' : r.treatment ? 'em_tratamento' : 'por_tratar') : change.status
          saved = { ...r, status, archivedReason: change.status === 'arquivado' ? change.reason.trim() : undefined, updatedAt: now() }
          const verb = { tratado: 'Marcou como tratado', arquivado: 'Arquivou', reaberto: 'Reabriu' }[change.status]
          const entry = auditEntry({ organizationId: org, userId: me.id, action: change.status, entityType: 'risk', entityId: id, summary: `${verb} o risco "${r.threat}"${change.status === 'arquivado' ? `: ${change.reason.trim()}` : ''}`, before: { status: r.status }, after: { status } })
          return { ...s, risks: s.risks.map((x) => (x.id === id ? saved : x)), audit: [...s.audit, entry] }
        })
        return saved
      }),

      listRiskLinks: (org) => simulate(() => {
        const me = actor()
        if (me.role === 'analista') deny()
        if (me.role === 'responsavel' && !clientCanSeeRisks(getState(), org)) return []
        const ids = new Set(getState().risks.filter((r) => r.organizationId === org).map((r) => r.id))
        return getState().links.filter((l) => ids.has(l.riskId))
      }),

      listComments: (_org, assetId) => simulate(() => {
        if (actor().role === 'analista') return []
        return getState().comments.filter((c) => c.assetId === assetId)
      }),

      addComment: (org, assetId, body) => simulate(() => {
        if (actor().role !== 'consultor') deny()
        if (!body.trim()) throw new ApiError('Escreva o comentário.', 422)
        const comment = { id: newId('cmt'), assetId, authorId: getActor().userId, body: body.trim(), createdAt: now() }
        write((s, me) => {
          const a = s.assets.find((x) => x.id === assetId)
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'comment', entityType: 'comment', entityId: assetId, summary: `Comentou o ativo "${a?.name ?? assetId}"`, before: null, after: { body: comment.body } })
          const owner = designatedManager(s, org)
          const next = { ...s, comments: [...s.comments, comment], audit: [...s.audit, entry] }
          return owner ? notify(next, { organizationId: org, userId: owner.id, kind: 'comentario', title: `${me.name.split(' ')[0]} comentou um ativo`, body: `"${a?.name}": ${comment.body}`, link: `${orgPath(s, org)}/ativos?ativo=${assetId}` }) : next
        })
        return comment
      }),
    },

    assessment: {
      ...createAssessmentMock(getActor),

      listActions: (org) => simulate(() => {
        if (actor().role === 'analista') deny()
        return getState().actions.filter((a) => a.organizationId === org)
      }),

      proposeAction: (org, input) => simulate(() => {
        if (actor().role !== 'consultor') deny()
        if (!input.description.trim()) throw new ApiError('Descreva a ação.', 422)
        let created!: RemediationAction
        write((s, me) => {
          const max = Math.max(0, ...s.actions.filter((a) => a.organizationId === org).map((a) => a.priority))
          created = {
            id: newId('act'), organizationId: org, findingId: 'fnd-risco', description: input.description.trim(), priority: max + 1,
            dueDate: input.dueDate, assignedTo: null, requiredEvidence: input.requiredEvidence, status: 'por_iniciar', aiOutputId: null,
            legalObligation: input.legalObligation, findingTitle: 'Proposta a partir do registo de riscos', controlCode: '—', proposedBy: me.id,
          }
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'create', entityType: 'remediation_action', entityId: created.id, summary: `Propôs a ação "${created.description}" para o roadmap`, before: null, after: { description: created.description } })
          return { ...s, actions: [...s.actions, created], audit: [...s.audit, entry] }
        })
        return created
      }),

      getRoadmapStatus: (org) => simulate(() => {
        const st = getState().roadmap[org]
        if (!st) throw new ApiError('Organização não encontrada', 404)
        return st
      }),

      validateRoadmap: (org) => simulate(() => {
        if (actor().role !== 'consultor') deny()
        let status = getState().roadmap[org]
        write((s, me) => {
          status = { ...s.roadmap[org], validated: true, validatedAt: now(), validatedBy: me.id }
          const entry = auditEntry({ organizationId: org, userId: me.id, action: 'validate', entityType: 'roadmap', entityId: org, summary: 'Validou o roadmap', before: { validated: false }, after: { validated: true } })
          const portfolio = s.portfolio.map((p) => (p.organization.id === org ? { ...p, stage: 'Roadmap validado', stageTone: 'neutral' as const, nextStep: 'Acompanhar ações de risco alto' } : p))
          const owner = designatedManager(s, org)
          const next = { ...s, roadmap: { ...s.roadmap, [org]: status }, portfolio, audit: [...s.audit, entry] }
          return owner ? notify(next, { organizationId: org, userId: owner.id, kind: 'roadmap', title: 'Roadmap e riscos validados', body: `${me.name} validou o plano de ação. Já pode ver os riscos da empresa.`, link: `${orgPath(s, org)}/riscos` }) : next
        })
        return status
      }),

      listPortfolio: () => simulate(() => {
        const me = actor()
        if (me.role !== 'consultor') deny()
        // Each consultant only sees the organizations assigned to them.
        return getState().portfolio.filter((p) => p.organization.consultantId === me.id)
      }),
    },
  }
}

