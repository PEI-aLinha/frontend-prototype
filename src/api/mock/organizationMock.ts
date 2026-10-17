import { ApiError, type DemoActor, type Organization, type OrganizationApi, type TeamMember, type User } from '../contracts'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'
import { ORG_ID, RUI, type ConsultantRecord, type DemoState } from './seed'

const LEGAL_FORM = /,?\s*(lda\.?|s\.?\s?a\.?|unipessoal|sociedade anónima)\s*$/i

/** "Componentes Águeda, Lda." → "componentes-agueda" */
export function slugify(name: string): string {
  return name
    .replace(LEGAL_FORM, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Active clients of a consultant: the organizations in the portfolio assigned to them, plus those outside the prototype. */
export function activeClients(s: Readonly<DemoState>, c: ConsultantRecord): number {
  return s.portfolio.filter((p) => p.organization.consultantId === c.id).length + c.otherActiveClients
}

/** RF04: the new organization goes to the consultant with the fewest active clients (first one on a tie). */
export function pickConsultant(s: Readonly<DemoState>): ConsultantRecord {
  return s.consultants.reduce((best, c) => (activeClients(s, c) < activeClients(s, best) ? c : best))
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase()
}

/** Organization plugin (US10). In the real API the account is created in Keycloak and the request is anonymous. */
export function createOrganizationMock(getActor: () => DemoActor): OrganizationApi {
  /** Only the designated manager of the organization manages its team. */
  function manager(org: string) {
    const s = getState()
    if (!s.organizations.some((o) => o.id === org)) throw new ApiError('Organização não encontrada', 404)
    const me = s.users.find((u) => u.id === getActor().userId)
    if (me?.role !== 'responsavel') throw new ApiError('Só o Responsável designado pode gerir a equipa.', 403)
    return { me }
  }
  
  function pendingInvite(org: string, memberId: string): TeamMember {
    const m = getState().members.find((x) => x.id === memberId && x.organizationId === org)
    if (!m || m.status !== 'convite_pendente') throw new ApiError('Este convite já não está pendente.', 404)
    return m
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
      const user: User = { id: userId, name: input.account.name.trim(), initials: initials(input.account.name), role: 'responsavel', title: 'Responsável designado', email }
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
      const s = getState()
      const me = s.users.find((u) => u.id === getActor().userId)
      const current = s.organizations.find((o) => o.id === org)
      if (!current) throw new ApiError('Organização não encontrada', 404)
      if (me?.role !== 'responsavel') throw new ApiError('Só o Responsável designado pode responder a estas perguntas.', 403)
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
      if (me?.role === 'analista' || (me?.role === 'consultor' && o.consultantId !== me.id) || !me) throw new ApiError('Não tem permissão para ver a equipa.', 403)
      const order = (m: TeamMember) => (m.role === 'responsavel' ? 0 : m.status === 'ativo' ? 1 : 2)
      return s.members.filter((m) => m.organizationId === org).sort((a, b) => order(a) - order(b))
    }),

    inviteAnalyst: (org, input) => simulate(() => {
      const { me } = manager(org)
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Indique o nome e um email válido.', 422)
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

    getConsultant: (org) => simulate(() => {
      const s = getState()
      const o = s.organizations.find((x) => x.id === org)
      if (!o) throw new ApiError('Organização não encontrada', 404)
      const c = s.consultants.find((x) => x.id === o.consultantId)
      if (!c) return null
      const { otherActiveClients: _ignored, ...consultant } = c
      void _ignored
      return consultant
    }),

    registerQualification: (org, input) => simulate(() => {
      const s = getState()
      const me = s.users.find((u) => u.id === getActor().userId)
      const current = s.organizations.find((o) => o.id === org)
      if (!current) throw new ApiError('Organização não encontrada', 404)
      if (me?.role !== 'responsavel') throw new ApiError('Só o Responsável designado pode registar a qualificação oficial.', 403)
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
