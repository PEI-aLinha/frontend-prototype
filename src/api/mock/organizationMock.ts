import { ApiError, type Organization, type OrganizationApi, type User } from '../contracts'
import { auditEntry, getState, newId, now, setState, simulate } from './store'
import { ORG_ID, RUI } from './seed'

const LEGAL_FORM = /,?\s*(lda\.?|s\.?\s?a\.?|unipessoal|sociedade anónima)\s*$/i

/** "Componentes Águeda, Lda." → "componentes-agueda" */
export function slugify(name: string): string {
  return name
    .replace(LEGAL_FORM, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase()
}

/** Organization plugin (US10). In the real API the account is created in Keycloak and the request is anonymous. */
export function createOrganizationMock(): OrganizationApi {
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
      const user: User = { id: userId, name: input.account.name.trim(), initials: initials(input.account.name), role: 'responsavel', title: 'Responsável designado', email }
      const organization: Organization = {
        id: orgId,
        slug,
        name: name.trim(),
        description: `${profile.services.trim()} · ${profile.employees} trabalhadores`,
        classification: '',
        frameworks: [],
        consultantId: null,
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
        audit: [...st.audit, entry],
      }))
      return organization
    }),
  }
}
