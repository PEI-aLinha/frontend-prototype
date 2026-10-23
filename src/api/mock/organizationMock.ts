import { ApiError, type DemoActor, type InviteDetails, type Organization, type OrganizationApi, type Task, type TeamMember, type User } from '../contracts'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'
import { shortDayPt } from './dates'
import { ORG_ID, PEDRO, RUI, type ConsultantRecord, type DemoState } from './seed'
import { isValidEmail } from '../../config/email'

const LEGAL_FORM = /(?:^|[\s,])(?:lda\.?|s\.?\s?a\.?|unipessoal|sociedade anónima)$/i

/** "Componentes Águeda, Lda." → "Componentes Águeda" (string ops instead of a backtracking-prone regex). */
function stripLegalForm(name: string): string {
  const trimmed = name.trim()
  const match = LEGAL_FORM.exec(trimmed)
  if (!match) return trimmed
  const base = trimmed.slice(0, match.index).trimEnd()
  return base.endsWith(',') ? base.slice(0, -1) : base
}

/** "Componentes Águeda, Lda." → "componentes-agueda" */
export function slugify(name: string): string {
  return stripLegalForm(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(?:^-)|(?:-$)/g, '')
}

/** Active clients of a consultant: the organizations in the portfolio assigned to them, plus those outside the prototype. */
export function activeClients(s: Readonly<DemoState>, c: ConsultantRecord): number {
  return s.portfolio.filter((p) => p.organization.consultantId === c.id).length + c.otherActiveClients
}

/** RF04: the new organization goes to the consultant with the fewest active clients (first one on a tie). */
export function pickConsultant(s: Readonly<DemoState>): ConsultantRecord {
  const [first, ...rest] = s.consultants
  if (!first) throw new ApiError('Não há consultores disponíveis.', 503)
  return rest.reduce((best, c) => (activeClients(s, c) < activeClients(s, best) ? c : best), first)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase()
}

/** Organization plugin (US10). In the real API the account is created in Keycloak and the request is anonymous. */
export function createOrganizationMock(getActor: () => DemoActor): OrganizationApi {
  /** RNF03: the actor must be an active member of this organization, with the given role. */
  function requireMember(org: string, role: User['role'], message: string) {
    const s = getState()
    const organization = s.organizations.find((o) => o.id === org)
    if (!organization) throw new ApiError('Organização não encontrada', 404)
    const me = s.users.find((u) => u.id === getActor().userId)
    const member = me && s.members.some((m) => m.organizationId === org && m.userId === me.id && m.status === 'ativo' && m.role === role)
    if (!me || me.role !== role || !member) throw new ApiError(message, 403)
    return { me, organization }
  }

  /** Only the designated manager of the organization manages its team. */
  const manager = (org: string) => requireMember(org, 'responsavel', 'Só o Responsável designado pode gerir a equipa.')


  function pendingInvite(org: string, memberId: string): TeamMember {
    const m = getState().members.find((x) => x.id === memberId && x.organizationId === org)
    if (!m || m.status !== 'convite_pendente') throw new ApiError('Este convite já não está pendente.', 404)
    return m
  }

  function openInvite(token: string): InviteDetails {
    const s = getState()
    const m = s.members.find((x) => x.id === token)
    if (!m || m.status !== 'convite_pendente' || !m.invitedAt) throw new ApiError('Este convite já foi usado ou foi cancelado. Peça um novo ao Responsável designado.', 410)
    const days = (Date.parse(s.today) - Date.parse(m.invitedAt.slice(0, 10))) / 86_400_000
    if (days > 7) throw new ApiError('Este convite expirou. Peça ao Responsável designado para o reenviar.', 410)
    const org = s.organizations.find((o) => o.id === m.organizationId)
    const inviter = s.users.find((u) => u.id === m.invitedBy)
    return { memberId: m.id, name: m.name, email: m.email, organizationName: org?.name ?? '', invitedByName: inviter?.name ?? 'O Responsável designado', invitedAt: m.invitedAt }
  }

  return {
    isEmailAvailable: (email) => simulate(() => !getState().users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())),

    register: (input) => simulate(() => {
      const s = getState()
      const email = input.account.email.trim().toLowerCase()
      const nif = input.organization.nif.replace(/\D/g, '')
      if (s.users.some((u) => u.email.toLowerCase() === email)) throw new ApiError('Já existe uma conta com este email.', 409)
      if (s.organizations.some((o) => o.profile?.nif === nif)) throw new ApiError('Já existe uma organização registada com este NIF.', 409)
      if (nif.length !== 9) throw new ApiError('O NIF tem de ter 9 dígitos.', 422)

      // The demo persona "Rui Santos" is the designated manager who registers the company.
      const userId = s.users.some((u) => u.id === RUI) ? newId('u') : RUI
      const orgId = s.organizations.some((o) => o.id === ORG_ID) ? newId('org') : ORG_ID
      let slug = slugify(input.organization.name) || orgId
      if (s.organizations.some((o) => o.slug === slug)) slug = `${slug}-${orgId.slice(-4)}`

      const { name, ...profile } = input.organization
      const at = now()
      const consultant = pickConsultant(s)
      const user: User = { id: userId, name: input.account.name.trim(), initials: initials(input.account.name), role: 'responsavel', organizationId: orgId, title: 'Responsável designado', email }
      const organization: Organization = {
        id: orgId,
        slug,
        name: name.trim(),
        description: `${profile.services.trim()} · ${profile.employees} trabalhadores`,
        classification: '',
        frameworks: [],
        consultantId: consultant.id,
        consultantAssignedAt: at,
        profile: { ...profile, nif },
        registeredBy: userId,
        registeredAt: at,
      }
      const entry = auditEntry({ organizationId: orgId, userId, action: 'create', entityType: 'organization', entityId: orgId, summary: `Registou a organização "${organization.name}" e ficou como Responsável designado`, before: null, after: { nif, sector: profile.sector } })

      setState((st) => notify({
        ...st,
        members: [...st.members, { id: newId('mbr'), organizationId: orgId, userId, name: user.name, email, role: 'responsavel', status: 'ativo', invitedAt: null, invitedBy: null, joinedAt: at }],
        portfolio: [{
          organization, sector: '', employees: profile.employees, stage: 'Registo concluído', stageTone: 'neutral',
          nextStep: 'Dar as boas-vindas e acompanhar o âmbito regulatório', updatedAt: at, isNew: true,
        }, ...st.portfolio],
        users: [...st.users, user],
        organizations: [...st.organizations, organization],
        roadmap: { ...st.roadmap, [orgId]: { validated: false, validatedAt: null, validatedBy: null, assessmentCompletedAt: null } },
        audit: [...st.audit, entry, auditEntry({ organizationId: orgId, userId: null, actorType: 'system', action: 'assign', entityType: 'organization', entityId: orgId, summary: `Atribuiu a organização a ${consultant.name}`, before: null, after: { consultantId: consultant.id } })],
      }, {
        organizationId: orgId, userId: consultant.id, kind: 'avaliacao', title: `Novo cliente: ${organization.name}`,
        body: `Concluiu o registo. ${profile.employees} trabalhadores.`, link: `/clientes/${slug}/visao-geral`,
      }))
      return organization
    }),

    saveScope: (org, input) => simulate(() => {
      const { me, organization: current } = requireMember(org, 'responsavel', 'Só o Responsável designado pode responder a estas perguntas.')
      const scope = { ...input, aiUses: input.usesAi === 'sim' ? input.aiUses : [], answeredBy: me.id, answeredAt: now() }
      const updated: Organization = { ...current, scope }
      const entry = auditEntry({ organizationId: org, userId: me.id, action: current.scope ? 'update' : 'create', entityType: 'organization', entityId: org, summary: current.scope ? 'Atualizou as respostas sobre dados pessoais e IA' : 'Respondeu às perguntas sobre dados pessoais e IA', before: current.scope ? { ...current.scope } : null, after: { ...input } })
      setState((st) => ({ ...st, organizations: st.organizations.map((o) => (o.id === org ? updated : o)), audit: [...st.audit, entry] }))
      return updated
    }),

    listMembers: (org) => simulate(() => {
      const s = getState()
      const me = s.users.find((u) => u.id === getActor().userId)
      const o = s.organizations.find((x) => x.id === org)
      if (!o) throw new ApiError('Organização não encontrada', 404)
      // The designated manager manages the team; the consultant of the organization can see it.
      const isManager = me?.role === 'responsavel' && s.members.some((m) => m.organizationId === org && m.userId === me.id && m.status === 'ativo')
      const isConsultant = me?.role === 'consultor' && o.consultantId === me.id
      if (!isManager && !isConsultant) throw new ApiError('Não tem permissão para ver a equipa.', 403)
      const order = (m: TeamMember) => (m.role === 'responsavel' ? 0 : m.status === 'ativo' ? 1 : 2)
      return s.members.filter((m) => m.organizationId === org).sort((a, b) => order(a) - order(b))
    }),

    inviteAnalyst: (org, input) => simulate(() => {
      const { me } = manager(org)
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      if (!name || !isValidEmail(email)) throw new ApiError('Indique o nome e um email válido.', 422)
      const existing = getState().members.find((m) => m.organizationId === org && m.email.toLowerCase() === email)
      if (existing) throw new ApiError(existing.status === 'ativo' ? 'Esta pessoa já faz parte da equipa.' : 'Já existe um convite pendente para este email. Pode reenviá-lo na lista.', 409)
      const member: TeamMember = { id: newId('mbr'), organizationId: org, userId: null, name, email, role: 'analista', status: 'convite_pendente', invitedAt: now(), invitedBy: me.id, joinedAt: null }
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'invite', entityType: 'member', entityId: member.id, summary: `Convidou ${name} (${email}) como analista`, before: null, after: { email } })
      setState((st) => ({ ...st, members: [...st.members, member], audit: [...st.audit, entry] }))
      return member
    }),

    resendInvite: (org, memberId) => simulate(() => {
      const { me } = manager(org)
      const m = pendingInvite(org, memberId)
      const updated = { ...m, invitedAt: now() }
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'resend', entityType: 'member', entityId: m.id, summary: `Reenviou o convite a ${m.name}`, before: null, after: null })
      setState((st) => ({ ...st, members: st.members.map((x) => (x.id === m.id ? updated : x)), audit: [...st.audit, entry] }))
      return updated
    }),

    cancelInvite: (org, memberId) => simulate(() => {
      const { me } = manager(org)
      const m = pendingInvite(org, memberId)
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'cancel', entityType: 'member', entityId: m.id, summary: `Cancelou o convite a ${m.name}`, before: { email: m.email }, after: null })
      setState((st) => ({ ...st, members: st.members.filter((x) => x.id !== m.id), audit: [...st.audit, entry] }))
    }),

    assignWork: (org, input) => simulate(() => {
      const { me } = manager(org)
      const s = getState()
      const o = s.organizations.find((x) => x.id === org)!
      const member = s.members.find((m) => m.organizationId === org && m.userId === input.assigneeId && m.status === 'ativo' && m.role === 'analista')
      if (!member) throw new ApiError('Escolha um analista ativo da equipa.', 422)
      const title = input.title.trim()
      if (title.length < 3) throw new ApiError('Diga ao analista o que tem de fazer.', 422)
      if (input.dueDate && input.dueDate < s.today) throw new ApiError('O prazo não pode ser no passado.', 422)
      // One pending asset-registration task per analyst (also created from the inventory), any other task by its title.
      const same = (t: Task) => (input.kind === 'ativos' ? t.kind === 'ativos' : t.title === title)
      if (s.tasks.some((t) => t.organizationId === org && t.assigneeId === member.userId && t.status === 'pendente' && same(t))) {
        throw new ApiError(`${member.name} já tem esta tarefa por fazer.`, 409)
      }
      const task: Task = {
        id: newId('task'), organizationId: org, kind: input.kind, title, context: input.context, assigneeId: member.userId!, assignedBy: me.id,
        dueDate: input.dueDate, status: 'pendente', createdAt: now(),
        ...(input.kind === 'ativos' ? { scope: 'Servidores, rede e sistemas de produção', expectedCount: 4 } : {}),
      }
      const KIND = { pergunta: 'a pergunta técnica', evidencia: 'a evidência', ativos: 'o registo dos ativos técnicos', tarefa: 'a tarefa' } as const
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'assign', entityType: 'task', entityId: task.id, summary: `Atribuiu a ${member.name} ${KIND[input.kind]} "${title}"`, before: null, after: { assigneeId: member.userId, dueDate: input.dueDate } })
      const link = input.kind === 'ativos' ? `/org/${o.slug}/tarefas/${task.id}/ativos` : `/org/${o.slug}/tarefas`
      setState((st) => notify({ ...st, tasks: [...st.tasks, task], audit: [...st.audit, entry] }, {
        organizationId: org, userId: member.userId!, kind: 'tarefa', title: `Nova tarefa de ${me.name}`,
        body: `${title}${input.dueDate ? ` · até ${shortDayPt(input.dueDate)}` : ' · sem prazo'}`, link,
      }))
      return task
    }),

    removeMember: (org, memberId) => simulate(() => {
      const { me } = manager(org)
      const m = getState().members.find((x) => x.id === memberId && x.organizationId === org)
      if (!m || m.status !== 'ativo') throw new ApiError('Membro não encontrado.', 404)
      if (m.role !== 'analista') throw new ApiError('Só é possível remover analistas.', 422)
      const cancelled = getState().tasks.filter((t) => t.organizationId === org && t.assigneeId === m.userId && t.status === 'pendente').length
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'remove', entityType: 'member', entityId: m.id, summary: `Removeu ${m.name} da equipa${cancelled ? ` (${cancelled} ${cancelled === 1 ? 'tarefa cancelada' : 'tarefas canceladas'})` : ''}`, before: { email: m.email }, after: null })
      setState((st) => ({
        ...st,
        members: st.members.filter((x) => x.id !== m.id),
        tasks: st.tasks.map((t) => (t.organizationId === org && t.assigneeId === m.userId && t.status === 'pendente' ? { ...t, status: 'cancelada' } : t)),
        audit: [...st.audit, entry],
      }))
    }),

    getInvite: (token) => simulate(() => openInvite(token)),

    acceptInvite: (token) => simulate(() => {
      const inv = openInvite(token)
      const s = getState()
      const m = s.members.find((x) => x.id === token)!
      const org = s.organizations.find((o) => o.id === m.organizationId)!
      // The demo persona "Pedro Almeida" is the analyst invited by Rui; anyone else gets a new account.
      const existing = s.users.find((u) => u.email.toLowerCase() === m.email.toLowerCase())
      const userId = existing?.id ?? (m.email === 'pedro.almeida@tiagueda.pt' && !s.users.some((u) => u.id === PEDRO) ? PEDRO : newId('u'))
      const user: User = existing ?? { id: userId, name: m.name, initials: initials(m.name), role: 'analista', organizationId: org.id, title: 'Analista', email: m.email }
      const at = now()
      const entry = auditEntry({ organizationId: org.id, userId, action: 'accept', entityType: 'member', entityId: m.id, summary: `${m.name} aceitou o convite e entrou na equipa como analista`, before: null, after: { email: m.email } })
      setState((st) => notify({
        ...st,
        users: existing ? st.users : [...st.users, user],
        members: st.members.map((x) => (x.id === m.id ? { ...x, userId, status: 'ativo', joinedAt: at } : x)),
        audit: [...st.audit, entry],
      }, ...(m.invitedBy ? [{ organizationId: org.id, userId: m.invitedBy, kind: 'tarefa' as const, title: `${inv.name} aceitou o convite`, body: 'Já pode atribuir-lhe perguntas técnicas, evidências ou tarefas.', link: `/org/${org.slug}/equipa` }] : [])))
      return { user, organizationSlug: org.slug }
    }),

    getConsultant: (org) => simulate(() => {
      const s = getState()
      const o = s.organizations.find((x) => x.id === org)
      if (!o) throw new ApiError('Organização não encontrada', 404)
      const meId = getActor().userId
      const insider = o.consultantId === meId || s.members.some((m) => m.organizationId === org && m.userId === meId && m.status === 'ativo')
      if (!insider) throw new ApiError('Não tem acesso a esta organização.', 403)
      const c = s.consultants.find((x) => x.id === o.consultantId)
      if (!c) return null
      const { otherActiveClients: _ignored, ...consultant } = c
      void _ignored
      return consultant
    }),

    registerQualification: (org, input) => simulate(() => {
      const s = getState()
      const { me, organization: current } = requireMember(org, 'responsavel', 'Só o Responsável designado pode registar a qualificação oficial.')
      if (!/\.pdf$/i.test(input.document.name)) throw new ApiError('O Ato de Qualificação tem de ser um ficheiro PDF.', 422)
      if (input.date > s.today) throw new ApiError('A data do Ato de Qualificação não pode ser no futuro.', 422)
      const officialQualification = { ...input, registeredBy: me.id, registeredAt: now() }
      const updated: Organization = { ...current, officialQualification }
      const label = input.classification === 'essencial' ? 'Entidade essencial' : 'Entidade importante'
      const entry = auditEntry({ organizationId: org, userId: me.id, action: current.officialQualification ? 'update' : 'create', entityType: 'organization', entityId: org, summary: `Registou a qualificação oficial do CNCS: ${label}`, before: current.officialQualification ? { classification: current.officialQualification.classification } : null, after: { classification: input.classification, date: input.date, document: input.document.name } })
      setState((st) => ({ ...st, organizations: st.organizations.map((o) => (o.id === org ? updated : o)), audit: [...st.audit, entry] }))
      return updated
    }),
  }
}
