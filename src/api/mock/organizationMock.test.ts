import { beforeEach, describe, expect, it } from 'vitest'
import type { RegistrationInput } from '../contracts'
import { createMockApi } from './mockApi'
import { getState, resetDemo } from './store'
import { MARTA, ORG_ID, PEDRO, RUI } from './seed'
import { activeClients, pickConsultant, slugify } from './organizationMock'

let who = RUI
const api = createMockApi(() => ({ userId: who }))

const input: RegistrationInput = {
  account: { name: 'Rui Santos', email: 'rui.santos@compagueda.pt' },
  organization: {
    name: 'Componentes Águeda, Lda.', nif: '509180027', cae: '29320', sector: 'industria', subsector: 'automoveis',
    services: 'Fabrico de componentes para a indústria automóvel', employees: 120, turnover: 18_500_000,
    address: { street: 'Rua da Zona Industrial do Casarão, 45', postalCode: '3750-750', city: 'Águeda' },
    contacts: { phone: '234600120', email: 'geral@compagueda.pt' },
    permanentContact: { name: 'Rui Santos', phone: '912345678' },
  },
}

describe('organization registration (US10)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c0')
  })

  it('registers the organization and associates it with the new account', async () => {
    const org = await api.organization.register(input)
    expect(org).toMatchObject({ id: ORG_ID, slug: 'componentes-agueda', registeredBy: RUI })
    expect(getState().users.find((u) => u.id === RUI)).toMatchObject({ role: 'responsavel', email: 'rui.santos@compagueda.pt' })
    expect(getState().audit.at(-2)).toMatchObject({ entityType: 'organization', userId: RUI })
    expect(await api.directory.getOrganization('componentes-agueda')).toMatchObject({ profile: { nif: '509180027' } })
  })

  it('refuses a NIF or an email that is already registered', async () => {
    await api.organization.register(input)
    await expect(api.organization.register({ ...input, account: { ...input.account, email: 'outro@compagueda.pt' } })).rejects.toMatchObject({ status: 409 })
    await expect(api.organization.register({ ...input, organization: { ...input.organization, nif: '123456789' } })).rejects.toMatchObject({ status: 409 })
  })

  it('builds the URL slug without the legal form', () => {
    expect(slugify('Componentes Águeda, Lda.')).toBe('componentes-agueda')
    expect(slugify('LogiCentro Armazéns, S.A.')).toBe('logicentro-armazens')
  })
})

describe('regulatory scope answers (US34)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })

  it('saves the answers and drops AI uses when the company does not use AI', async () => {
    const org = await api.organization.saveScope(ORG_ID, { employeeData: 'sim', customerData: 'so_empresas', usesAi: 'nao', aiUses: ['chatbot'] })
    expect(org.scope).toMatchObject({ customerData: 'so_empresas', usesAi: 'nao', aiUses: [], answeredBy: RUI })
  })

  it('only lets the designated manager answer', async () => {
    who = PEDRO
    await expect(api.organization.saveScope(ORG_ID, { employeeData: 'sim', customerData: 'sim', usesAi: 'nao', aiUses: [] })).rejects.toMatchObject({ status: 403 })
  })
})

describe('official NIS2 qualification (US11)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })
  const doc = { name: 'Ato-de-Qualificacao-CNCS.pdf', size: 248_000 }

  it('registers the classification, date and document', async () => {
    const org = await api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: doc })
    expect(org.officialQualification).toMatchObject({ classification: 'importante', date: '2026-10-12', registeredBy: RUI })
    expect(getState().audit.at(-1)?.summary).toContain('Entidade importante')
  })

  it('refuses a future date, a non-PDF file and other roles', async () => {
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2027-01-01', document: doc })).rejects.toMatchObject({ status: 422 })
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: { name: 'ato.docx', size: 1 } })).rejects.toMatchObject({ status: 422 })
    who = PEDRO
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: doc })).rejects.toMatchObject({ status: 403 })
  })
})

describe('automatic consultant assignment (US01)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c0')
    who = RUI
  })

  it('assigns the new organization to the consultant with fewest active clients', async () => {
    const s = getState()
    expect(s.consultants.map((c) => activeClients(s, c))).toEqual([11, 14])
    const org = await api.organization.register(input)
    expect(org.consultantId).toBe(MARTA)
    expect(getState().audit.at(-1)).toMatchObject({ actorType: 'system', action: 'assign' })
    expect(await api.organization.getConsultant(org.id)).toMatchObject({ name: 'Marta Ferreira', email: 'marta.ferreira@alinha.pt' })
  })

  it('puts the new organization in the consultant portfolio as a new client and notifies her', async () => {
    await api.organization.register(input)
    who = MARTA
    const [first] = await api.assessment.listPortfolio()
    expect(first).toMatchObject({ isNew: true, stage: 'Registo concluído', organization: { slug: 'componentes-agueda' } })
    expect((await api.notifications.list())[0].title).toBe('Novo cliente: Componentes Águeda, Lda.')
  })

  it('hides organizations assigned to another consultant', async () => {
    const s = getState()
    resetDemo('c0')
    // Make João the least busy: the new organization goes to him.
    const { setState } = await import('./store')
    setState((st) => ({ ...st, consultants: s.consultants.map((c) => (c.id === MARTA ? { ...c, otherActiveClients: 10 } : c)) }))
    await api.organization.register(input)
    who = MARTA
    expect((await api.assessment.listPortfolio()).some((p) => p.isNew)).toBe(false)
    await expect(api.directory.getOrganization('componentes-agueda')).rejects.toMatchObject({ status: 403 })
  })

  it('picks the other consultant when Marta has more clients', () => {
    const s = getState()
    const busy = { ...s, consultants: s.consultants.map((c) => (c.id === MARTA ? { ...c, otherActiveClients: 10 } : c)) }
    expect(pickConsultant(busy).name).toBe('João Pereira')
  })
})

describe('team members (US12)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })

  it('lists the designated manager first, then active analysts, then pending invitations', async () => {
    const members = await api.organization.listMembers(ORG_ID)
    expect(members.map((m) => [m.name, m.status])).toEqual([['Rui Santos', 'ativo'], ['Pedro Almeida', 'ativo'], ['Ana Costa', 'convite_pendente']])
  })

  it('invites, resends and cancels an invitation', async () => {
    const m = await api.organization.inviteAnalyst(ORG_ID, { name: 'Joana Reis', email: 'Joana.Reis@compagueda.pt' })
    expect(m).toMatchObject({ status: 'convite_pendente', email: 'joana.reis@compagueda.pt', role: 'analista' })
    await expect(api.organization.inviteAnalyst(ORG_ID, { name: 'Joana', email: 'joana.reis@compagueda.pt' })).rejects.toMatchObject({ status: 409 })
    await api.organization.resendInvite(ORG_ID, m.id)
    await api.organization.cancelInvite(ORG_ID, m.id)
    expect((await api.organization.listMembers(ORG_ID)).some((x) => x.id === m.id)).toBe(false)
  })

  it('removes an analyst: their pending tasks are cancelled and access ends', async () => {
    await api.organization.removeMember(ORG_ID, 'mbr-pedro')
    expect(getState().tasks.filter((t) => t.assigneeId === PEDRO && t.status === 'pendente')).toHaveLength(0)
    who = PEDRO
    await expect(api.directory.getOrganization('componentes-agueda')).rejects.toMatchObject({ status: 403 })
  })

  it('never removes the designated manager, who is the only one managing the team', async () => {
    await expect(api.organization.removeMember(ORG_ID, 'mbr-rui')).rejects.toMatchObject({ status: 422 })
    who = PEDRO
    await expect(api.organization.inviteAnalyst(ORG_ID, { name: 'X', email: 'x@y.pt' })).rejects.toMatchObject({ status: 403 })
  })

  it('does not show the team to analysts', async () => {
    who = PEDRO
    await expect(api.organization.listMembers(ORG_ID)).rejects.toMatchObject({ status: 403 })
  })
})

describe('accepting an invitation (US12)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })

  it('shows the invitation, creates the analyst account and activates the membership', async () => {
    expect(await api.organization.getInvite('mbr-ana')).toMatchObject({ name: 'Ana Costa', organizationName: 'Componentes Águeda, Lda.', invitedByName: 'Rui Santos' })
    const { user, organizationSlug } = await api.organization.acceptInvite('mbr-ana')
    expect(user).toMatchObject({ role: 'analista', email: 'ana.costa@compagueda.pt' })
    expect(organizationSlug).toBe('componentes-agueda')
    expect(getState().members.find((m) => m.id === 'mbr-ana')).toMatchObject({ status: 'ativo', userId: user.id })
    who = user.id
    expect(await api.assets.listTasks(ORG_ID)).toEqual([])
    await expect(api.organization.getInvite('mbr-ana')).rejects.toMatchObject({ status: 410 })
  })
})

describe('assigning work to analysts (US14)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })
  const evidence = { assigneeId: PEDRO, kind: 'evidencia' as const, title: 'Configuração do MFA nas contas de administrador', context: 'Evidência · Controlo de acessos', dueDate: null }

  it('creates a pending task for the analyst, with or without a deadline, and notifies them', async () => {
    const t = await api.organization.assignWork(ORG_ID, evidence)
    expect(t).toMatchObject({ kind: 'evidencia', status: 'pendente', dueDate: null, assigneeId: PEDRO, assignedBy: RUI })
    const withDue = await api.organization.assignWork(ORG_ID, { ...evidence, kind: 'ativos', title: 'Registar os ativos técnicos', context: 'Inventário de ativos', dueDate: '2026-10-20' })
    expect(withDue).toMatchObject({ kind: 'ativos', dueDate: '2026-10-20', expectedCount: 4 })
    who = PEDRO
    expect((await api.assets.listTasks(ORG_ID)).map((x) => x.id)).toEqual(expect.arrayContaining([t.id, withDue.id]))
    expect((await api.notifications.list())[0].title).toBe('Nova tarefa de Rui Santos')
  })

  it('refuses duplicates, past deadlines and people who are not active analysts', async () => {
    await api.organization.assignWork(ORG_ID, evidence)
    await expect(api.organization.assignWork(ORG_ID, evidence)).rejects.toMatchObject({ status: 409 })
    await expect(api.organization.assignWork(ORG_ID, { ...evidence, title: 'Outra', dueDate: '2026-01-01' })).rejects.toMatchObject({ status: 422 })
    await expect(api.organization.assignWork(ORG_ID, { ...evidence, assigneeId: RUI })).rejects.toMatchObject({ status: 422 })
  })
})
