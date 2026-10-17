import { ApiError, type DemoActor, type Organization, type OrganizationApi, type User } from '../contracts'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
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
      const load = activeClients(s, consultant)
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

      setState((st) => ({
        ...st,
        users: [...st.users, user],
        organizations: [...st.organizations, organization],
        roadmap: { ...st.roadmap, [orgId]: { validated: false, validatedAt: null, validatedBy: null, assessmentCompletedAt: null } },
        audit: [...st.audit, entry, auditEntry({ organizationId: orgId, userId: null, actorType: 'system', action: 'assign', entityType: 'organization', entityId: orgId, summary: `Atribuiu a organização a ${consultant.name}, a consultora com menos clientes ativos (${load})`, before: null, after: { consultantId: consultant.id } })],
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
